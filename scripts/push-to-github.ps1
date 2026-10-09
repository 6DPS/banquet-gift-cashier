# ==============================================================================
# Banquet Gift Cashier - Push to GitHub Wizard
# ==============================================================================

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "         Banquet Gift Cashier - Push to GitHub Wizard          " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path -LiteralPath (Join-Path $root ".git"))) {
    Write-Host "[1/3] Initializing local Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "  [OK] Git repository initialized (branch: main)" -ForegroundColor Green
    Write-Host ""
}

$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "Current GitHub Remote: $remoteUrl" -ForegroundColor Green
    Write-Host ""
} else {
    $defaultRepo = "https://github.com/6DPS/banquet-gift-cashier.git"
    Write-Host "No GitHub remote repository configured yet." -ForegroundColor Yellow
    $inputRepo = Read-Host "Enter GitHub repository URL [Press Enter for default: $defaultRepo]"
    if (-not $inputRepo.Trim()) {
        $inputRepo = $defaultRepo
    }
    git remote add origin $inputRepo
    Write-Host "  [OK] Bound remote repository: $inputRepo" -ForegroundColor Green
    Write-Host ""
}

$changes = git status --porcelain
if ($changes) {
    Write-Host "[2/3] Local changes detected. Staging changes..." -ForegroundColor Yellow
    $nowStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $customMsg = Read-Host "Enter commit message [Press Enter for default: update: $nowStr]"
    if (-not $customMsg.Trim()) {
        $customMsg = "update: $nowStr"
    }
    git add -A
    git commit -m "$customMsg"
    Write-Host "  [OK] Committed: $customMsg" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[2/3] Working tree is clean. Nothing new to commit." -ForegroundColor Green
    Write-Host ""
}

Write-Host "[3/3] Pushing to GitHub (main branch)..." -ForegroundColor Yellow
git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "    [SUCCESS] All code has been pushed to GitHub successfully!  " -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host " [Notice] Push failed. Common solutions:" -ForegroundColor Yellow
    Write-Host " 1. Make sure the repository exists at: https://github.com/new" -ForegroundColor Gray
    Write-Host " 2. Check network connection and run this script again." -ForegroundColor Gray
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host ""
}