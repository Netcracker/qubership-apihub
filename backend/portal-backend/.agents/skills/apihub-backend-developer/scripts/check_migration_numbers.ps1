# Verifies each SQL migration numeric prefix maps to at most one migration name.
# Run from repository root: pwsh .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.ps1

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$MigrationsDir = Join-Path $RepoRoot 'qubership-apihub-service\resources\migrations'

if (-not (Test-Path $MigrationsDir)) {
    Write-Error "migrations directory not found: $MigrationsDir"
}

$slugByNum = @{}
$maxNum = 0

Get-ChildItem -Path $MigrationsDir -File | ForEach-Object {
    if ($_.Name -match '^(\d+)_(.+)\.(up|down)\.sql$') {
        $num = [int]$Matches[1]
        $slug = $Matches[2]
        if ($num -gt $maxNum) { $maxNum = $num }
        if (-not $slugByNum.ContainsKey($num)) {
            $slugByNum[$num] = [System.Collections.Generic.HashSet[string]]::new()
        }
        [void]$slugByNum[$num].Add($slug)
    }
}

$duplicates = @()
foreach ($num in $slugByNum.Keys) {
    if ($slugByNum[$num].Count -gt 1) {
        $names = ($slugByNum[$num] | Sort-Object) -join ', '
        $duplicates += "${num}: $names"
    }
}

if ($duplicates.Count -gt 0) {
    Write-Error ("duplicate migration number(s):`n  - " + ($duplicates -join "`n  - "))
}

$count = $slugByNum.Count
Write-Host "ok: $count migration number(s), highest prefix is $maxNum"
Write-Host "next suggested prefix: $($maxNum + 1)"
