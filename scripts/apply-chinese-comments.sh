#!/bin/bash

# 应用中文注释迁移脚本
# 为TRON能量租赁系统数据库的所有表字段添加中文注释

echo "🚀 开始为数据库表字段添加中文注释..."

# 检查环境变量
if [ -z "$DB_HOST" ]; then
    echo "⚠️  环境变量DB_HOST未设置，使用默认值localhost"
    export DB_HOST=localhost
fi

if [ -z "$DB_PORT" ]; then
    echo "⚠️  环境变量DB_PORT未设置，使用默认值5432"
    export DB_PORT=5432
fi

if [ -z "$DB_NAME" ]; then
    echo "⚠️  环境变量DB_NAME未设置，使用默认值tron_energy_rental"
    export DB_NAME=tron_energy_rental
fi

if [ -z "$DB_USER" ]; then
    echo "⚠️  环境变量DB_USER未设置，使用默认值postgres"
    export DB_USER=postgres
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  环境变量DB_PASSWORD未设置，使用默认值postgres"
    export DB_PASSWORD=postgres
fi

echo "📊 数据库连接信息："
echo "   主机: $DB_HOST"
echo "   端口: $DB_PORT"
echo "   数据库: $DB_NAME"
echo "   用户: $DB_USER"

# 检查迁移文件是否存在
MIGRATION_FILE="migrations/005_add_chinese_comments.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ 迁移文件 $MIGRATION_FILE 不存在！"
    exit 1
fi

echo "📁 找到迁移文件: $MIGRATION_FILE"

# 执行迁移
echo "🔄 正在执行数据库迁移..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE

if [ $? -eq 0 ]; then
    echo "✅ 中文注释迁移执行成功！"
    echo ""
    echo "📋 已添加注释的表："
    echo "   - users (用户信息表)"
    echo "   - energy_packages (能量包配置表)"
    echo "   - bots (Telegram机器人配置表)"
    echo "   - orders (订单信息表)"
    echo "   - agents (代理用户表)"
    echo "   - agent_applications (代理申请表)"
    echo "   - agent_earnings (代理收益记录表)"
    echo "   - bot_users (机器人用户关联表)"
    echo "   - energy_pools (能量池管理表)"
    echo "   - energy_transactions (能量交易记录表)"
    echo "   - price_configs (价格配置表)"
    echo "   - price_templates (价格模板表)"
    echo "   - price_history (价格变更历史表)"
    echo "   - system_configs (系统配置表)"
    echo "   - system_config_history (系统配置变更历史表)"
    echo ""
    echo "🎯 所有表字段现在都有了详细的中文注释，提升了数据库的可读性和维护性！"
else
    echo "❌ 迁移执行失败！请检查数据库连接和权限。"
    exit 1
fi
