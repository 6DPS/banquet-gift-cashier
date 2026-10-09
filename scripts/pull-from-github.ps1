# ==============================================================================
# 礼金收聘系统 · 账房云枢 - 一键从 GitHub 同步最新代码
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "      🏮 礼金收聘系统 · 账房云枢 - 一键云端同步更新向导         " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] 正在拉取 GitHub 云端最新代码..." -ForegroundColor Green
git pull origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[2/2] 正在检查依赖完整性..." -ForegroundColor Green
    & npm install --registry=https://registry.npmmirror.com
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "         🎉 系统已成功更新至 GitHub 最新版本！                  " -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "请关闭正在运行的系统窗口，双击【启动礼金收聘系统.bat】重新加载新功能！" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[提示] 拉取代码遇到冲突或网络中断，请检查网络连接或稍后重试。" -ForegroundColor Red
    Write-Host ""
}
