@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 礼金收聘系统 - 一键从 GitHub 同步更新
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\pull-from-github.ps1"
pause
