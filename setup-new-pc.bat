@echo off
cd /d "%~dp0"
title Setup New Host Wizard

net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_AS_ADMIN

echo ===============================================================
echo        Banquet Gift Cashier - Setup New Host Wizard
echo ===============================================================
echo.
echo [INFO] Requesting Administrator privileges for firewall and shortcuts...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Process powershell.exe -ArgumentList '-NoExit -NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0scripts\setup-new-windows-host.ps1\"\"' -Verb RunAs -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 exit /b

echo.
echo [INFO] Continuing with standard user privileges...
echo.

:RUN_AS_ADMIN
powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-new-windows-host.ps1"
exit /b