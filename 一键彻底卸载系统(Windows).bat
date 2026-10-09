@echo off
cd /d "%~dp0"
title Banquet Gift Cashier - Uninstall Wizard

net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_AS_ADMIN

echo ===============================================================
echo        Banquet Gift Cashier - System Uninstall Wizard
echo ===============================================================
echo.
echo [INFO] Requesting Administrator privileges for full cleanup...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0scripts\uninstall-system.ps1""' -Verb RunAs -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 exit /b

echo.
echo [INFO] Continuing with standard user privileges...
echo.

:RUN_AS_ADMIN
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-system.ps1"
exit /b
