# ============================================================================== #
# Banquet Gift Cashier - Complete Uninstall Wizard (Windows PowerShell)          #
# ============================================================================== #

$Host.UI.RawUI.WindowTitle = "Banquet Gift Cashier - Complete Uninstall Wizard"

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Red
Write-Host "       Banquet Gift Cashier - Complete Uninstall Wizard        " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Red
Write-Host ""
Write-Host "[WARNING] This wizard will completely remove this application," -ForegroundColor Yellow
Write-Host "all background configurations, and desktop shortcuts from your PC." -ForegroundColor Yellow
Write-Host "Application path: $root" -ForegroundColor Gray
Write-Host ""
Write-Host "Please select uninstallation mode:" -ForegroundColor Cyan
Write-Host "  [1] Uninstall and BACKUP current ledger data to Desktop (Recommended)" -ForegroundColor Green
Write-Host "  [2] Uninstall completely WITHOUT backup (Permanent cleanup)" -ForegroundColor Red
Write-Host "  [3] Cancel and exit (Do nothing)" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter your choice [1, 2, or 3] and press Enter"

if ($choice -ne "1" -and $choice -ne "2") {
    Write-Host ""
    Write-Host "[CANCELED] Uninstallation aborted. No changes were made." -ForegroundColor Green
    Start-Sleep -Seconds 2
    exit 0
}

Write-Host ""
$confirm = Read-Host "Are you sure you want to permanently uninstall? (Type Y to proceed, any other key to cancel)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host ""
    Write-Host "[CANCELED] Uninstallation aborted. No changes were made." -ForegroundColor Green
    Start-Sleep -Seconds 2
    exit 0
}

Write-Host ""
Write-Host "---------------- Starting Full System Uninstallation ----------------" -ForegroundColor Cyan

# Backup data if option 1 is selected
$desktopPath = [Environment]::GetFolderPath("Desktop")
$dbFile = Join-Path $root "data\lijin_database.json"

if ($choice -eq "1" -and (Test-Path -LiteralPath $dbFile)) {
    try {
        $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $backupDest = Join-Path $desktopPath "Banquet_Ledger_Final_Backup_$timestamp.json"
        Copy-Item -LiteralPath $dbFile -Destination $backupDest -Force
        Write-Host "[BACKUP OK] Ledger data successfully saved to Desktop:" -ForegroundColor Green
        Write-Host "  $backupDest" -ForegroundColor Yellow
    } catch {
        Write-Host "[WARNING] Data backup failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 1: Stop running background service and kill port 8089
Write-Host ""
Write-Host "[1/4] Stopping background service and freeing Port 8089..." -ForegroundColor Cyan
try {
    $conns = Get-NetTCPConnection -LocalPort 8089 -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            if ($p -gt 0) {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "  [OK] Terminated active service PID: $p" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  [OK] Port 8089 is not in use." -ForegroundColor Green
    }
} catch {
    netstat -ano | Select-String ":8089 .*LISTENING" | ForEach-Object {
        $line = $_.ToString().Trim()
        $parts = $line -split '\s+'
        $procId = $parts[-1]
        if ($procId -match '^\d+$') {
            taskkill /F /PID $procId 2>$null | Out-Null
            Write-Host "  [OK] Terminated PID: $procId" -ForegroundColor Green
        }
    }
}

# Terminate related node processes under this directory
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CommandLine -like "*$root*") {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Terminated Node.js instance PID: $($_.ProcessId)" -ForegroundColor Green
    }
}

# Step 2: Delete desktop shortcuts
Write-Host ""
Write-Host "[2/4] Removing desktop shortcuts..." -ForegroundColor Cyan
$shortcutsToDelete = @(
    (Join-Path $desktopPath "Banquet Gift Cashier.lnk"),
    (Join-Path $desktopPath "<Ñ6Xûß.lnk"),
    "C:\Users\Public\Desktop\Banquet Gift Cashier.lnk",
    "C:\Users\Public\Desktop\<Ñ6Xûß.lnk"
)
foreach ($sc in $shortcutsToDelete) {
    if (Test-Path -LiteralPath $sc) {
        Remove-Item -LiteralPath $sc -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Removed shortcut: $sc" -ForegroundColor Green
    }
}

# Step 3: Remove firewall rule
Write-Host ""
Write-Host "[3/4] Removing Windows Firewall rule (Port 8089)..." -ForegroundColor Cyan
try {
    $ruleName = "BanquetGiftCashier-Port8089"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        Write-Host "  [OK] Firewall rule removed: $ruleName" -ForegroundColor Green
    } else {
        Write-Host "  [OK] No firewall rules found to clean." -ForegroundColor Green
    }
} catch {
    Write-Host "  [Notice] Skipped firewall cleanup (Administrator privileges required)." -ForegroundColor Gray
}

# Step 4: Schedule directory self-cleanup
Write-Host ""
Write-Host "[4/4] Scheduling directory self-cleanup and file destruction..." -ForegroundColor Cyan

$tempBat = Join-Path $env:TEMP "cleanup_banquet_$((Get-Random).ToString()).bat"

$template = @'
@echo off
title Banquet Gift Cashier - Cleanup in Progress...
echo.
echo ====================================================================
echo        Cleaning up all application files, please wait...
echo ====================================================================
echo.
ping 127.0.0.1 -n 3 >nul 2>nul
echo Removing directory: "{0}"
rmdir /s /q "{0}" >nul 2>nul
if not exist "{0}" (
    echo.
    echo ====================================================================
    echo   [SUCCESS] Banquet Gift Cashier has been completely uninstalled!
    echo   All files and configurations have been cleaned from your PC.
    echo ====================================================================
) else (
    echo.
    echo [NOTICE] A few files may be locked by open Explorer windows.
    echo You can close open folders and delete any remaining empty directory.
)
echo.
echo Press any key to close this window...
pause >nul
del "%~f0" >nul 2>nul
exit
'@

$batScript = $template -f $root
Set-Content -LiteralPath $tempBat -Value $batScript -Encoding ASCII

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Uninstall ready! Launching final cleanup process... " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "cmd.exe" -ArgumentList "/c `"$tempBat`""
exit 0