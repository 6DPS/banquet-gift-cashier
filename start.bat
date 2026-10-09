@echo off
title Banquet Gift Cashier Launcher

cd /d "%~dp0"

echo ====================================================================
echo        Banquet Gift Cashier System (Port 8089)
echo        Fast Entry - Blind Typing - Mobile Sync - Excel Export
echo ====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found! Please install Node.js first.
    pause
    exit /b 1
)

netstat -ano | findstr /R /C:":8089 .*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo [1/2] Service is already running on Port 8089. Opening interface...
) else (
    echo [1/2] Starting background service on Port 8089...
    start /min "BanquetCashierService" node server.js
    ping 127.0.0.1 -n 3 >nul 2>nul
)

echo [2/2] Opening application window...
set "EDGE_EXE="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"

if defined EDGE_EXE (
    start "" "%EDGE_EXE%" --app="http://localhost:8089" --window-size=1400,900
) else (
    start http://localhost:8089
)

echo.
echo ====================================================================
echo   [SUCCESS] Banquet Gift Cashier is now running!
echo   - Local Dashboard : http://localhost:8089
echo   - Mobile Sync     : Scan QR code on top right of the dashboard
echo ====================================================================
echo.
echo Window closing in 4 seconds...
ping 127.0.0.1 -n 5 >nul 2>nul
exit