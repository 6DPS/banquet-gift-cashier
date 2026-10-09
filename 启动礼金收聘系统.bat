@echo off
title �����Ƹϵͳ �� �˷����������

cd /d "%~dp0"

echo ====================================================================
echo        �����Ƹϵͳ �� �˷����� [���Эͬ��]
echo        ����Эͬ �� ����¼�� �� �ֻ�ɨ�� �� ��ͳ�˱�
echo ====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [����] δ��⵽ Node.js ���л��������Ȱ�װ Node.js��
    pause
    exit /b 1
)

netstat -ano | findstr /R /C:":8089 .*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo [1/2] ��⵽��̨���ݷ������������� [�˿� 8089]��ֱ������������...
) else (
    echo [1/2] ���������̨���������������Эͬ���� [�˿� 8089]...
    start /min "�����Ƹ��̨����" node server.js
    ping 127.0.0.1 -n 3 >nul 2>nul
)

echo [2/2] ���ڴ������˷�������...
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
echo   [���гɹ�] �����Ƹϵͳ�Ѿ�����
echo   - �������˷������Ѵ� [��δ���������: http://localhost:8089]
echo   - �ֻ�Эͬ�����������Ͻǡ��ֻ�ɨ��Эͬ���ˡ���΢��ɨ������
echo   - ��̨�������������У��رձ���ɫ�������ڲ���Ӱ��ϵͳʹ��
echo ====================================================================
echo.
echo [��ʾ] ���������ڽ��� 4 ����Զ����ˣ��������ֱ�ӹر�...
ping 127.0.0.1 -n 5 >nul 2>nul
exit
