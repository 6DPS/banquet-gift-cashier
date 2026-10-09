@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 礼金收聘系统 - 换机迁移与数据打包助手
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\export-data-package.ps1"
pause
