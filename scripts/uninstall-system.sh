#!/bin/bash
# ==============================================================================
# 礼金收聘系统 · 一键彻底卸载与环境清理向导 (Mac / Linux)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

echo ""
echo "==============================================================="
echo "         礼金收聘系统 · 一键彻底卸载与环境清理向导             "
echo "==============================================================="
echo ""
echo "【重要提示】此操作将从当前电脑中彻底移除本系统及所有运行数据。"
echo "系统运行路径: $ROOT_DIR"
echo ""
echo "请选择您的卸载方式："
echo "  [1] 彻底卸载系统，但在桌面备份一份最终礼金数据 (推荐)"
echo "  [2] 彻底卸载系统，不保留任何数据 (完全清理)"
echo "  [3] 取消退出 (不作任何改动)"
echo ""

read -r -p "请输入选项数字 [1, 2, 3] 后按回车: " choice

if [ "$choice" != "1" ] && [ "$choice" != "2" ]; then
    echo ""
    echo "[已取消] 卸载已中止，未对系统做任何改动。"
    exit 0
fi

read -r -p "【最终确认】您确定要彻底卸载礼金收聘系统吗？(输入 Y 确认，输入其他键取消): " confirm
if [ "$confirm" != "Y" ] && [ "$confirm" != "y" ]; then
    echo ""
    echo "[已取消] 卸载已中止，未做任何更改。"
    exit 0
fi

echo ""
echo "---------------- 开始执行一键彻底卸载 ----------------"

# 1. 备份数据
DB_FILE="$ROOT_DIR/data/lijin_database.json"
DESKTOP_DIR="$HOME/Desktop"

if [ "$choice" = "1" ] && [ -f "$DB_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$DESKTOP_DIR/礼金收聘系统_最终安全备份_$TIMESTAMP.json"
    cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null
    echo "[备份成功] 最终礼金数据已保存至桌面: $BACKUP_FILE"
fi

# 2. 终止后台进程
echo ""
echo "[1/3] 正在终止后台服务 (Port 8089)..."
PID=$(lsof -ti:8089 2>/dev/null)
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo "  [OK] 已终止占用端口 8089 的服务进程 (PID: $PID)"
else
    echo "  [OK] 端口 8089 未运行服务"
fi

# 3. 彻底删除系统目录
echo ""
echo "[2/3] 正在清理系统程序文件夹..."
TEMP_SCRIPT=$(mktemp /tmp/banquet_cleanup_XXXXXX.sh)
cat <<EOF > "$TEMP_SCRIPT"
#!/bin/bash
sleep 1
rm -rf "$ROOT_DIR"
echo ""
echo "===================================================================="
echo "  [卸载成功] 礼金收聘系统已彻底卸载并清理干净！无任何残留文件。"
echo "===================================================================="
echo ""
rm -f "\$0"
EOF

chmod +x "$TEMP_SCRIPT"
echo "[3/3] 正在完成最终自销毁与清理..."
nohup "$TEMP_SCRIPT" >/dev/null 2>&1 &
echo ""
echo "==============================================================="
echo "  [成功] 卸载已完成！本终端窗口即将关闭。"
echo "==============================================================="
sleep 1
exit 0
