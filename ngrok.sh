#!/bin/bash

# 快捷启动 ngrok 管理工具
# 使用方法: ./ngrok.sh

cd "$(dirname "$0")"
exec scripts/development/ngrok-manager.sh "$@"
