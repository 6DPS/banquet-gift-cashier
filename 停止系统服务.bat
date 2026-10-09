@echo off
title ֹͣ�����Ƹϵͳ����

echo ====================================================================
echo        ����ֹͣ �����Ƹϵͳ ��̨���ݷ���...
echo ====================================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8089 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
    set FOUND=1
)

if "%FOUND%"=="1" (
    echo [�ɹ�] �����Ƹϵͳ���� [�˿� 8089] �ѳɹ�ֹͣ��
) else (
    echo [��ʾ] �˿� 8089 ��δ���������еķ���
)

echo.
echo �����ڽ��� 3 ����Զ��ر�...
ping 127.0.0.1 -n 4 >nul 2>nul
exit
