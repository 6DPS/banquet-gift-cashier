# ==============================================================================
# 礼金收聘系统 · 账房云枢 - 换机迁移与数据打包助手
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "     🏮 礼金收聘系统 · 账房云枢 - 换机迁移与数据打包助手         " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

$dataDir = Join-Path $root "data"
if (-not (Test-Path -LiteralPath $dataDir)) {
    Write-Host "[错误] 未检测到 data 数据目录！" -ForegroundColor Red
    pause
    exit 1
}

$timeTag = Get-Date -Format "yyyyMMdd_HHmmss"
$desktop = [Environment]::GetFolderPath("Desktop")
$zipName = "礼金账本全量数据备份_$timeTag.zip"
$zipPath = Join-Path $desktop $zipName

Write-Host "正在将所有宴席历史记录与灾备快照压缩打包到桌面..." -ForegroundColor Yellow
Compress-Archive -Path $dataDir -DestinationPath $zipPath -Force

if (Test-Path -LiteralPath $zipPath) {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "       🎉 备份成功！全量数据包已生成在电脑桌面：                  " -ForegroundColor Green
    Write-Host "       $zipName" -ForegroundColor Yellow
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "💡 换机指南：" -ForegroundColor Cyan
    Write-Host "1. 将桌面的这个 ZIP 压缩包复制到 U 盘；" -ForegroundColor Gray
    Write-Host "2. 在新电脑上部署好系统后，解压并覆盖到新电脑的 data 文件夹；" -ForegroundColor Gray
    Write-Host "3. 启动新电脑系统，所有历史宴席与随礼记录无缝恢复！" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[错误] 压缩打包失败，请检查桌面写权限。" -ForegroundColor Red
}
