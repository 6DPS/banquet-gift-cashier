@echo off
chcp 65001 >nul
title 正在打包 礼金收聘系统 独立安装程序...
cd /d "%~dp0"

echo ===============================================================
echo     礼金收聘系统 · 账房云枢 - 一键打包生成独立 Windows 安装程序
echo ===============================================================
echo.

node scripts/build-installer.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 打包过程中出现异常，请检查上方日志。
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 打包完成！生成物已放置在当前目录下的 dist 文件夹中。
pause
