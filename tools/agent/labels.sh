#!/usr/bin/env bash
# Creates or updates the ai:* and agent:* labels that the AI Autonomous agent uses.
#
#   bash tools/agent/labels.sh [--dry-run] [<owner/repo>]
#
# Run it once per repository. --force updates labels that already exist, so a rerun is safe.
# --dry-run prints the gh commands instead of running them. The default repo is Netcracker/qubership-apihub.
set -euo pipefail

# name|color (hex, no #)|description. Descriptions must stay within GitHub's 100-character limit.
labels=(
  "ai:suitable|2DA44E|AI could complete the task on its own, given the tools, context, and checks it needs"
  "ai:unsuitable|CF222E|AI should not do this task: technical, organizational, or other limits"
  "ai:l0-assistant|C5DEF5|A person did the work and used AI for suggestions, answers, or code"
  "ai:l1-executor|8AB4F8|A person started and accepted the work; AI implemented it, ran the checks, and opened the PR"
  "ai:l2-agent|3B7DD8|AI picked the task, implemented it, and opened the PR; a person reviewed and accepted it"
  "ai:l3-autonomous|0B4F9C|AI picked, implemented, merged, and closed the task without a person"
  "agent:completed|0E8A16|The agent finished and every required check passed; a person may not have accepted it yet"
  "agent:needs-human|FBCA04|The agent needs a person: a decision, more context, permissions, or troubleshooting"
  "agent:pr-reviewed|D4C5F9|The AI review of this pull request is published; its findings may still be open"
)

dry_run=0
repo="Netcracker/qubership-apihub"
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=1 ;;
    -h | --help) echo "usage: labels.sh [--dry-run] [<owner/repo>]"; exit 0 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *) repo="$arg" ;;
  esac
done

# The check runs for dry runs too, so a missing gh fails the same way in both modes.
if ! command -v gh > /dev/null; then
  echo "gh is not on PATH. Install the GitHub CLI from https://cli.github.com/ and run gh auth login." >&2
  exit 1
fi

for entry in "${labels[@]}"; do
  name="${entry%%|*}"
  rest="${entry#*|}"
  color="${rest%%|*}"
  description="${rest#*|}"
  if [ "$dry_run" -eq 1 ]; then
    printf 'gh label create "%s" --repo "%s" --color "%s" --description "%s" --force\n' \
      "$name" "$repo" "$color" "$description"
  else
    gh label create "$name" --repo "$repo" --color "$color" --description "$description" --force
  fi
done
