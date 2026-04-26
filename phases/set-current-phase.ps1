# set-current-phase.ps1 — switch the active phase by copying the chosen
# phase doc into CURRENT_PHASE.md.
#
# Used in environments where symlinks aren't available (Windows without
# Developer Mode or admin shell). PowerShell-native version of
# set-current-phase.sh; both produce the same result.
#
# Usage:
#   .\phases\set-current-phase.ps1 5                          # by number
#   .\phases\set-current-phase.ps1 phase-5-save-flow-validation
#   .\phases\set-current-phase.ps1                            # list options

param(
    [Parameter(Mandatory=$false, Position=0)]
    [string]$Phase
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not $Phase) {
    Write-Host "Usage: .\phases\set-current-phase.ps1 <phase-number-or-name>"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\phases\set-current-phase.ps1 1"
    Write-Host "  .\phases\set-current-phase.ps1 5"
    Write-Host "  .\phases\set-current-phase.ps1 phase-3-backend"
    Write-Host ""
    Write-Host "Available phases:"
    Get-ChildItem -Filter "phase-*-*.md" | ForEach-Object { Write-Host "  $($_.Name)" }
    exit 1
}

$Target = $null

# Number → match phase-N-*.md
if ($Phase -match '^\d+$') {
    $match = Get-ChildItem -Filter "phase-$Phase-*.md" | Select-Object -First 1
    if ($match) { $Target = $match.Name }
}
# phase-N-name → append .md if missing
elseif ($Phase -like "phase-*") {
    $candidate = if ($Phase.EndsWith(".md")) { $Phase } else { "$Phase.md" }
    if (Test-Path $candidate) { $Target = $candidate }
}
# Literal filename
else {
    if (Test-Path $Phase) { $Target = $Phase }
}

if (-not $Target -or -not (Test-Path $Target)) {
    Write-Error "Phase file not found for input '$Phase'"
    Write-Host ""
    Write-Host "Available phases:" -ForegroundColor Yellow
    Get-ChildItem -Filter "phase-*-*.md" | ForEach-Object { Write-Host "  $($_.Name)" }
    exit 1
}

Copy-Item -Path $Target -Destination "CURRENT_PHASE.md" -Force
$lineCount = (Get-Content "CURRENT_PHASE.md" | Measure-Object -Line).Lines
Write-Host "Active phase set to: $Target" -ForegroundColor Green
Write-Host "  CURRENT_PHASE.md updated ($lineCount lines)."
Write-Host ""
Write-Host "Next: open a new Claude Code session and say `"start Phase $Phase`"."
