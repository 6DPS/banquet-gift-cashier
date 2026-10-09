@echo off
cd /d "%~dp0"
title Pull Updates from GitHub
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\pull-from-github.ps1"
pause