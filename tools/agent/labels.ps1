# Creates or updates the ai:*, agent:*, and needs-human:* labels that the AI Autonomous agent uses.
#
#   pwsh tools/agent/labels.ps1 [-DryRun] [-Repo <owner/repo>]
#   powershell -NoProfile -File tools/agent/labels.ps1 [-DryRun] [-Repo <owner/repo>]
#
# Run it once per repository. gh label create --force updates labels that already exist, so a rerun is safe.
# -DryRun prints the gh commands instead of running them. The default repo is Netcracker/qubership-apihub.
# The script runs on Windows PowerShell 5.1 as well as PowerShell 7, so it avoids newer syntax.
param(
    [switch]$DryRun,
    [string]$Repo = 'Netcracker/qubership-apihub'
)

$ErrorActionPreference = 'Stop'

# name|color (hex, no #)|description. Descriptions must stay within GitHub's 100-character limit.
$labels = @(
    'ai:suitable|2DA44E|AI could complete the task on its own, given the tools, context, and checks it needs',
    'ai:unsuitable|CF222E|AI should not do this task: technical, organizational, or other limits',
    'ai:l0-assistant|C5DEF5|A person did the work and used AI for suggestions, answers, or code',
    'ai:l1-executor|8AB4F8|A person started and accepted the work; AI implemented it, ran the checks, and opened the PR',
    'ai:l2-agent|3B7DD8|AI picked the task, implemented it, and opened the PR; a person reviewed and accepted it',
    'ai:l3-autonomous|0B4F9C|AI picked, implemented, merged, and closed the task without a person',
    'agent:completed|0E8A16|The agent finished and every required check passed; a person may not have accepted it yet',
    'agent:pr-reviewed|D4C5F9|The AI review of this pull request is published; its findings may still be open',
    'needs-human:approval-required|BFD4F2|The agent finished and its pull request waits for a person to review and approve it',
    'needs-human:risk-found|FBCA04|The agent found a risk (security, data loss, compatibility) and needs a person to accept it',
    'needs-human:decision-required|FBCA04|A product or design choice is open and a person must decide',
    'needs-human:context-missing|FBCA04|The task lacks information the agent needs; a person must answer its questions',
    'needs-human:access-missing|FBCA04|The agent lacks a permission, token, or access it needs',
    'needs-human:verification-blocked|FBCA04|The agent cannot verify the change: a check cannot run or is not trustworthy',
    'needs-human:environment-blocked|FBCA04|The tooling, runner, or environment failed and the agent cannot go on',
    'needs-human:external-dependency|FBCA04|The work waits on another team, release, or change outside this repository',
    'needs-human:conflict-unresolved|FBCA04|A merge conflict or contradicting changes the agent cannot resolve safely',
    'needs-human:scope-review-required|FBCA04|The change grew beyond the issue scope and a person must confirm the scope',
    'needs-human:invalid|FBCA04|The task looks like a duplicate, is already fixed, or describes intended behavior',
    'needs-human:stuck|FBCA04|The agent tried and made no progress, for example the same failure again',
    'needs-human:disagreement|FBCA04|The agent and a reviewer or check disagree and a person must settle it',
    'needs-human:budget-exhausted|FBCA04|The agent used its attempt, time, or cost budget before it finished'
)

# The check runs for dry runs too, so a missing gh fails the same way in both modes.
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    [Console]::Error.WriteLine('gh is not on PATH. Install the GitHub CLI from https://cli.github.com/ and run gh auth login.')
    exit 1
}

foreach ($entry in $labels) {
    $parts = $entry.Split('|')
    $name = $parts[0]
    $color = $parts[1]
    $description = $parts[2]
    if ($DryRun) {
        Write-Output ('gh label create "{0}" --repo "{1}" --color "{2}" --description "{3}" --force' -f $name, $Repo, $color, $description)
    } else {
        & gh label create $name --repo $Repo --color $color --description $description --force
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}
