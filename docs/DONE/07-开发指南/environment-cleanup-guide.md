# 环境变量清理指南

## 概述

本指南用于帮助开发者在配置管理迁移完成后，清理不再需要的环境变量，确保系统配置的一致性和安全性。

## 迁移前后对比

### 迁移前（环境变量配置）

以下环境变量已迁移到数据库管理，不再从 `.env` 文件读取：

#### Telegram机器人配置
```bash
# 这些变量已迁移到 telegram_bots 表
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_URL=your_webhook_url
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

#### TRON网络配置
```bash
# 这些变量已迁移到 tron_networks 表
TRON_NETWORK=mainnet
TRON_RPC_URL=https://api.trongrid.io
TRON_EXPLORER_URL=https://tronscan.org
TRON_CHAIN_ID=1
```

#### 系统配置
```bash
# 这些变量已迁移到 system_configs 表
ENABLE_EMAIL_NOTIFICATIONS=true
LOW_BALANCE_THRESHOLD=100
MAINTENANCE_MODE=false
MONTHLY_REPORT_ENABLED=true
```

### 迁移后（数据库配置）

配置现在存储在以下数据库表中：
- `telegram_bots` - Telegram机器人配置
- `tron_networks` - TRON网络配置
- `system_configs` - 系统配置
- `config_change_logs` - 配置变更日志
- `config_change_notifications` - 配置变更通知

## 保留的环境变量

以下环境变量仍需保留在 `.env` 文件中：

### 数据库连接
```bash
# 数据库配置（必须保留）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tron_energy_rental
DB_USER=postgres
DB_PASSWORD=postgres
```

### 应用基础配置
```bash
# 应用端口配置（必须保留）
PORT=3001
FRONTEND_PORT=3000

# JWT密钥（必须保留）
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 加密密钥（必须保留）
ENCRYPTION_KEY=your_32_character_encryption_key
```

### Redis配置
```bash
# Redis缓存配置（必须保留）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 邮件服务配置
```bash
# SMTP邮件配置（必须保留）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

### 开发环境配置
```bash
# 环境标识（必须保留）
NODE_ENV=development

# 日志级别（可选保留）
LOG_LEVEL=info
```

## 清理步骤

### 1. 备份当前配置

在清理前，请先备份当前的 `.env` 文件：

```bash
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. 验证迁移完成

确认配置已成功迁移到数据库：

```bash
# 检查数据库中的配置
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -c "
  SELECT 'telegram_bots' as table_name, count(*) as count FROM telegram_bots
  UNION ALL
  SELECT 'tron_networks', count(*) FROM tron_networks
  UNION ALL
  SELECT 'system_configs', count(*) FROM system_configs;
"
```

### 3. 创建新的 .env 文件

创建一个只包含必要环境变量的新 `.env` 文件：

```bash
# 复制模板
cp .env.example .env.clean

# 编辑新文件，只保留必要的环境变量
vim .env.clean
```

### 4. 测试新配置

使用新的环境变量文件测试系统：

```bash
# 使用新配置启动服务
mv .env .env.old
mv .env.clean .env

# 重启服务进行测试
npm run restart
```

### 5. 验证功能正常

测试关键功能：

```bash
# 测试API接口
curl -X GET http://localhost:3001/api/health

# 测试配置管理
curl -X GET http://localhost:3001/api/system-configs

# 测试机器人配置
curl -X GET http://localhost:3001/api/telegram-bots

# 测试TRON网络配置
curl -X GET http://localhost:3001/api/tron-networks
```

## 清理后的 .env 模板

```bash
# ===========================================
# TRON能量租赁系统 - 环境配置文件
# 配置管理迁移后的精简版本
# ===========================================

# 应用配置
NODE_ENV=development
PORT=3001
FRONTEND_PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tron_energy_rental
DB_USER=postgres
DB_PASSWORD=postgres

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 加密配置
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com

# 日志配置
LOG_LEVEL=info

# ===========================================
# 注意：以下配置已迁移到数据库管理
# - Telegram机器人配置 -> telegram_bots表
# - TRON网络配置 -> tron_networks表  
# - 系统配置 -> system_configs表
# ===========================================
```

## 回滚方案

如果迁移后出现问题，可以快速回滚：

```bash
# 停止服务
npm run stop

# 恢复原始配置
mv .env .env.migrated
mv .env.backup.YYYYMMDD_HHMMSS .env

# 重启服务
npm run restart
```

## 安全注意事项

1. **敏感信息保护**：确保备份文件中的敏感信息得到妥善保护
2. **权限控制**：`.env` 文件应设置适当的文件权限（600）
3. **版本控制**：确保 `.env` 文件不被提交到版本控制系统
4. **定期审查**：定期审查环境变量，移除不再使用的配置

## 故障排除

### 常见问题

1. **服务启动失败**
   - 检查数据库连接配置
   - 确认必要的环境变量已设置
   - 查看应用日志获取详细错误信息

2. **配置读取失败**
   - 验证数据库中的配置数据
   - 检查配置缓存是否正常工作
   - 确认配置表结构正确

3. **功能异常**
   - 对比迁移前后的配置值
   - 检查配置变更日志
   - 验证配置格式和数据类型

### 联系支持

如果遇到问题，请：
1. 收集错误日志和系统状态信息
2. 记录具体的操作步骤和错误现象
3. 联系技术支持团队获取帮助

---

**最后更新**: 2025年1月25日  
**版本**: 1.0  
**维护者**: TRON能量租赁系统开发团队