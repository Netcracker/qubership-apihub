#!/usr/bin/env bash
#
# One component's Storybook into the store, for the branch this run is on.
#
# THE STORE is ghcr, `ghcr.io/<owner>/storybook-<component>`, and nothing is committed to any
# branch. Three kinds of tag, each on its OWN manifest:
#
#   out-<hash>     the build: one gzipped tarball of `dist-showcase`, keyed by its OUTPUT, a hash
#                  of its files (storybook-site.js outhash). Two builds with identical files are
#                  stored once, whatever their inputs were
#   in-<hash>      an index keyed by the build's INPUTS, naming the out- content they produced.
#                  It is what lets an unchanged component skip the build entirely
#   branch-<slug>  the pointer pages.yml assembles the site from, naming the out- content
#
# WHY OUTPUT AND NOT ONLY INPUT. The input hash cannot see what a build will emit. Measured
# 2026-09-14: retitling one graphapi story rebuilt api-doc-viewer and ui, which depend on graphapi,
# and both came out as the SAME files apart from a build timestamp. Keyed by input, that branch
# published 71.7 MiB; keyed by output, 28.3 MiB. And a build is not always reproducible: apispec-view
# once documented one component's props in a different order from identical source.
#
# THE INPUT HASH is tools/ci/storybook-input-hash.sh. It started as the images' hasher, which hashes
# every dependency's whole tree, so that same story change rebuilt all three for nothing. The
# Storybook hasher hashes a component's own projects in full and its dependencies without their
# stories, tests, screenshot baselines and .storybook config, which no dependent Storybook reads.
#
# Two inputs needed adding to the hash for Storybook specifically, both carried in storybooks.json:
#
#   ui            the config lives in ui-shared but loads stories from ui-portal and ui-agents
#                 and aliases both packages, so all three trees decide the build
#   apispec-view  packages/elements/.storybook only re-exports the WORKSPACE root's
#                 .storybook, and the Storybook dependencies are declared in the workspace
#                 root package.json. Neither sits inside the elements project
#
# This script and the sourcemap stripper are hash inputs too, and the hasher hashes itself: they
# decide what is built and stored, so a change to any of them must not be served from content
# produced under the old rules.
#
# POINTERS AND INDEXES ARE NEVER TAGS ON THE CONTENT MANIFEST. Deleting a package version in ghcr
# removes every tag on it, which storybook-probe.yml measured. An alias tag for feature-x would
# mean deleting feature-x deletes the Storybook of every branch sharing its content.
#
# Environment: COMPONENT PROJECT HASH_PROJECTS HASH_PATHS OUTPUT OWNER, plus the GITHUB_* the
# runner provides. Expects `oras` logged in to ghcr.
set -Eeuo pipefail
# `-e` exits without a word, and an `oras` whose stderr is sent to /dev/null leaves the log with
# nothing but "Process completed with exit code 1". That happened: every Storybook job on the first
# push of this layout died 1.8s in, silently. Name the line and command instead. `-E` makes the trap
# fire inside functions and command substitutions too.
trap 'echo "::error::storybook-store.sh failed at line $LINENO: $BASH_COMMAND"' ERR

: "${COMPONENT:?}" "${PROJECT:?}" "${HASH_PROJECTS:?}" "${OUTPUT:?}" "${OWNER:?}"
summary="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
tmp="${RUNNER_TEMP:-$(mktemp -d)}"

owner_lc="$(echo "$OWNER" | tr '[:upper:]' '[:lower:]')"
repo="ghcr.io/$owner_lc/storybook-$COMPONENT"
slug="$(node tools/ci/storybook-site.js slug "$GITHUB_REF_NAME")"
source_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY"

pnpm exec nx graph --file=graph.json >/dev/null
# HASH_PATHS is a space-separated list and deliberately unquoted, so it word-splits.
# shellcheck disable=SC2086
input="in-$(bash tools/ci/storybook-input-hash.sh "$HASH_PROJECTS" graph.json tools/ci/storybook-store.sh tools/ci/storybook-strip-maps.js $HASH_PATHS)"
rm -f graph.json

# A tag that does not exist is an ANSWER here, "nothing", not a failure: every new input has no
# index yet. Under `-e -o pipefail` a failing `oras` made the whole `content="$(content_of …)"`
# assignment fail and ended the script, which is exactly the first-push failure above. So the
# lookup cannot fail; an unreadable manifest also reads as nothing, which costs a build, the safe
# direction. `exists` is only ever used as a condition, where a non-zero status is allowed.
content_of() { # tag -> the content its manifest names, or nothing
  { oras manifest fetch "$repo:$1" 2>/dev/null || true; } | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try { process.stdout.write((JSON.parse(s).annotations || {})["org.netcracker.apihub.storybook.content"] || "") } catch {}
    })'
}
exists() { oras manifest fetch "$repo:$1" >/dev/null 2>&1; }

