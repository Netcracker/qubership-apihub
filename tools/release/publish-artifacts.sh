#!/usr/bin/env bash
# Usage: tools/release/publish-artifacts.sh check|build|charts-check|images|npm|charts|releases
#
# Publishes the artifacts in $PLAN (tools/release/artifacts.js), in the order of release-artifacts.yml:
# check, build, charts-check, images, npm, charts, releases, so every link in the notes exists by the time
# a release appears. Every subcommand is idempotent: a rerun skips what this release already published.
#
# With DRY_RUN=true nothing is written to a registry or to GitHub: each subcommand reads what exists and
# reports what it would do.
#
#   check     refuses a real run when the plan reports a problem or belongs to another commit
#   build     builds the released public npm packages; runs before any registry login, because it runs
#             repository code
#   images    points <image>:<version> at the image this run published under the branch tag, after
#             checking that it carries this commit as its revision and both architectures; never moves an
#             existing version tag to other content
#   npm       refuses a real run when a planned version is already in the registry from before this
#             release (published after the release commit means an earlier attempt of this run: skipped),
#             then runs `pnpm publish -r --ignore-scripts` for the built packages
#   charts-check
#             stages and packages the planned Helm charts with their image versions pinned (charts.js)
#             and refuses a real run unless every pinned image exists or is one this release tags, the
#             staged charts pass tools/ci/chart-check.sh, no chart version exists for another commit, and
#             every chart the notes name without this release pushing it (chartLinks) is in the registry;
#             runs before the images step, so such a release publishes nothing
#   charts    the same checks again, with every pinned image required, then pushes the charts to
#             oci://ghcr.io/<owner>/charts; a chart version already pushed from this commit (an earlier
#             attempt) is pulled instead
#   releases  creates the GitHub Releases in plan order, modules with --latest=false, the product Latest,
#             each with its packaged chart attached
#
# Environment: PLAN, DRY_RUN, REF (github.ref), SHA (github.sha), SOURCE_URL; GH_TOKEN and GH_REPO for
# `releases`; docker logged in to ghcr for `images` and `charts`; helm logged in to ghcr for `charts`;
# ~/.npmrc auth for `npm`.
set -euo pipefail

cmd="${1:?usage: publish-artifacts.sh check|build|charts-check|images|npm|charts|releases}"
plan="${PLAN:?PLAN is the plan.json of tools/release/artifacts.js}"
dry="${DRY_RUN:-true}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
# What stops a real run is only reported by a dry run.
level=error
if [ "$dry" = 'true' ]; then level=warning; fi
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Where `charts` stages and packages; `releases` attaches the packages from here.
charts_dir="$(dirname "$plan")/charts"

# Prints one tab-separated line per entry of a plan list: field values in the given order. A key can be
# a dotted path (chart.name). A missing value prints as an empty field, so ask for those last: read
# merges adjacent tabs.
rows() {
  node -e '
    const plan = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
    const get = (row, key) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), row) ?? ""
    for (const row of plan[process.argv[2]] ?? []) console.log(process.argv.slice(3).map((k) => get(row, k)).join("\t"))
  ' "$plan" "$@"
}

# Prints "<chart> <image> <version>", tab-separated, for every pinned image of the planned charts.
pinned_images() {
  node -e '
    const plan = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
    for (const c of plan.charts ?? []) for (const p of c.pins) if (p.image) console.log([c.name, p.image, p.version].join("\t"))
  ' "$plan"
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

build() {
  local projects
  projects="$(rows npm project | paste -sd, -)"
  if [ -z "$projects" ]; then
    echo "no npm package in this release"
    return
  fi
  # Nothing else builds them in this job: publishing without a build would ship packages without dist.
  pnpm exec nx run-many -t build --projects="$projects"
}

# Prints new, ours (published at or after the release commit: an earlier attempt of this release), or
# taken (published before it, so the registry holds other content under this version) for one package.
# shellcheck disable=SC2016 # JavaScript, not shell expansions
registry_state() {
  local name="$1" version="$2" since="$3" out err
  err="$(mktemp)"
  if ! out="$(npm view "$name" time --json 2> "$err")"; then
    if grep -q E404 "$err" || grep -q E404 <<< "$out"; then
      echo new
    else
      echo "::${level}::npm view $name failed: $(tr '\n' ' ' < "$err")" >&2
      echo unknown
    fi
    rm -f "$err"
    return
  fi
  rm -f "$err"
  node -e '
    const times = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}")
    const at = times[process.argv[1]]
    console.log(!at ? "new" : Date.parse(at) / 1000 >= Number(process.argv[2]) ? "ours" : "taken")
  ' "$version" "$since" <<< "$out"
}

