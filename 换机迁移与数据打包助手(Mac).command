#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "正在将 data 数据目录打包到桌面..."
zipName="礼金账本全量数据备份_$(date '+%Y%m%d_%H%M%S').zip"
zip -r "$HOME/Desktop/$zipName" data/

echo ""
echo "🎉 备份完成！备份文件已存放在桌面：$zipName"
