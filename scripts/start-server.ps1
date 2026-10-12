# ==============================================================================
# Banquet Gift Cashier - Start Server Daemon Silently with Fast Readiness Probe
# ==============================================================================

$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$running = Get-NetTCPConnection -LocalPort 8089 -State Listen -ErrorAction SilentlyContinue
if (-not $running) {
    Start-Process -FilePath "node.exe" -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 100
        $ready = Get-NetTCPConnection -LocalPort 8089 -State Listen -ErrorAction SilentlyContinue
        if ($ready) { break }
    }
}
