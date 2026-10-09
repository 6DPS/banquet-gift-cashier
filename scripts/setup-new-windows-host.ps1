# ==============================================================================
# Banquet Gift Cashier - Setup New Host Wizard
# ==============================================================================

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "        Banquet Gift Cashier - Setup New Host Wizard           " -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking Node.js runtime environment..." -ForegroundColor Green
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
    Write-Host "  Node.js not found. Downloading Node.js LTS from npmmirror..." -ForegroundColor Cyan
    $msiPath = Join-Path $env:TEMP "node-v20.18.0-x64.msi"
    $url = "https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-x64.msi"
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0")
        $wc.DownloadFile($url, $msiPath)
        Start-Process "msiexec.exe" -ArgumentList "/i "$msiPath" /passive /norestart" -Wait
        $env:Path = "C:\Program Files\nodejs;" + $env:Path
        Write-Host "  [OK] Node.js installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Download failed. Please install Node.js manually from https://nodejs.org" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    $ver = & node -v
    Write-Host "  [OK] Node.js is ready: $ver" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/4] Installing npm dependencies..." -ForegroundColor Green
if (-not (Test-Path -LiteralPath (Join-Path $root "node_modules"))) {
    & npm install --registry=https://registry.npmmirror.com
} else {
    Write-Host "  [OK] Dependencies already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/4] Configuring Windows Firewall for Port 8089..." -ForegroundColor Green
try {
    $ruleName = "BanquetGiftCashier-Port8089"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 8089 -Action Allow -Profile Any -Description "Allow local devices to access Banquet Gift Cashier" -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  [OK] Firewall rule created for Port 8089" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Firewall rule already exists." -ForegroundColor Green
    }
} catch {
    Write-Host "  [Notice] Skipped firewall configuration (Administrator privileges required)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4/4] Creating Desktop Shortcut..." -ForegroundColor Green
try {
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "Banquet Gift Cashier.lnk"
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = Join-Path $root "start.bat"
    $shortcut.WorkingDirectory = $root
    $shortcut.Description = "Banquet Gift Cashier"
    $shortcut.Save()
    Write-Host "  [OK] Desktop shortcut created: $shortcutPath" -ForegroundColor Green
} catch {
    Write-Host "  Desktop shortcut creation skipped." -ForegroundColor Gray
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "       [SUCCESS] Setup complete! Starting application...       " -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 1
Start-Process (Join-Path $root "start.bat")