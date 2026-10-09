@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 礼金收聘系统 · 一键彻底卸载向导

net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_AS_ADMIN

echo ===============================================================
echo        礼金收聘系统 · 一键彻底卸载与环境清理向导
echo ===============================================================
echo.
echo [提示] 正在请求管理员权限以清理防火墙规则与桌面配置...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Process powershell.exe -ArgumentList '-NoExit -NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0scripts\uninstall-system.ps1\"\"' -Verb RunAs -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 exit /b

echo.
echo [提示] 正在使用标准权限继续执行卸载流程...
echo.

:RUN_AS_ADMIN
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-system.ps1"
exit /b
