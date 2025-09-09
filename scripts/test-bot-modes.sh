#!/bin/bash

# 🎯 多机器人模式测试脚本
# 用于演示 Polling 和 Webhook 两种模式的差异

echo "🚀 多机器人模式对比测试开始..."
echo "=================================================="

# 设置API基础URL
API_BASE="http://localhost:3001/api"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取机器人状态
echo -e "${BLUE}📊 当前机器人状态：${NC}"
echo "=================================================="

# 获取所有机器人实例
BOTS_DATA=$(curl -s "$API_BASE/multi-bot/instances")

if [ $? -eq 0 ]; then
    echo "$BOTS_DATA" | jq -r '.data[] | "\(.config.botName) | \(.workMode) | \(.status) | @\(.config.botUsername)"' | while IFS='|' read -r name mode status username; do
        if [ "$mode" = " webhook " ]; then
            echo -e "🔗 ${GREEN}$name${NC} | ${YELLOW}WEBHOOK${NC} | $status |${BLUE}$username${NC}"
        else
            echo -e "🔄 ${GREEN}$name${NC} | ${YELLOW}POLLING${NC} | $status |${BLUE}$username${NC}"
        fi
    done
else
    echo -e "${RED}❌ 无法连接到API服务器${NC}"
    exit 1
fi

echo ""
echo "=================================================="

# 获取详细状态
echo -e "${BLUE}📈 系统状态概览：${NC}"
STATUS_DATA=$(curl -s "$API_BASE/multi-bot/status")
echo "$STATUS_DATA" | jq -r '.data | "总机器人数: \(.totalBots)\n运行中: \(.runningBots)\n错误数: \(.errorBots)"'

echo ""
echo "=================================================="

# 性能对比说明
echo -e "${BLUE}⚡ 性能对比分析：${NC}"
echo ""
echo -e "${YELLOW}🔄 Polling 模式特点：${NC}"
echo "  • 主动轮询获取消息"
echo "  • 平均延迟：500ms"
echo "  • 每日请求：86,400+ 次"
echo "  • 资源消耗：较高"
echo "  • 适用：开发环境"
echo ""
echo -e "${YELLOW}🔗 Webhook 模式特点：${NC}"
echo "  • 被动接收推送消息"
echo "  • 平均延迟：< 100ms"
echo "  • 每日请求：实际消息数"
echo "  • 资源消耗：极低"
echo "  • 适用：生产环境"

echo ""
echo "=================================================="

# 测试建议
echo -e "${BLUE}🧪 测试建议：${NC}"
echo ""
echo "1. 🔄 测试 Polling 模式机器人："
curl -s "$API_BASE/multi-bot/instances" | jq -r '.data[] | select(.workMode == "polling") | "   👉 向 @\(.config.botUsername) 发送 /help"' | head -2

echo ""
echo "2. 🔗 测试 Webhook 模式机器人："
curl -s "$API_BASE/multi-bot/instances" | jq -r '.data[] | select(.workMode == "webhook") | "   👉 向 @\(.config.botUsername) 发送 /help"' | head -2

echo ""
echo "=================================================="

# 实时监控选项
echo -e "${BLUE}📊 实时监控命令：${NC}"
echo ""
echo "• 查看实时状态："
echo "  watch -n 2 'curl -s $API_BASE/multi-bot/status | jq .data.summary'"
echo ""
echo "• 监控日志输出："
echo "  tail -f logs/backend.log | grep -E 'Telegram|Bot'"
echo ""
echo "• 测试特定机器人："
echo "  curl -s -X POST $API_BASE/multi-bot/{bot-id}/test"

echo ""
echo "=================================================="
echo -e "${GREEN}✅ 测试准备完成！现在可以向不同模式的机器人发送消息，体验差异。${NC}"
echo "=================================================="
