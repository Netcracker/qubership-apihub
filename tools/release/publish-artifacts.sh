#!/usr/bin/env bash
# Usage: tools/release/publish-artifacts.sh check|images|npm|releases
#
# Publishes the artifacts in $PLAN (tools/release/artifacts.js), in the order of the release-artifacts job
# of ci.yml: check, images, npm, (charts, step 6), releases, so every link in the notes exists by the time
# a release appears. Every subcommand is idempotent: a rerun skips what already exists.
#
# With DRY_RUN=true nothing is written to a registry or to GitHub: each subcommand reads what exists and
# reports what it would do.
#
#   check     refuses a real run when the plan reports a problem or belongs to another commit
#   images    points <image>:<version> at the image this run published under the branch tag, after
#             checking that it carries this commit as its revision and both architectures; never moves an
#             existing version tag to other content
#   npm       builds the released public packages and runs `pnpm publish -r` for them; pnpm skips the
#             versions the registry already has
#   releases  creates the GitHub Releases in plan order, modules with --latest=false, the product Latest
#
# Environment: PLAN, DRY_RUN, REF (github.ref), SHA (github.sha), SOURCE_URL; GH_TOKEN and GH_REPO for
# `releases`; docker logged in to ghcr for `images`; ~/.npmrc auth for `npm`.
set -euo pipefail

cmd="${1:?usage: publish-artifacts.sh check|images|npm|releases}"
plan="${PLAN:?PLAN is the plan.json of tools/release/artifacts.js}"
dry="${DRY_RUN:-true}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
# What stops a real run is only reported by a dry run.
level=error
if [ "$dry" = 'true' ]; then level=warning; fi
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prints one tab-separated line per entry of a plan list: field values in the given order.
rows() {
  node -e '
    const plan = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
    for (const row of plan[process.argv[2]]) console.log(process.argv.slice(3).map((k) => row[k]).join("\t"))
  ' "$plan" "$@"
}

# Reads an image index from stdin and prints "<revision> <architectures>".
# shellcheck disable=SC2016 # JavaScript template literals, not shell expansions
describe_index() {
  node -e '
    const m = JSON.parse(require("fs").readFileSync(0, "utf8"))
    const a = m.annotations || {}
    const archs = (m.manifests || []).map((x) => x.platform && x.platform.architecture).filter(Boolean)
    console.log(`${a["org.opencontainers.image.revision"] || "-"} ${[...new Set(archs)].sort().join(",") || "-"}`)
  '
}

field() {
  node -e '
    const value = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))[process.argv[2]]
    console.log(Array.isArray(value) ? value.join("\n") : value)
  ' "$plan" "$1"
}

check() {
  local problems commit
  problems="$(field problems)"
  commit="$(field commit)"
  if [ -n "$problems" ]; then
    while read -r p; do echo "::${level}::$p"; done <<< "$problems"
    [ "$dry" = 'true' ] || exit 1
  fi
  if [ "$commit" != "${SHA:?}" ]; then
    echo "plan commit ${commit:0:9} is not this run's commit ${SHA:0:9}"
    [ "$dry" = 'true' ] || { echo "::error::A real run publishes only the artifacts of its own commit."; exit 1; }
  fi
  echo "plan ok for ${commit:0:9}"
}

images() {
  local branch_tag image version src target raw got revision archs
  branch_tag="$(bash "$here/../ci/branch-tag.sh" "${REF:?}")"
  echo "### Image version tags" >> "$summary"
  while IFS=$'\t' read -r image version; do
    [ -n "$image" ] || continue
    src="$image:$branch_tag"
    target="$image:$version"
    if ! raw="$(docker buildx imagetools inspect --raw "$src" 2> /dev/null)"; then
      echo "::${level}::$src does not exist; the image job of this run did not publish it."
      if [ "$dry" = 'true' ]; then continue; fi
      exit 1
    fi
    read -r revision archs <<< "$(describe_index <<< "$raw")"
    if [ "$revision" != "$SHA" ] || [ "$archs" != 'amd64,arm64' ]; then
      echo "::${level}::$src is revision $revision for $archs, not this run's ${SHA:0:9} for amd64,arm64."
      if [ "$dry" = 'true' ]; then continue; fi
      exit 1
    fi
    if got="$(docker buildx imagetools inspect --raw "$target" 2> /dev/null)"; then
      read -r revision archs <<< "$(describe_index <<< "$got")"
      if [ "$revision" = "$SHA" ]; then
        echo "- \`$target\` exists for this commit; unchanged" | tee -a "$summary"
        continue
      fi
      echo "::error::$target already exists for revision $revision; a version tag is never moved."
      exit 1
    fi
    if [ "$dry" = 'true' ]; then
      echo "- would point \`$target\` at \`$src\`" | tee -a "$summary"
      continue
    fi
    docker buildx imagetools create \
      --annotation "index:org.opencontainers.image.revision=$SHA" \
      --annotation "index:org.opencontainers.image.version=$version" \
      --annotation "index:org.opencontainers.image.source=${SOURCE_URL:?}" \
      -t "$target" "$src"
    echo "- \`$target\` → \`$src\`" | tee -a "$summary"
  done < <(rows images image version)
}

npm_publish() {
  local roots=() projects=() root project
  while IFS=$'\t' read -r project root; do
    [ -n "$project" ] || continue
    projects+=("$project")
    roots+=(--filter "./$root")
  done < <(rows npm project root)
  echo "### npm packages" >> "$summary"
  if [ "${#projects[@]}" -eq 0 ]; then
    echo "no npm package in this release" | tee -a "$summary"
    return
  fi
  # Nothing else builds them in this job: publishing without a build would ship packages without dist.
  pnpm exec nx run-many -t build --projects="$(IFS=,; echo "${projects[*]}")"
  local args=(publish -r --no-git-checks --access restricted "${roots[@]}")
  [ "$dry" = 'true' ] && args+=(--dry-run)
  pnpm "${args[@]}" 2>&1 | tee "${RUNNER_TEMP:-/tmp}/publish.log"
  if grep -qE '^\+ @' "${RUNNER_TEMP:-/tmp}/publish.log"; then
    # shellcheck disable=SC2016 # literal backticks for Markdown
    grep -oE '^\+ @[^ ]+' "${RUNNER_TEMP:-/tmp}/publish.log" | sed 's/^+ /- `/; s/$/`/' >> "$summary"
  else
    echo "nothing published: every version is already in the registry" | tee -a "$summary"
  fi
}

releases() {
  local tag title latest notes
  echo "### GitHub Releases" >> "$summary"
  while IFS=$'\t' read -r tag title latest notes; do
    [ -n "$tag" ] || continue
    if gh release view "$tag" > /dev/null 2>&1; then
      echo "- $title: exists; unchanged" | tee -a "$summary"
      continue
    fi
    if [ "$dry" = 'true' ]; then
      {
        echo "<details><summary>would create $title (latest: $latest)</summary>"
        echo ""
        cat "$notes"
        echo "</details>"
      } >> "$summary"
      echo "would create $title (latest: $latest)"
      continue
    fi
    gh release create "$tag" --verify-tag --title "$title" --notes-file "$notes" --latest="$latest"
    echo "- $title (latest: $latest)" | tee -a "$summary"
  done < <(rows releases tag title latest notesFile)
}

case "$cmd" in
  check) check ;;
  images) images ;;
  npm) npm_publish ;;
  releases) releases ;;
  *) echo "unknown subcommand: $cmd" >&2; exit 2 ;;
esac
