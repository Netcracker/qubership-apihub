# Creates or updates the ai:* and agent:* labels that the AI Autonomous agent uses.
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
    'agent:needs-human|FBCA04|The agent needs a person: a decision, more context, permissions, or troubleshooting',
    'agent:pr-reviewed|D4C5F9|The AI review of this pull request is published; its findings may still be open'
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
