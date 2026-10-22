# Checks SQL migration file names against the rules the service enforces at startup.
# Run from repository root: pwsh .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.ps1
#
# Errors (exit 1, all reported at once):
#   1. two up files or two down files share a number, including padded variants such as 1_ and 01_;
#   2. one number is used by migrations with different names;
#   3. a down file has no up file with the same number;
#   4. up numbers are not exactly 1..N, a prefix is 0 or longer than 9 digits, or no migration files exist.
# Warnings (exit 0 if there are no errors):
#   5. an up file has no down file; allowed for data fixes that cannot be reverted.

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$MigrationsDir = Join-Path $RepoRoot 'resources/migrations'

# Keeps numbers inside 32-bit integers on both the bash and PowerShell side.
$MaxPrefixDigits = 9
$MaxMissingShown = 20

if (-not (Test-Path $MigrationsDir)) {
    Write-Error "migrations directory not found: $MigrationsDir"
}

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$records = [System.Collections.Generic.List[object]]::new()
$fileCount = 0

$names = [string[]]@(Get-ChildItem -Path $MigrationsDir -File | ForEach-Object { $_.Name })
[System.Array]::Sort($names, [System.StringComparer]::Ordinal)

foreach ($base in $names) {
    if ($base -cnotmatch '^([0-9]+)_(.+)\.(up|down)\.sql$') {
        continue
    }
    $raw = $Matches[1]
    $slug = $Matches[2]
    $side = $Matches[3]
    $fileCount++
    if ($raw.Length -gt $MaxPrefixDigits) {
        $errors.Add("${base}: prefix is longer than $MaxPrefixDigits digits")
        continue
    }
    $num = [int64]::Parse($raw, [System.Globalization.CultureInfo]::InvariantCulture)
    if ($num -eq 0) {
        $errors.Add("${base}: migration number must start at 1")
        continue
    }
    $records.Add([pscustomobject]@{ Side = $side; Num = $num; Slug = $slug; Base = $base })
}

if ($fileCount -eq 0) {
    $errors.Add("no migration files found in $MigrationsDir")
}

$records.Sort([System.Comparison[object]] {
    param($x, $y)
    $c = $x.Num.CompareTo($y.Num)
    if ($c -eq 0) { $c = [System.StringComparer]::Ordinal.Compare($x.Side, $y.Side) }
    if ($c -eq 0) { $c = [System.StringComparer]::Ordinal.Compare($x.Base, $y.Base) }
    return $c
})
$sorted = @($records)

$sideFiles = [ordered]@{}
$slugsByNum = [ordered]@{}
$ups = @{}
$downs = @{}
foreach ($r in $sorted) {
    $key = "$($r.Side) $($r.Num)"
    if (-not $sideFiles.Contains($key)) { $sideFiles[$key] = [System.Collections.Generic.List[string]]::new() }
    $sideFiles[$key].Add($r.Base)
    if (-not $slugsByNum.Contains($r.Num)) { $slugsByNum[$r.Num] = [System.Collections.Generic.List[string]]::new() }
    if (-not $slugsByNum[$r.Num].Contains($r.Slug)) { $slugsByNum[$r.Num].Add($r.Slug) }
    if ($r.Side -eq 'up') { $ups[$r.Num] = $true } else { $downs[$r.Num] = $true }
}

$distinct = @{}
foreach ($num in $slugsByNum.Keys) {
    if ($slugsByNum[$num].Count -gt 1) {
        $distinct[$num] = $true
        $errors.Add("${num}: migration number used for distinct migrations " + ($slugsByNum[$num] -join ' and '))
    }
}

foreach ($key in $sideFiles.Keys) {
    $side, $numText = $key -split ' '
    $num = [int64]$numText
    if ($sideFiles[$key].Count -gt 1 -and -not $distinct.ContainsKey($num)) {
        $errors.Add("${num}: duplicate $side migration number: " + ($sideFiles[$key] -join ', '))
    }
}

foreach ($num in $slugsByNum.Keys) {
    if ($downs.ContainsKey($num) -and -not $ups.ContainsKey($num) -and -not $distinct.ContainsKey($num)) {
        $errors.Add("${num}: down migration has no up migration with the same number")
    }
}

$upCount = $ups.Count
$maxUp = 0
if ($upCount -gt 0) { $maxUp = ($ups.Keys | Measure-Object -Maximum).Maximum }
if ($upCount -gt 0 -and $maxUp -ne $upCount) {
    $missing = [System.Collections.Generic.List[string]]::new()
    for ($n = [int64]1; $n -le $maxUp -and $missing.Count -lt $MaxMissingShown; $n++) {
        if (-not $ups.ContainsKey($n)) { $missing.Add([string]$n) }
    }
    if ($missing.Count -eq $MaxMissingShown) { $missing.Add('...') }
    $errors.Add("missing migration number(s): " + ($missing -join ', ') + " (highest number found is $maxUp)")
}

$missingDown = 0
foreach ($r in $sorted) {
    if ($r.Side -eq 'up' -and -not $downs.ContainsKey($r.Num) -and -not $distinct.ContainsKey($r.Num)) {
        $warnings.Add("warning: no down migration for $($r.Base)")
        $missingDown++
    }
}
if ($missingDown -gt 0) {
    $warnings.Add("warning: $missingDown up migration(s) have no down migration (allowed for data fixes; confirm it is intentional)")
}

foreach ($w in $warnings) {
    Write-Warning $w
}

if ($errors.Count -gt 0) {
    Write-Error ("error: migration files violate the startup checks:`n  - " + ($errors -join "`n  - "))
}

Write-Host "ok: $upCount migration number(s), highest prefix is $maxUp"
Write-Host "next suggested prefix: $($maxUp + 1)"
