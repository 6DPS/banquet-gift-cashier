# ==============================================================================
# Banquet Gift Cashier - Start Server Daemon Silently
# ==============================================================================

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$running = Get-NetTCPConnection -LocalPort 8089 -State Listen -ErrorAction SilentlyContinue
if (-not $running) {
    Start-Process -FilePath "node.exe" -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
}
