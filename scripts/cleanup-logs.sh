#!/bin/bash

# 日志清理和重组脚本
# 将旧的混乱日志整理到新的分类结构中

LOG_DIR="/Volumes/wwx/dev/TronResourceDev/tron-energy-rental/logs"
cd "$LOG_DIR" || exit 1

echo "🗂️ 开始清理和重组日志文件..."

# 1. 清理无用的audit json文件
echo "📋 清理audit文件..."
rm -f .*.json

# 2. 将API相关日志移动到新目录
echo "🌐 整理API日志..."
mkdir -p api/access api/errors api/auth

# 移动API访问日志（保留最新的）
if [ -f "api-combined.log" ]; then
    mv "api-combined.log" "api/access/api-access-$(date +%Y-%m-%d).log"
fi

# 移动API错误日志（保留最新的）
if [ -f "api-error.log" ]; then
    mv "api-error.log" "api/errors/api-errors-$(date +%Y-%m-%d).log"
fi

# 删除重复的API日志文件
rm -f api-combined-*.log api-error-*.log api-out-*.log

# 3. 将系统日志移动到新目录
echo "🖥️ 整理系统日志..."
mkdir -p system/app

# 移动最新的app日志
if [ -f "app-2025-09-22.log" ]; then
    mv "app-2025-09-22.log" "system/app/app-2025-09-22.log"
fi

# 删除旧的app日志（保留最近3天）
find . -name "app-20*" -mtime +3 -delete
find . -name "app-error-20*" -mtime +3 -delete

# 4. 清理前端日志
echo "🎨 清理前端日志..."
rm -f frontend*.log

# 5. 清理临时文件
echo "🧹 清理临时文件..."
rm -f backend.log

# 6. 创建日志分类说明
cat > README.md << 'EOF'
# 日志分类说明

## 📁 目录结构

```
logs/
├── api/                    # API相关日志
│   ├── access/            # API访问日志
│   ├── errors/            # API错误日志
│   └── auth/              # 认证相关日志
├── system/                # 系统运行日志
│   ├── app/               # 应用启动配置日志
│   ├── database/          # 数据库操作日志
│   ├── cache/             # 缓存操作日志
│   └── scheduler/         # 定时任务日志
├── business/              # 业务功能日志
│   ├── orders/            # 订单处理日志
│   ├── payments/          # 支付相关日志
│   ├── transactions/      # 交易监控日志
│   └── energy/            # 能量池相关日志
├── security/              # 安全审计日志
│   ├── auth/              # 认证失败日志
│   └── audit/             # 审计日志
└── bots/                  # 机器人日志
    ├── MultiBotManager/   # 多机器人管理
    ├── TransactionMonitor/ # 交易监控机器人
    └── [bot-id]/          # 各个机器人实例
```

## 📊 日志保留策略

- **订单日志**: 30天 (关键业务数据)
- **支付日志**: 60天 (财务相关)  
- **API访问**: 14天 (访问统计)
- **API错误**: 30天 (问题排查)
- **系统日志**: 14天 (运行状态)
- **安全审计**: 365天 (合规要求)
- **机器人日志**: 7天 (运行状态)

## 🔍 查看日志

### 实时监控
```bash
# 订单处理实时日志
tail -f logs/business/orders/order-processing-*.log

# API错误实时监控  
tail -f logs/api/errors/api-errors-*.log

# 系统运行状态
tail -f logs/system/app/app-*.log
```

### 历史查询
```bash
# 查看某日期的订单处理
cat logs/business/orders/order-processing-2025-09-22.log

# 查看API访问统计
cat logs/api/access/api-access-*.log | grep "GET\|POST" | wc -l

# 查看认证失败记录
cat logs/security/auth/auth-failures-*.log
```
EOF

echo "✅ 日志清理完成！"
echo "📊 新的日志结构已创建，请查看 logs/README.md 了解详情"

# 显示清理后的目录结构
echo ""
echo "🗂️ 当前日志目录结构："
find logs/ -type d | sort
