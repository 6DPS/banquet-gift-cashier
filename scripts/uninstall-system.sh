#!/bin/bash
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

echo ""
echo "==============================================================="
echo "       Banquet Gift Cashier - Complete Uninstall Wizard        "
echo "==============================================================="
echo ""
echo "[WARNING] This wizard will completely remove this application from your PC."
echo "Application path: $ROOT_DIR"
echo ""
echo "Please select uninstallation mode:"
echo "  [1] Uninstall and BACKUP current ledger data to Desktop (Recommended)"
echo "  [2] Uninstall completely WITHOUT backup (Permanent cleanup)"
echo "  [3] Cancel and exit (Do nothing)"
echo ""

read -r -p "Enter your choice [1, 2, or 3] and press Enter: " choice

if [ "$choice" != "1" ] && [ "$choice" != "2" ]; then
    echo ""
    echo "[CANCELED] Uninstallation aborted. No changes were made."
    exit 0
fi

read -r -p "Are you sure you want to permanently uninstall? (Type Y to proceed): " confirm
if [ "$confirm" != "Y" ] && [ "$confirm" != "y" ]; then
    echo ""
    echo "[CANCELED] Uninstallation aborted. No changes were made."
    exit 0
fi

echo ""
echo "---------------- Starting Full System Uninstallation ----------------"

# 1. Backup data
DB_FILE="$ROOT_DIR/data/lijin_database.json"
DESKTOP_DIR="$HOME/Desktop"

if [ "$choice" = "1" ] && [ -f "$DB_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$DESKTOP_DIR/Banquet_Ledger_Final_Backup_$TIMESTAMP.json"
    cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null
    echo "[BACKUP OK] Ledger data saved to Desktop: $BACKUP_FILE"
fi

# 2. Kill service
echo ""
echo "[1/3] Stopping background service (Port 8089)..."
PID=$(lsof -ti:8089 2>/dev/null)
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo "  [OK] Terminated service PID: $PID"
else
    echo "  [OK] Port 8089 is free."
fi

# 3. Clean files
echo ""
echo "[2/3] Cleaning up application directory..."
TEMP_SCRIPT=$(mktemp /tmp/banquet_cleanup_XXXXXX.sh)
cat <<EOF > "$TEMP_SCRIPT"
#!/bin/bash
sleep 1
rm -rf "$ROOT_DIR"
echo ""
echo "===================================================================="
echo "  [SUCCESS] Banquet Gift Cashier has been completely uninstalled!"
echo "===================================================================="
echo ""
rm -f "\$0"
EOF

chmod +x "$TEMP_SCRIPT"
echo "[3/3] Completing final self-destruction..."
nohup "$TEMP_SCRIPT" >/dev/null 2>&1 &
echo ""
echo "==============================================================="
echo "  [SUCCESS] Uninstallation completed successfully!"
echo "==============================================================="
sleep 1
exit 0