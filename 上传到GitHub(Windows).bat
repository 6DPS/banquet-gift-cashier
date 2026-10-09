@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 礼金收聘系统 - GitHub 推送向导
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-to-github.ps1"
pause
