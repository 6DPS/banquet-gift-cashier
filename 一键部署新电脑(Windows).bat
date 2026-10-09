@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 礼金收聘系统 - 新电脑一键部署向导

net session >nul 2>&1
if %errorlevel% equ 0 goto :RUN_AS_ADMIN

echo ===============================================================
echo     🏮 礼金收聘系统 · 账房云枢 - 新电脑一键部署向导
echo ===============================================================
echo.
echo [提示] 正在申请管理员权限以配置网络防火墙与快捷方式...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Process powershell.exe -ArgumentList '-NoExit -NoProfile -ExecutionPolicy Bypass -File \"\"%~dp0scripts\setup-new-windows-host.ps1\"\"' -Verb RunAs -ErrorAction Stop; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 exit /b

echo.
echo [提示] 未获取管理员权限，正在以当前用户普通权限继续运行向导...
echo.

:RUN_AS_ADMIN
powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-new-windows-host.ps1"
exit /b