{
  echo "### storybook: $COMPONENT"
  echo
  echo "| | |"
  echo "|---|---|"
  echo "| inputs | \`$repo:$input\` |"
} >> "$summary"

# ---- the content: build only when these inputs are new ----------------------------------------
# A failed lookup reads as a miss, which costs a build and never serves stale content. That is
# the safe direction for this check to be wrong in. The index is only trusted if the content it
# names still exists: cleanup removes content no branch points at.
content="$(content_of "$input")"
if [ -n "$content" ] && exists "$content"; then
  echo "| build | **hit**: these inputs built \`$content\`, which is in the store |" >> "$summary"
else
  # Remove any earlier output first. The checks below look for files, and a directory left
  # behind by some other step would satisfy them without this build having produced anything.
  rm -rf "$OUTPUT"

  # run-many rather than `nx run $PROJECT:build:showcase`, which Nx could read as target
  # `build` with configuration `showcase`.
  set -o pipefail
  pnpm exec nx run-many -t build:showcase --projects="$PROJECT" 2>&1 | tee "$tmp/nx.log"

  # Validate the artifact, not the exit code. These three are what Storybook's manager loads
  # first: without index.json it renders an empty sidebar and reports nothing.
  for f in index.html iframe.html index.json; do
    [ -s "$OUTPUT/$f" ] || { echo "::error::$OUTPUT/$f is missing or empty after build:showcase"; exit 1; }
  done

  # Sourcemaps are 22 of apispec-view's 43 MiB and 19 of rest-playground's 34, and every
  # published build counts against Pages' 1 GB. The script says what it measured and why.
  stripped="$(node tools/ci/storybook-strip-maps.js "$OUTPUT")"
  files="$(find "$OUTPUT" -type f | wc -l)"
  bytes="$(du -sb "$OUTPUT" | cut -f1)"

  content="out-$(node tools/ci/storybook-site.js outhash "$OUTPUT")"
  if exists "$content"; then
    echo "| build | **built**, and the output is identical to \`$content\`, already in the store: not stored again. $stripped; $files files, $((bytes / 1024)) KiB |" >> "$summary"
  else
    tar czf "$tmp/storybook.tar.gz" -C "$OUTPUT" .
    packed="$(stat -c %s "$tmp/storybook.tar.gz")"
    # Pushed from inside $tmp: oras refuses absolute file paths, and the name it records is the
    # name pages.yml pulls back out.
    (
      cd "$tmp"
      oras push "$repo:$content" \
        --artifact-type application/vnd.alagishev.storybook.v1 \
        --annotation "org.opencontainers.image.source=$source_url" \
        --annotation "org.opencontainers.image.revision=$GITHUB_SHA" \
        --annotation "org.netcracker.apihub.storybook.component=$COMPONENT" \
        --annotation "org.netcracker.apihub.storybook.input=$input" \
        storybook.tar.gz:application/vnd.alagishev.storybook.layer.v1.tar+gzip
    )
    echo "| build | **built and stored** as \`$content\`: $stripped; $files files, $((bytes / 1024)) KiB, packed to $((packed / 1024)) KiB |" >> "$summary"
  fi

  # The index, so the next push with these inputs skips the build.
  echo "$content" > "$tmp/index.txt"
  (
    cd "$tmp"
    oras push "$repo:$input" \
      --artifact-type application/vnd.alagishev.storybook-index.v1 \
      --annotation "org.netcracker.apihub.storybook.content=$content" \
      --annotation "org.opencontainers.image.source=$source_url" \
      index.txt
  )
fi

# ---- the pointer: on both paths --------------------------------------------------------------
# A new branch changes no content and still needs its pointer, and so does a branch whose
# previous run was cancelled between two pushes.
echo "$content" > "$tmp/pointer.txt"
(
  cd "$tmp"
  oras push "$repo:branch-$slug" \
    --artifact-type application/vnd.alagishev.storybook-pointer.v1 \
    --annotation "org.netcracker.apihub.storybook.content=$content" \
    --annotation "org.netcracker.apihub.storybook.input=$input" \
    --annotation "org.opencontainers.image.source=$source_url" \
    --annotation "org.opencontainers.image.revision=$GITHUB_SHA" \
    --annotation "org.opencontainers.image.version=$GITHUB_REF_NAME" \
    pointer.txt
)

# Read the pointer back off the registry. A push exiting 0 says a manifest was written, not
# that it says what the assembler will read; a misspelled annotation key is not an error.
got="$(content_of "branch-$slug")"
if [ "$got" != "$content" ]; then
  echo "::error::pointer branch-$slug reads content='$got', expected '$content'"
  exit 1
fi
echo "| pointer | written and read back: \`branch-$slug\` → \`$got\` |" >> "$summary"