npm_publish() {
  local roots=() root name version since state blocked=0
  since="$(git log -1 --format=%ct "$(field commit)")"
  echo "### npm packages" >> "$summary"
  while IFS=$'\t' read -r name version root; do
    [ -n "$name" ] || continue
    state="$(registry_state "$name" "$version" "$since")"
    case "$state" in
      taken)
        echo "::${level}::$name@$version is already in the registry from before this release; bump it and release again."
        blocked=1 ;;
      unknown) blocked=1 ;;
      ours) echo "- \`$name@$version\` published by an earlier attempt; unchanged" | tee -a "$summary" ;;
    esac
    roots+=(--filter "./$root")
  done < <(rows npm name version root)
  if [ "$blocked" -eq 1 ] && [ "$dry" != 'true' ]; then exit 1; fi
  if [ "${#roots[@]}" -eq 0 ]; then
    echo "no npm package in this release" | tee -a "$summary"
    return
  fi
  # Built by the build subcommand; --ignore-scripts keeps repository code away from the registry token.
  local args=(publish -r --no-git-checks --ignore-scripts --access restricted "${roots[@]}")
  [ "$dry" = 'true' ] && args+=(--dry-run)
  pnpm "${args[@]}" 2>&1 | tee "${RUNNER_TEMP:-/tmp}/publish.log"
  if grep -qE '^\+ @' "${RUNNER_TEMP:-/tmp}/publish.log"; then
    # shellcheck disable=SC2016 # literal backticks for Markdown
    grep -oE '^\+ @[^ ]+' "${RUNNER_TEMP:-/tmp}/publish.log" | sed 's/^+ /- `/; s/$/`/' >> "$summary"
  else
    echo "nothing published: every version is already in the registry" | tee -a "$summary"
  fi
}

# Prints the revision annotation of a chart version in the registry ("-" without one), "new" when the
# version is not there, or "unknown" when the registry cannot be read. ghcr answers a package that does
# not exist yet with "denied" for some tokens; that counts as new too: a push with the same token fails
# loudly if it lacks access.
chart_revision() {
  local ref="$1" version="$2" out err
  err="$(mktemp)"
  if out="$(helm show chart "$ref" --version "$version" 2> "$err")"; then
    rm -f "$err"
    out="$(sed -n "s/^ *org\.opencontainers\.image\.revision: *[\"']\{0,1\}\([0-9a-f]*\)[\"']\{0,1\} *$/\1/p" <<< "$out")"
    echo "${out:--}"
    return
  fi
  if grep -qiE 'not found|manifest unknown|name unknown|denied' "$err"; then
    echo new
  else
    echo "::${level}::helm show chart $ref --version $version failed: $(tr '\n' ' ' < "$err")" >&2
    echo unknown
  fi
  rm -f "$err"
}

has_charts() {
  [ -n "$(rows charts name)" ] || [ -n "$(rows chartLinks name)" ]
}

# Stages and packages the planned charts and runs every check that needs no write: the pinned images
# exist, the staged charts pass chart-check.sh, no chart version is taken by another commit, and every
# chart the notes name exists. Writes "<name> <version> <ref> <state>" per chart to $charts_dir/states
# and sets charts_blocked=1 when something stops a real run. `$1` is `preflight` before the images step,
# when the version tags of this release do not exist yet, or `publish` after it.
charts_blocked=0
prepare_charts() {
  local when="$1" chart image pinned planned release name version ref state
  rm -rf "$charts_dir"
  mkdir -p "$charts_dir/staged" "$charts_dir/packages"
  node "$here/charts.js" --plan "$plan" --out "$charts_dir/staged"

  planned="$(rows images image version)"
  while IFS=$'\t' read -r chart image pinned; do
    [ -n "$chart" ] || continue
    if docker buildx imagetools inspect --raw "$image:$pinned" > /dev/null 2>&1; then continue; fi
    if { [ "$when" = preflight ] || [ "$dry" = 'true' ]; } && grep -qFx "$image"$'\t'"$pinned" <<< "$planned"; then
      echo "- \`$image:$pinned\` of $chart: the images step creates it" | tee -a "$summary"
      continue
    fi
    echo "::${level}::$chart pins $image:$pinned, which is not in the registry."
    charts_blocked=1
  done < <(pinned_images)

  # The commit of the plan: a dry run with --nearest previews an older release commit than this run's.
  release="$(field commit)"
  : > "$charts_dir/states"
  while IFS=$'\t' read -r name version ref; do
    [ -n "$name" ] || continue
    bash "$here/../ci/chart-check.sh" "$charts_dir/staged/$name"
    helm package "$charts_dir/staged/$name" --destination "$charts_dir/packages"
    state="$(chart_revision "$ref" "$version")"
    case "$state" in
      new | "$release") ;;
      unknown) charts_blocked=1 ;;
      *)
        echo "::${level}::$ref:$version already exists for revision $state; a chart version is never replaced."
        charts_blocked=1 ;;
    esac
    printf '%s\t%s\t%s\t%s\n' "$name" "$version" "$ref" "$state" >> "$charts_dir/states"
  done < <(rows charts name version ref)

  while IFS=$'\t' read -r name version ref; do
    [ -n "$name" ] || continue
    state="$(chart_revision "$ref" "$version")"
    case "$state" in
      new)
        echo "::${level}::The notes name $ref:$version, which is not in the registry; release $name with it."
        charts_blocked=1 ;;
      unknown) charts_blocked=1 ;;
      *) echo "- \`$ref:$version\`, named by the notes, exists" | tee -a "$summary" ;;
    esac
  done < <(rows chartLinks name version ref)
}

