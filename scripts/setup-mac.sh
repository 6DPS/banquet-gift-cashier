#!/bin/bash
# ==============================================================================
# 礼金收聘系统 · 账房云枢 - Mac/Linux 一键部署向导
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo ""
echo "==============================================================="
echo "      🏮 礼金收聘系统 · 账房云枢 - Mac/Linux 一键部署向导        "
echo "==============================================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js (推荐 v18+):"
    echo "  Mac 用户可通过 Homebrew 安装: brew install node"
    echo "  或直接访问官网下载安装包: https://nodejs.org"
    exit 1
else
    echo "✓ 已检测到 Node.js: $(node -v)"
fi

echo ""
echo "正在安装系统运行依赖..."
npm install --registry=https://registry.npmmirror.com

echo ""
echo "==============================================================="
echo "       🎉 部署完成！正在为您启动礼金收聘系统...                 "
echo "==============================================================="
echo ""

open "http://localhost:8089" 2>/dev/null || xdg-open "http://localhost:8089" 2>/dev/null || true
node server.js
