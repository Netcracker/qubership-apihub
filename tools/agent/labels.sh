#!/usr/bin/env bash
# Creates or updates the ai:*, agent:*, and needs-human:* labels that the AI Autonomous agent uses.
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
  "agent:pr-reviewed|D4C5F9|The AI review of this pull request is published; its findings may still be open"
  "needs-human:approval-required|BFD4F2|The agent finished and its pull request waits for a person to review and approve it"
  "needs-human:risk-found|FBCA04|The agent found a risk (security, data loss, compatibility) and needs a person to accept it"
  "needs-human:decision-required|FBCA04|A product or design choice is open and a person must decide"
  "needs-human:context-missing|FBCA04|The task lacks information the agent needs; a person must answer its questions"
  "needs-human:access-missing|FBCA04|The agent lacks a permission, token, or access it needs"
  "needs-human:verification-blocked|FBCA04|The agent cannot verify the change: a check cannot run or is not trustworthy"
  "needs-human:environment-blocked|FBCA04|The tooling, runner, or environment failed and the agent cannot go on"
  "needs-human:external-dependency|FBCA04|The work waits on another team, release, or change outside this repository"
  "needs-human:conflict-unresolved|FBCA04|A merge conflict or contradicting changes the agent cannot resolve safely"
  "needs-human:scope-review-required|FBCA04|The change grew beyond the issue scope and a person must confirm the scope"
  "needs-human:invalid|FBCA04|The task looks like a duplicate, is already fixed, or describes intended behavior"
  "needs-human:stuck|FBCA04|The agent tried and made no progress, for example the same failure again"
  "needs-human:disagreement|FBCA04|The agent and a reviewer or check disagree and a person must settle it"
  "needs-human:budget-exhausted|FBCA04|The agent used its attempt, time, or cost budget before it finished"
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
