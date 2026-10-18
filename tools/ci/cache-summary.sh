#!/usr/bin/env bash
#
# One cache block per job, the same shape in every job.
#
# WHAT THIS REPORTS, AND WHAT IT REFUSES TO
#
# Every figure here comes from the tool that USED the cache, never from the step that restored
# it. That is the whole design, and it is the rule this pipeline paid for five times:
#
#   `actions/cache` says "Cache restored from key …" whenever bytes arrived. It said exactly
#   that while Nx used none of them, for five distinct reasons in sequence — the wrong path,
#   artifacts without their metadata database, `plan` claiming `js`'s key, and matrix legs
#   claiming each other's. All five were green at the restore step.
#
# So the restore line is deliberately ABSENT from this summary. Promoting the most misleading
# signal in the pipeline to the most prominent place would make the table look more complete
# and read worse. What appears instead:
#
#   Nx           its own `Cache: N/N hit (P%)` line, the only number that means anything
#   pnpm store   `pnpm install`'s own "downloaded N" — 0 means the store served everything
#   pnpm policy  pnpm 12's own "supply-chain policies (N entries in T)" / "(verified T ago)"
#
# The third is new with pnpm 12 and is here for the same reason as the other two: it is a
# per-job cost that exists and that nothing else in the pipeline reports. pnpm verifies the
# whole lockfile against `minimumReleaseAge` on install, which means fetching registry
# metadata for every entry; it memoises that in the metadata cache, which a runner does not
# have. Cold, it measured 4684 entries in 10m 11.8s on a workstation. Whether that is a
# runner problem is what this row is for.
#
# The buildx layer cache is not here. Its verdict is the `#N CACHED` step count inside
# docker/build-push-action's output, which this script does not see; adding it means capturing
# that action's log, which is more plumbing than the rest of this put together.
#
# Usage:  cache-summary.sh <label> [nx-log] >> "$GITHUB_STEP_SUMMARY"
#
# The label names the job or matrix leg, because these blocks stack on the run page and a
# block that does not say which leg it belongs to is worse than no block.
#
# Never fails the step it is called from. It runs with `if: always()`, which means it runs on
# the failures where the numbers matter most, and a reporting script that can redden a job is
# a bad trade — a lesson from a diagnostic that exited 1 on its own cosmetic tail.
set -uo pipefail

label="${1:-unknown}"
nx_log="${2:-}"

strip_ansi() { sed 's/\x1b\[[0-9;]*m//g'; }

nx_line="—"
if [ -n "$nx_log" ] && [ -s "$nx_log" ]; then
  # `Cache:   29/29 hit (100%)`, after colour codes are removed.
  hit="$(strip_ansi < "$nx_log" | grep -oE 'Cache: +[0-9]+/[0-9]+ hit \([0-9]+%\)' | tail -1 || true)"
  if [ -n "${hit:-}" ]; then
    counts="$(printf '%s' "$hit" | grep -oE '[0-9]+/[0-9]+ hit \([0-9]+%\)')"
    nx_line="**${counts%% hit*} tasks from cache** (${counts##*\(}"
    nx_line="${nx_line%)*})"
  else
    # Nx ran but scheduled nothing cacheable, or did not get far enough to print a summary.
    nx_line="_no cacheable tasks reported_"
  fi
else
  nx_line="_no Nx tasks in this job_"
fi

scope="${CACHE_NX_SCOPE:-unknown}"
store_state="${CACHE_PNPM_STORE:-unknown}"
downloaded="${CACHE_PNPM_DOWNLOADED:-?}"

policy="${CACHE_PNPM_POLICY:-not reported}"

pnpm_line="**downloaded ${downloaded}**"
if [ "$downloaded" = "0" ]; then
  pnpm_line="$pnpm_line — the store served every package"
fi

# `verified N ago` is a memo hit and costs nothing; `N entries in T` is a cold verification
# and T is the number that matters. Said explicitly rather than left to be inferred from the
# wording, because the two read almost identically at a glance.
policy_line="**${policy}**"
case "$policy" in
  *verified*) policy_line="$policy_line — memo hit, no registry metadata fetched" ;;
  *entries*)  policy_line="$policy_line — **cold**, this is a per-job cost" ;;
esac

printf '### Cache — %s\n\n' "$label"
printf '| | |\n|---|---|\n'
printf '| Nx computation | %s, scope `%s` |\n' "$nx_line" "$scope"
printf '| pnpm store | %s, %s |\n' "$pnpm_line" "$store_state"
printf '| pnpm lockfile policy | %s |\n' "$policy_line"
printf '\n<sub>Every figure here is what the tool that used the cache reported. '
printf "The <code>actions/cache</code> restore line is omitted on purpose: it has been green through five separate Nx cache failures.</sub>\n\n"
