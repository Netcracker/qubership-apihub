#!/usr/bin/env bash
#
# The INPUT identity of a Storybook build: the in-<hash> the store indexes builds by.
#
# Same shape as tools/ci/image-input-hash.sh, with one difference that is the reason this file
# exists. The image hasher hashes every project in the dependency closure by its whole git tree.
# For a Storybook that is too coarse in a way that was measured: retitling a story in graphapi
# rebuilt apispec-view, api-doc-viewer and ui, which depend on graphapi, although stories are not
# part of graphapi's library build and nothing in their output came from the change.
#
# So a component's OWN projects are hashed by their whole tree, and every other project in the
# closure, its DEPENDENCIES, is hashed without the files a dependent's Storybook never reads:
#
#   *.stories.*, *.stories.mdx   a dependency's own stories
#   *.test.*, *.spec.*           its unit tests
#   __image_snapshots__/         its screenshot baselines
#   .storybook/                  its Storybook configuration
#
# Checked against the workspace before this was written, 2026-09-14: no Storybook config, story
# generator or source import reads one of those files from another project. The generators read
# compatibility-suites through its built package and DDL samples from packages/samples, a project
# in the closure whose files match none of the patterns. apispec-view's shared root .storybook is
# passed explicitly as an extra path, so it is hashed whatever the patterns say.
#
# Why a separate script rather than an option on the image hasher: that script hashes itself into
# every image's identity, so any edit to it rebuilds all seven images once, for a change that is
# only about Storybooks.
#
# Usage:  storybook-input-hash.sh "<own nx project[,...]>" <graph.json> [extra path...]
#         REF=<commit> to hash a commit other than HEAD
set -euo pipefail

own="${1:?usage: storybook-input-hash.sh \"<own nx project[,...]>\" <graph.json> [extra path...]}"
graph="${2:?missing graph.json — produce it with: nx graph --file=graph.json}"
shift 2
ref="${REF:-HEAD}"

# `own <root>` or `dep <root>` for every project in the union of the closures, own winning.
# path.resolve before require, for the reason recorded in image-input-hash.sh: a bare relative name
# is a module specifier to Node, not a path.
roles="$(node -e '
  const path = require("path")
  const g = require(path.resolve(process.argv[1])).graph
  const names = process.argv[2].split(/[\s,]+/).filter(Boolean)
  const seen = new Set()
  const visit = (n) => {
    if (seen.has(n)) return
    seen.add(n)
    for (const d of g.dependencies[n] || []) visit(d.target)
  }
  for (const p of names) {
    if (!g.nodes[p]) {
      console.error(`unknown project: ${p}`)
      process.exit(1)
    }
    visit(p)
  }
  const rootOf = (n) => g.nodes[n] && g.nodes[n].data && g.nodes[n].data.root
  const ownRoots = new Set(names.map(rootOf))
  const lines = new Set()
  for (const n of seen) {
    const r = rootOf(n)
    if (r) lines.add(`${ownRoots.has(r) ? "own" : "dep"} ${r}`)
  }
  console.log([...lines].sort().join("\n"))
' "$graph" "$own")"

# A path a dependent Storybook never reads. Matched against the path inside the repository.
NOT_READ='(^|/)(__image_snapshots__|\.storybook)(/|$)|\.(stories|test|spec)\.[cm]?[jt]sx?$|\.stories\.mdx$'

# The git object at <ref>:<path>, or a loud failure. NOT a bare `git rev-parse <ref>:<path>`: for a
# path that does not exist that prints its own argument to stdout before failing, so the argument,
# commit id and all, became part of the hash and every commit hashed differently. Measured, when a
# test at a commit without this script moved every component's hash for every change.
object_id() {
  git rev-parse --verify -q "$ref:$1" || { echo "storybook-input-hash: $ref:$1 does not exist" >&2; return 1; }
}

# Every line is collected BEFORE anything is hashed. Piped straight into `sort | sha256sum`, an
# `exit 1` for a missing path ended only the pipeline's subshell, and the script printed a hash of
# the lines produced so far before exiting non-zero: a wrong identity for any caller that reads the
# output and not the status.
lines="$({
  while read -r role dir; do
    [ -n "$dir" ] || continue
    if [ "$role" = own ]; then
      id="$(object_id "$dir")" || exit 1
      printf 'own %s %s\n' "$dir" "$id"
    else
      # Blob ids and paths of everything else under the project. A blob id changes exactly when
      # the file's content does, so this moves if and only if a kept file changes, appears or goes.
      # The pattern goes in through the environment, NOT `awk -v`. awk processes backslash escapes
      # in a -v assignment, so `\.` arrived as `.`, matching any character: `xstorybook` and
      # `atestxts` were excluded too, with a warning on stderr for every dependency. Measured.
      printf 'dep %s %s\n' "$dir" "$(git -c core.quotepath=off ls-tree -r "$ref" -- "$dir/" \
        | NOT_READ="$NOT_READ" awk -F'\t' 'BEGIN { re = ENVIRON["NOT_READ"] } $2 !~ re' | sha256sum | cut -c1-64)"
    fi
  done <<< "$roles"

  # The workspace-level files that change what is built, as in image-input-hash.sh, which records
  # why each one is there and why .npmrc is not.
  for f in pnpm-lock.yaml nx.json pnpm-workspace.yaml "$@"; do
    id="$(object_id "$f")" || exit 1
    printf '%s %s\n' "$f" "$id"
  done

  # This script's own identity: as committed at the ref, which is always the case in CI. Hashing
  # the file on disk instead is only for trying an uncommitted copy of it against older commits.
  self="$(git rev-parse --verify -q "$ref:tools/ci/storybook-input-hash.sh" || git hash-object "${BASH_SOURCE[0]}")"
  printf 'hasher %s\n' "$self"
})" || exit 1

printf '%s\n' "$lines" | sort | sha256sum | cut -c1-16
