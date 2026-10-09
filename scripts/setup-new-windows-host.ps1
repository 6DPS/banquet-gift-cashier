# ==============================================================================
# 礼金收聘系统 · 账房云枢 - Windows 新电脑/现场小主机 一键部署向导
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "     🏮 礼金收聘系统 · 账房云枢 - Windows 新电脑一键部署向导     " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Node.js 运行环境
Write-Host "[1/4] 正在检查 Node.js 运行环境..." -ForegroundColor Green
$commonNodeDirs = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\nvm"
)
foreach ($dir in $commonNodeDirs) {
    if ((Test-Path -LiteralPath (Join-Path $dir "node.exe")) -and ($env:Path -notlike "*$dir*")) {
        $env:Path = "$dir;" + $env:Path
    }
}

$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "  未检测到 Node.js 环境，正在通过国内极速镜像源自动安装 Node.js LTS..." -ForegroundColor Cyan
    $msiPath = Join-Path $env:TEMP "node-v20.18.0-x64.msi"
    $mirrors = @(
        "https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-x64.msi",
        "https://mirrors.huaweicloud.com/nodejs/v20.18.0/node-v20.18.0-x64.msi"
    )
    $dlSuccess = $false
    foreach ($url in $mirrors) {
        try {
            Write-Host "  正在极速下载: $url ..." -ForegroundColor Gray
            $wc = New-Object System.Net.WebClient
            $wc.Headers.Add("User-Agent", "Mozilla/5.0")
            $wc.DownloadFile($url, $msiPath)
            if ((Test-Path -LiteralPath $msiPath) -and (Get-Item -LiteralPath $msiPath).Length -gt 15MB) {
                $dlSuccess = $true
                break
            }
        } catch {}
    }

    if ($dlSuccess) {
        Write-Host "  正在后台静默安装 Node.js..." -ForegroundColor Green
        Start-Process "msiexec.exe" -ArgumentList "/i `"$msiPath`" /passive /norestart" -Wait
        $env:Path = "C:\Program Files\nodejs;" + $env:Path
        Write-Host "  ✓ Node.js 安装成功！" -ForegroundColor Green
    } else {
        Write-Host "  [提示] 自动下载未成功，请前往官网手动下载安装: https://nodejs.org" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    $ver = & node -v
    Write-Host "  ✓ 已检测到 Node.js: $ver" -ForegroundColor Green
}

# 2. 安装项目依赖
Write-Host ""
Write-Host "[2/4] 正在检查并安装系统运行依赖..." -ForegroundColor Green
if (-not (Test-Path -LiteralPath (Join-Path $root "node_modules"))) {
    Write-Host "  首次部署，正在极速安装核心依赖 (SheetJS Excel 引擎、QR 模块)..." -ForegroundColor Cyan
    & npm install --registry=https://registry.npmmirror.com
} else {
    Write-Host "  ✓ 运行依赖已就绪。" -ForegroundColor Green
}

# 3. 配置 Windows 防火墙入站规则 (允许手机局域网扫码连入)
Write-Host ""
Write-Host "[3/4] 正在配置 Windows 防火墙 (保障手机扫码协同顺畅)..." -ForegroundColor Green
try {
    $ruleName = "礼金收聘系统-局域网协同端口8089"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $ruleName `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 8089 `
            -Action Allow `
            -Profile Any `
            -Description "允许手机通过局域网/热点连接礼金收聘台" `
            -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  ✓ 防火墙规则已添加：端口 8089 开放" -ForegroundColor Green
    } else {
        Write-Host "  ✓ 防火墙端口 8089 规则已配置" -ForegroundColor Green
    }
} catch {
    Write-Host "  [提示] 防火墙配置已跳过 (非管理员权限无需担心，本机依然可正常使用)" -ForegroundColor Gray
}

# 4. 创建桌面快捷方式
Write-Host ""
Write-Host "[4/4] 正在为当前用户创建桌面快捷方式..." -ForegroundColor Green
try {
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "礼金收聘系统 · 账房云枢.lnk"
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = Join-Path $root "启动礼金收聘系统.bat"
    $shortcut.WorkingDirectory = $root
    $shortcut.Description = "礼金收聘系统 · 账房云枢"
    $shortcut.Save()
    Write-Host "  ✓ 桌面快捷方式已生成: $shortcutPath" -ForegroundColor Green
} catch {
    Write-Host "  桌面快捷方式创建失败，可直接双击目录下的 '启动礼金收聘系统.bat' 启动" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "         🎉 新电脑部署完成！正在为您启动系统服务...              " -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 1
Start-Process (Join-Path $root "启动礼金收聘系统.bat")
