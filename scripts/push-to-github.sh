#!/bin/bash
# ==============================================================================
# 礼金收聘系统 · 账房云枢 - GitHub 远程仓库推送助手 (Mac/Linux)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo ""
echo "==============================================================="
echo "     🏮 礼金收聘系统 · 账房云枢 - GitHub 远程推送助手 (Mac/Linux)"
echo "==============================================================="
echo ""

if [ ! -d ".git" ]; then
    echo "[1/3] 本地尚未初始化 Git 仓库，正在初始化..."
    git init
    git branch -M main
    echo "  ✓ Git 仓库初始化完成"
fi

remoteUrl=$(git remote get-url origin 2>/dev/null)
if [ -n "$remoteUrl" ]; then
    echo "当前关联的远程仓库: $remoteUrl"
else
    defaultRepo="https://github.com/6DPS/banquet-gift-cashier.git"
    echo "未检测到关联的 GitHub 仓库。"
    read -p "请输入 GitHub 仓库地址 (直接回车默认: $defaultRepo): " inputRepo
    if [ -z "$inputRepo" ]; then
        inputRepo="$defaultRepo"
    fi
    git remote add origin "$inputRepo"
    echo "  ✓ 已关联远程仓库: $inputRepo"
fi

changes=$(git status --porcelain)
if [ -n "$changes" ]; then
    echo ""
    echo "[2/3] 检测到本地改动，准备打包同步..."
    read -p "请输入本次提交的功能说明 (直接回车使用默认说明): " customMsg
    if [ -z "$customMsg" ]; then
        customMsg="update: $(date '+%Y-%m-%d %H:%M:%S') 礼金系统功能更新"
    fi
    git add .
    git commit -m "$customMsg"
    echo "  ✓ 本地改动已提交: $customMsg"
else
    echo ""
    echo "[2/3] 本地代码已是最新提交状态。"
fi

echo ""
echo "[3/3] 正在将代码推送到 GitHub (main 分支)..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "==============================================================="
    echo "       🎉 恭喜！礼金收聘系统已成功上传到 GitHub 云端！           "
    echo "==============================================================="
    echo ""
else
    echo ""
    echo "[提示] 推送遇到问题，请检查网络或确认 GitHub 仓库已创建。"
    echo ""
fi
