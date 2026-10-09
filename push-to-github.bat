@echo off
cd /d "%~dp0"
title Push to GitHub Wizard
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-to-github.ps1"
pause