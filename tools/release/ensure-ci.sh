#!/usr/bin/env bash
# Usage: tools/release/ensure-ci.sh <branch> <sha>
#
# Makes sure ci.yml runs once for <sha>, the commit a release bot just pushed to <branch>. A push with the
# deploy key starts ci.yml by itself, so this waits for that run and dispatches ci.yml on <branch> only
# when none appears (a push that started no workflow, or GitHub dropping the event). Dispatching in any
# case would build and publish the same commit twice.
#
# Needs GH_TOKEN with actions: write and GH_REPO. CI_WAIT_SECONDS (default 120) bounds the wait.
set -euo pipefail

branch="${1:?usage: ensure-ci.sh <branch> <sha>}"
sha="${2:?usage: ensure-ci.sh <branch> <sha>}"
deadline=$((SECONDS + ${CI_WAIT_SECONDS:-120}))

while :; do
  # --branch too: release-finish puts main and release at the same commit, and both run CI.
  runs="$(gh run list --workflow ci.yml --branch "$branch" --commit "$sha" --json databaseId --jq length \
    2>/dev/null || echo 0)"
  if [ "${runs:-0}" -gt 0 ]; then
    echo "CI is running for $branch at ${sha:0:9}"
    exit 0
  fi
  [ "$SECONDS" -lt "$deadline" ] || break
  sleep 10
done

echo "no CI run for ${sha:0:9} appeared; dispatching ci.yml on $branch"
for attempt in 1 2 3 4 5; do
  if gh workflow run ci.yml --ref "$branch"; then
    echo "dispatched CI on $branch"
    exit 0
  fi
  echo "dispatch attempt $attempt failed, retrying"
  sleep $((attempt * 10))
done

echo "::error::Could not start CI on $branch. Run the CI workflow on $branch by hand."
exit 1
