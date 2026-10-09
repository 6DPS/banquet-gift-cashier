@echo off
cd /d "%~dp0"
title Export Data Backup Wizard
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\export-data-package.ps1"
pause