# ==============================================================================
# 礼金收聘系统 · 账房云枢 - GitHub 远程仓库一键推送助手
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "     🏮 礼金收聘系统 · 账房云枢 - GitHub 远程推送助手          " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已初始化 git
if (-not (Test-Path -LiteralPath (Join-Path $root ".git"))) {
    Write-Host "[1/3] 检测到本地尚未建立 Git 仓库，正在初始化..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "  ✓ 本地 Git 仓库初始化完成 (默认主分支: main)" -ForegroundColor Green
    Write-Host ""
}

# 检查远程关联
$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "当前关联的远程仓库: $remoteUrl" -ForegroundColor Green
    Write-Host ""
} else {
    $defaultRepo = "https://github.com/6DPS/banquet-gift-cashier.git"
    Write-Host "未检测到关联的 GitHub 仓库。" -ForegroundColor Yellow
    Write-Host "💡 提示: 若您已在 GitHub 上创建了新仓库，可直接粘贴仓库地址；" -ForegroundColor Cyan
    Write-Host "        若未输入，直接按回车将默认关联至: $defaultRepo" -ForegroundColor Gray
    Write-Host ""
    $inputRepo = Read-Host "请输入您的 GitHub 仓库地址 [直接回车使用默认]"
    if (-not $inputRepo.Trim()) {
        $inputRepo = $defaultRepo
    }
    git remote add origin $inputRepo
    Write-Host "  ✓ 已成功绑定远程仓库: $inputRepo" -ForegroundColor Green
    Write-Host ""
}

# 提交改动
$changes = git status --porcelain
if ($changes) {
    Write-Host "[2/3] 检测到本地代码有改动，准备打包同步..." -ForegroundColor Yellow
    $nowStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "💡 提示: 您输入的文字将直接作为 GitHub Commit 说明显示在文件列表右侧。" -ForegroundColor Cyan
    $customMsg = Read-Host "请输入本次提交的功能说明 [直接回车默认: update: $nowStr 礼金系统功能更新]"
    if (-not $customMsg.Trim()) {
        $customMsg = "update: $nowStr 礼金系统功能更新"
    }
    git add .
    git commit -m "$customMsg"
    Write-Host "  ✓ 本地改动已提交: $customMsg" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[2/3] 本地代码已是最新提交状态，无需重复记录。" -ForegroundColor Green
    Write-Host ""
}

# 推送到云端
Write-Host "[3/3] 正在将代码推送到 GitHub 云端 (main 分支)..." -ForegroundColor Yellow
git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "       🎉 恭喜！礼金收聘系统全套工程已成功上传到 GitHub！        " -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "随时可在任何一台电脑上通过 git clone 极速部署使用！" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host " [提示] 推送遇到问题，常见原因与解决方法：" -ForegroundColor Yellow
    Write-Host " 1. GitHub 尚未创建该仓库：请登录 https://github.com/new 创建同名仓库" -ForegroundColor Gray
    Write-Host " 2. 网络波动无法直连：可稍后双击脚本重试推送" -ForegroundColor Gray
    Write-Host " 3. 需修改仓库地址：执行 'git remote set-url origin 新地址' 即可更换" -ForegroundColor Gray
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host ""
}
