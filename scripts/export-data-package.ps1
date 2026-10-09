# ==============================================================================
# Banquet Gift Cashier - Export Data Backup Package
# ==============================================================================

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "    Banquet Gift Cashier - Export Data Backup Package           " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

$dataDir = Join-Path $root "data"
if (-not (Test-Path -LiteralPath $dataDir)) {
    Write-Host "[ERROR] Data directory does not exist!" -ForegroundColor Red
    pause
    exit 1
}

$timeTag = Get-Date -Format "yyyyMMdd_HHmmss"
$desktop = [Environment]::GetFolderPath("Desktop")
$zipName = "Banquet_Gift_Data_Backup_$timeTag.zip"
$zipPath = Join-Path $desktop $zipName

Write-Host "Compressing data directory to Desktop..." -ForegroundColor Yellow
Compress-Archive -Path $dataDir -DestinationPath $zipPath -Force

if (Test-Path -LiteralPath $zipPath) {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "    [SUCCESS] Full data backup created on your Desktop:        " -ForegroundColor Green
    Write-Host "    $zipName" -ForegroundColor Yellow
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "Copy this zip file to your USB drive to migrate to any new PC." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[ERROR] Failed to create backup archive." -ForegroundColor Red
}