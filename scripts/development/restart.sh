#!/bin/bash

# 一键重启脚本 - 简化版
# 使用方法: ./restart.sh

echo "🔄 正在重启项目服务..."

# 停止现有服务
echo "⏹️  停止现有服务..."
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "dev:api" 2>/dev/null || true
pkill -f "dev:frontend" 2>/dev/null || true

# 等待进程完全停止
echo "⏳ 等待进程停止..."
sleep 3

# 重新启动服务
echo "🚀 启动服务..."
pnpm run dev

echo "✅ 重启完成！"
