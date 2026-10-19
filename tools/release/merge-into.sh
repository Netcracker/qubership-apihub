#!/usr/bin/env bash
# Usage: tools/release/merge-into.sh <source-branch> <target-branch>
#
# Merges origin/<source> into <target> with a merge commit and pushes <target> to origin with an explicit
# refspec. Never squashes: a squash drops the link to the source commits, and the next release would count
# them again. Does nothing when <target> already contains <source>. When <target> moves during the run
# (release-sync and release-finish can both merge into develop at once), it fetches and merges again.
# On a conflict it fails and prints the commands that resolve it locally.
#
# Writes merged=true|false and sha=<target sha> to $GITHUB_OUTPUT when that is set.
set -euo pipefail

source_branch="${1:?usage: merge-into.sh <source-branch> <target-branch>}"
target_branch="${2:?usage: merge-into.sh <source-branch> <target-branch>}"
output="${GITHUB_OUTPUT:-/dev/null}"

fetch() {
  local attempt
  for attempt in 1 2 3; do
    git fetch --no-tags origin \
      "+refs/heads/$source_branch:refs/remotes/origin/$source_branch" \
      "+refs/heads/$target_branch:refs/remotes/origin/$target_branch" && return 0
    echo "fetch attempt $attempt failed, retrying"
    sleep $((attempt * 5))
  done
  return 1
}

for attempt in 1 2 3 4 5; do
  fetch
  if git merge-base --is-ancestor "origin/$source_branch" "origin/$target_branch"; then
    echo "$target_branch already contains $source_branch; nothing to merge"
    { echo "merged=false"; echo "sha=$(git rev-parse "origin/$target_branch")"; } >> "$output"
    exit 0
  fi

  git switch --quiet --force-create "$target_branch" "origin/$target_branch"
  if ! git merge --no-ff --no-edit -m "Merge branch '$source_branch' into $target_branch" "origin/$source_branch"; then
    git merge --abort || true
    echo "::error::Merging $source_branch into $target_branch conflicts. Resolve it locally with a merge commit:"
    echo "  git fetch origin"
    echo "  git switch $target_branch && git reset --hard origin/$target_branch"
    echo "  git merge --no-ff origin/$source_branch   # resolve, then git commit"
    echo "  git push origin $target_branch:refs/heads/$target_branch"
    echo "Do not squash: the next release would count the $source_branch commits again."
    exit 1
  fi

  if git push origin "refs/heads/$target_branch:refs/heads/$target_branch"; then
    echo "merged $source_branch into $target_branch at $(git rev-parse --short HEAD)"
    { echo "merged=true"; echo "sha=$(git rev-parse HEAD)"; } >> "$output"
    exit 0
  fi
  echo "push attempt $attempt was rejected; $target_branch probably moved, merging again"
  sleep $((attempt * 5))
done

echo "::error::Could not push $target_branch after 5 attempts. Merge $source_branch into $target_branch by hand."
exit 1
