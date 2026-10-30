#!/usr/bin/env bash
#
# Content-addressed identity for a Docker image, per monorepo-design.md §6.
#
# Prints a stable hash of everything that can change the image: the project's own tree, the
# trees of every project it transitively depends on, the lockfile, and the Dockerfile. The
# image is then tagged `<name>:src-<hash>`, and a build is skipped entirely when that tag
# already exists in the registry — the branch tag is published as an alias with
# `docker buildx imagetools create`, a manifest operation taking about a second and
# transferring no layers.
#
# That is what gives **affected-only cost with always-build semantics**: the property being
# protected is that an E2E stack is never assembled from images built at different commits,
# which is the cross-repo version skew the monorepo exists to remove.
#
# Why git tree hashes rather than Nx's own project hash: Nx does not expose a project hash
# through a supported command — it is an internal of the task hasher, visible only in run
# output and in .nx/cache directory names. Deriving the identity from `git rev-parse
# <ref>:<dir>` is deterministic, needs no Nx invocation, is trivially reproducible by hand
# when an image needs explaining, and cannot drift when Nx changes its hashing. The cost is
# that it is coarser than Nx's: it hashes the whole project tree rather than the
# `production` named input, so a change to a test file rebuilds the image. That is the safe
# direction to err in.
#
# An image may be built from MORE THAN ONE project, so this takes a list. The `ui` image is
# exactly that case: one nginx tree serving both `ui-portal` and `ui-agents`, which are
# siblings — neither depends on the other. Hashing only `ui-portal` would mean a change to
# `ui-agents` alone left the hash unmoved, the registry reported a hit, and the run happily
# retagged an image that does not contain the change. Silent, and exactly the class of
# staleness the content-addressed tag exists to prevent.
#
# Usage:  image-input-hash.sh "<nx-project> [nx-project...]" <graph.json> [dockerfile...]
set -euo pipefail

projects="${1:?usage: image-input-hash.sh \"<nx-project...>\" <graph.json> [dockerfile...]}"
graph="${2:?missing graph.json — produce it with: nx graph --file=graph.json}"
shift 2

# Union of the transitive dependency closures of every project the image is built from.
#
# path.resolve before require: Node treats a BARE relative name as a module specifier, not a
# path, so `require("graph.json")` throws MODULE_NOT_FOUND while `require("./graph.json")`
# and an absolute path both work. The local test of this script passed an absolute path and
# the workflow passes a bare `graph.json`, so the difference was invisible until CI ran it.
closure="$(node -e '
  const path = require("path")
  const g = require(path.resolve(process.argv[1])).graph
  const seen = new Set()
  const visit = (n) => {
    if (seen.has(n)) return
    seen.add(n)
    for (const d of g.dependencies[n] || []) visit(d.target)
  }
  // Split on commas OR whitespace. The workflow passes the same list to `nx run-many
  // --projects`, which requires COMMAS, and this script originally required whitespace — so
  // fixing the separator for one broke the other, and "Compute tags" started failing with
  // `unknown project: ui-portal,ui-agents`. Accepting both makes the two callers
  // independent, which is the actual defect: one string with two incompatible readers.
  for (const p of process.argv[2].split(/[\s,]+/).filter(Boolean)) {
    if (!g.nodes[p]) {
      console.error(`unknown project: ${p}`)
      process.exit(1)
    }
    visit(p)
  }
  const roots = [...seen]
    .map((n) => g.nodes[n] && g.nodes[n].data && g.nodes[n].data.root)
    .filter(Boolean)
    .sort()
  console.log(roots.join("\n"))
' "$graph" "$projects")"

{
  # Each project directory contributes its git tree hash. `git rev-parse HEAD:<dir>` is the
  # tree object, which changes if and only if any tracked file under it changes.
  while read -r dir; do
    [ -n "$dir" ] || continue
    printf '%s %s\n' "$dir" "$(git rev-parse "HEAD:$dir")"
  done <<< "$closure"

  # The lockfile: a resolution change alters what is installed into the image.
  printf 'pnpm-lock.yaml %s\n' "$(git rev-parse HEAD:pnpm-lock.yaml)"

  # The other two workspace-level files that change image CONTENT.
  #
  # nx.json decides how `dist` is produced. `targetDefaults.build.inputs` and the `production`
  # named input select which files a build sees; `outputs` selects what it keeps. Change either
  # and the same source yields a different `dist`, which is what the image COPYs.
  #
  # pnpm-workspace.yaml decides what is installed. `nodeLinker` changes the shape of
  # node_modules, which `pnpm deploy --prod` copies wholesale into build-task-consumer, and
  # `overrides` changes which versions resolve at all. The lockfile records the RESULT of those
  # settings, so a lockfile change usually accompanies them -- but "usually" is not a guarantee
  # to build an identity on, and `forceLegacyDeploy` changes the deploy tree with no lockfile
  # movement whatsoever.
  #
  # Neither touches a project tree, so before these lines the hash did not move, the registry
  # reported a hit, and CI retagged an image built under the previous rules. This is the
  # `.dockerignore` hole below a second and third time; read all three together.
  #
  # Nx already keeps this list. `namedInputs.sharedGlobals` names pnpm-lock.yaml,
  # pnpm-workspace.yaml, .npmrc and nx.json as the files that invalidate every task, and three
  # of those four are now hashed here.
  #
  # `.npmrc` is deliberately NOT hashed, and the reason is a property of the lockfile rather
  # than laziness. It is narrowed to auth and registry. Auth cannot change content. A registry
  # change cannot silently change content either, because the lockfile pins integrity hashes --
  # different bytes for the same version fail the install rather than producing a different
  # image. Hashing it would rebuild every image on a token rotation for no content reason.
  #
  # The cost of adding a line here is one full rebuild of every image, once, because every
  # existing src-<hash> stops matching. That is the correct price for the guarantee.
  printf 'nx.json %s\n' "$(git rev-parse HEAD:nx.json)"
  printf 'pnpm-workspace.yaml %s\n' "$(git rev-parse HEAD:pnpm-workspace.yaml)"

  # The files named on the command line, and this script itself — all of them change the
  # image without touching any project tree.
  #
  # `.dockerignore` belongs in that list and was missing from it, which is a hole in exactly
  # the guarantee this hash exists to provide. It decides what reaches the build context, so
  # it changes image CONTENT — and it was not hashed, so the registry would report a hit and
  # retag an image built under the previous rules. Found while shipping a `.dockerignore`
  # change that removes a file from the image: without this, that change could not have taken
  # effect until some unrelated edit happened to move the hash.
  #
  # The `image_inputs` rule in ci.yml does force the image JOBS to run on a `.dockerignore`
  # change, but forcing the job and invalidating the content are different things: the job
  # ran, the content check hit, and the build was skipped. Selecting a job on the right inputs
  # does not help if the identity is computed from the wrong ones.
  for f in "$@"; do
    printf '%s %s\n' "$f" "$(git rev-parse "HEAD:$f")"
  done
  printf 'hasher %s\n' "$(git rev-parse HEAD:tools/ci/image-input-hash.sh)"
} | sort | sha256sum | cut -c1-16
