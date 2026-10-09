@echo off
title Stop Banquet Gift Cashier Service

echo ====================================================================
echo        Stopping Banquet Gift Cashier Service (Port 8089)...
echo ====================================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8089 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
    set FOUND=1
)

if "%FOUND%"=="1" (
    echo [SUCCESS] Service on Port 8089 has been stopped successfully.
) else (
    echo [INFO] No service was found running on Port 8089.
)

echo.
echo Closing in 3 seconds...
ping 127.0.0.1 -n 4 >nul 2>nul
exit