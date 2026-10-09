# ==============================================================================
# Banquet Gift Cashier - Pull Updates from GitHub
# ==============================================================================

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "        Banquet Gift Cashier - Pull Updates from GitHub        " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Pulling latest code from GitHub..." -ForegroundColor Green
git pull origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[2/2] Checking npm dependencies..." -ForegroundColor Green
    & npm install --registry=https://registry.npmmirror.com
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "    [SUCCESS] System has been updated to the latest version!   " -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "Please restart the system by running start.bat to apply updates." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[ERROR] Git pull failed. Please check your network connection." -ForegroundColor Red
    Write-Host ""
}