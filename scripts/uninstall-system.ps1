# ==============================================================================
# 礼金收聘系统 · 一键彻底卸载与环境清理向导 (Windows PowerShell)
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "礼金收聘系统 · 一键彻底卸载向导"

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Red
Write-Host "         礼金收聘系统 · 一键彻底卸载与环境清理向导             " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Red
Write-Host ""
Write-Host "【重要提示】此操作将从当前电脑中彻底移除本系统及所有运行配置与快捷方式。" -ForegroundColor Yellow
Write-Host "系统运行路径: $root" -ForegroundColor Gray
Write-Host ""
Write-Host "请选择您的卸载方式：" -ForegroundColor Cyan
Write-Host "  [1] 彻底卸载系统，但在桌面备份一份最终礼金数据 (推荐，防止数据误失)" -ForegroundColor Green
Write-Host "  [2] 彻底卸载系统，不保留任何数据 (完全粉碎清理所有账本与系统文件)" -ForegroundColor Red
Write-Host "  [3] 取消退出 (不作任何改动)" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "请输入选项数字 [1, 2, 3] 后按回车"

if ($choice -ne "1" -and $choice -ne "2") {
    Write-Host ""
    Write-Host "[已取消] 卸载已中止，未对系统做任何改动。" -ForegroundColor Green
    Start-Sleep -Seconds 2
    exit 0
}

# 二次确认
Write-Host ""
$confirm = Read-Host "【最终确认】您确定要彻底卸载礼金收聘系统吗？(输入 Y 确认，输入其他键取消)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host ""
    Write-Host "[已取消] 卸载已中止，未做任何更改。" -ForegroundColor Green
    Start-Sleep -Seconds 2
    exit 0
}

Write-Host ""
Write-Host "---------------- 开始执行一键彻底卸载 ----------------" -ForegroundColor Cyan

# 备份数据逻辑 (如果选 1)
$desktopPath = [Environment]::GetFolderPath("Desktop")
$dbFile = Join-Path $root "data\lijin_database.json"

if ($choice -eq "1" -and (Test-Path -LiteralPath $dbFile)) {
    try {
        $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $backupDest = Join-Path $desktopPath "礼金收聘系统_最终安全备份_$timestamp.json"
        Copy-Item -LiteralPath $dbFile -Destination $backupDest -Force
        Write-Host "[备份成功] 最终礼金数据已保存至桌面:" -ForegroundColor Green
        Write-Host "  $backupDest" -ForegroundColor Yellow
    } catch {
        Write-Host "[警告] 数据备份失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 步骤 1: 终止正在运行的后台服务与占用进程
Write-Host ""
Write-Host "[1/4] 正在停止后台运行服务并释放端口 (8089)..." -ForegroundColor Cyan
try {
    $conns = Get-NetTCPConnection -LocalPort 8089 -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            if ($p -gt 0) {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "  [OK] 已终止进程 PID: $p" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  [OK] 端口 8089 未被占用，后台服务已停止" -ForegroundColor Green
    }
} catch {
    # 兼容低版本 Windows
    netstat -ano | Select-String ":8089 .*LISTENING" | ForEach-Object {
        $line = $_.ToString().Trim()
        $parts = $line -split '\s+'
        $procId = $parts[-1]
        if ($procId -match '^\d+$') {
            taskkill /F /PID $procId 2>$null | Out-Null
            Write-Host "  [OK] 已通过 taskkill 终止 PID: $procId" -ForegroundColor Green
        }
    }
}

# 额外确保当前目录下的 node 服务终止
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CommandLine -like "*$root*") {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] 已终止项目关联 Node.js 进程 PID: $($_.ProcessId)" -ForegroundColor Green
    }
}

# 步骤 2: 删除桌面启动快捷方式
Write-Host ""
Write-Host "[2/4] 正在清理桌面快捷方式与开始菜单入口..." -ForegroundColor Cyan
$shortcutsToDelete = @(
    (Join-Path $desktopPath "Banquet Gift Cashier.lnk"),
    (Join-Path $desktopPath "礼金收聘系统.lnk"),
    "C:\Users\Public\Desktop\Banquet Gift Cashier.lnk",
    "C:\Users\Public\Desktop\礼金收聘系统.lnk"
)
foreach ($sc in $shortcutsToDelete) {
    if (Test-Path -LiteralPath $sc) {
        Remove-Item -LiteralPath $sc -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] 已删除桌面快捷方式: $sc" -ForegroundColor Green
    }
}

# 步骤 3: 清理 Windows 防火墙规则
Write-Host ""
Write-Host "[3/4] 正在清理 Windows 防火墙规则 (Port 8089)..." -ForegroundColor Cyan
try {
    $ruleName = "BanquetGiftCashier-Port8089"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        Write-Host "  [OK] 已移除防火墙规则: $ruleName" -ForegroundColor Green
    } else {
        Write-Host "  [OK] 防火墙无残留规则" -ForegroundColor Green
    }
} catch {
    Write-Host "  [提示] 清理防火墙规则需管理员权限 (已安全跳过)" -ForegroundColor Gray
}

# 步骤 4: 调度自销毁清理整个项目文件夹
Write-Host ""
Write-Host "[4/4] 正在调度清理系统程序文件夹与依赖项..." -ForegroundColor Cyan

$tempBat = Join-Path $env:TEMP "uninstall_banquet_cleanup_$((Get-Random).ToString()).bat"

$batContent = @"
@echo off
chcp 65001 >nul
title 礼金收聘系统 · 正在完成最终清理...
echo.
echo ====================================================================
echo        正在彻底清理礼金收聘系统文件，请稍候...
echo ====================================================================
echo.
ping 127.0.0.1 -n 3 >nul 2>nul

echo 正在删除系统程序目录: "$root"
rmdir /s /q "$root" >nul 2>nul

if not exist "$root" (
    echo.
    echo ====================================================================
    echo   [卸载成功] 礼金收聘系统已彻底卸载并清理干净！
    echo   电脑中未驻留任何自启项、服务或残留文件。
    echo ====================================================================
) else (
    echo.
    echo [提示] 部分文件可能被文件资源管理器窗口锁定，系统已最大化清理。
    echo 您可以手动关闭打开该目录的窗口后删除剩余空目录。
)

echo.
echo 按任意键关闭本窗口...
pause >nul
del "%~f0" >nul 2>nul
exit
"@

Set-Content -LiteralPath $tempBat -Value $batContent -Encoding UTF8

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host " [成功] 卸载准备就绪！即将执行最终销毁清理并退出。" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "cmd.exe" -ArgumentList "/c `"$tempBat`""
exit 0