# Before the images step: a chart that cannot be published stops the run before anything is.
charts_check() {
  echo "### Helm charts: checks" >> "$summary"
  if ! has_charts; then
    echo "no Helm chart in this release" | tee -a "$summary"
    return
  fi
  prepare_charts preflight
  if [ "$charts_blocked" -eq 1 ] && [ "$dry" != 'true' ]; then exit 1; fi
  echo "charts ok" | tee -a "$summary"
}

charts() {
  local name version ref state release
  echo "### Helm charts" >> "$summary"
  if ! has_charts; then
    echo "no Helm chart in this release" | tee -a "$summary"
    return
  fi
  # Again, now that the images step has run, and with nothing pushed before every check has passed.
  prepare_charts publish
  if [ "$charts_blocked" -eq 1 ] && [ "$dry" != 'true' ]; then exit 1; fi
  release="$(field commit)"
  while IFS=$'\t' read -r name version ref state; do
    case "$state" in
      new)
        if [ "$dry" = 'true' ]; then
          echo "- would push \`$ref:$version\`" | tee -a "$summary"
        else
          helm push "$charts_dir/packages/$name-$version.tgz" "${ref%/*}"
          echo "- \`$ref:$version\`" | tee -a "$summary"
        fi ;;
      "$release")
        # The release attaches what the registry holds, not this run's repackaging of it.
        rm -f "$charts_dir/packages/$name-$version.tgz"
        helm pull "$ref" --version "$version" --destination "$charts_dir/packages"
        echo "- \`$ref:$version\` pushed by an earlier attempt; unchanged" | tee -a "$summary" ;;
      *) echo "- \`$ref:$version\`: not pushed ($state)" | tee -a "$summary" ;;
    esac
  done < "$charts_dir/states"
}

releases() {
  local tag title latest notes chart version asset assets attached
  echo "### GitHub Releases" >> "$summary"
  while IFS=$'\t' read -r tag title latest notes chart version; do
    [ -n "$tag" ] || continue
    assets=()
    asset=''
    if [ -n "$chart" ]; then
      asset="$chart-$version.tgz"
      if [ -f "$charts_dir/packages/$asset" ]; then
        assets=("$charts_dir/packages/$asset")
      else
        echo "::${level}::$charts_dir/packages/$asset is missing; the charts step packages it."
        [ "$dry" = 'true' ] || exit 1
      fi
    fi
    if gh release view "$tag" > /dev/null 2>&1; then
      # Created by an earlier attempt that stopped before the upload.
      attached=''
      if [ "${#assets[@]}" -gt 0 ]; then attached="$(gh release view "$tag" --json assets --jq '.assets[].name')"; fi
      if [ "${#assets[@]}" -gt 0 ] && ! grep -qFx "$asset" <<< "$attached"; then
        if [ "$dry" = 'true' ]; then
          echo "- $title: exists; would attach $asset" | tee -a "$summary"
        else
          gh release upload "$tag" "${assets[@]}"
          echo "- $title: exists; attached $asset" | tee -a "$summary"
        fi
        continue
      fi
      echo "- $title: exists; unchanged" | tee -a "$summary"
      continue
    fi
    if [ "$dry" = 'true' ]; then
      {
        echo "<details><summary>would create $title (latest: $latest)${asset:+ with $asset}</summary>"
        echo ""
        cat "$notes"
        echo "</details>"
      } >> "$summary"
      echo "would create $title (latest: $latest)${asset:+ with $asset}"
      continue
    fi
    gh release create "$tag" --verify-tag --title "$title" --notes-file "$notes" --latest="$latest" "${assets[@]}"
    echo "- $title (latest: $latest)${asset:+ with $asset}" | tee -a "$summary"
  done < <(rows releases tag title latest notesFile chart.name chart.version)
}

case "$cmd" in
  check) check ;;
  build) build ;;
  images) images ;;
  npm) npm_publish ;;
  charts-check) charts_check ;;
  charts) charts ;;
  releases) releases ;;
  *) echo "unknown subcommand: $cmd" >&2; exit 2 ;;
esac
