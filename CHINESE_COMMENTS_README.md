# 数据库字段中文注释迁移指南

## 概述

本文档说明如何为TRON能量租赁系统的数据库表字段添加中文注释，提升数据库的可读性和维护性。

## 迁移文件

### 主要迁移文件
- `migrations/005_add_chinese_comments.sql` - 包含所有表字段的中文注释

### 执行脚本
- `scripts/apply-chinese-comments.sh` - Bash脚本（推荐Linux/Mac用户）
- `scripts/apply-chinese-comments.ts` - TypeScript脚本（推荐Node.js用户）

## 支持的数据库表

| 表名 | 中文名称 | 字段数量 | 说明 |
|------|----------|----------|------|
| `users` | 用户信息表 | 22 | 存储用户基本信息、认证信息和业务数据 |
| `energy_packages` | 能量包配置表 | 9 | 定义可购买的能量套餐规格和价格 |
| `bots` | Telegram机器人配置表 | 12 | 管理系统的机器人实例和配置 |
| `orders` | 订单信息表 | 20 | 记录所有能量租赁订单的完整生命周期 |
| `agents` | 代理用户表 | 12 | 管理系统的代理用户信息和收益统计 |
| `agent_applications` | 代理申请表 | 11 | 记录用户申请成为代理的详细信息 |
| `agent_earnings` | 代理收益记录表 | 11 | 记录代理从订单中获得的佣金明细 |
| `bot_users` | 机器人用户关联表 | 10 | 管理用户与机器人的交互关系和个性化设置 |
| `energy_pools` | 能量池管理表 | 12 | 管理系统的能量资源分配和状态 |
| `energy_transactions` | 能量交易记录表 | 12 | 记录所有能量委托交易的区块链信息 |
| `price_configs` | 价格配置表 | 14 | 管理不同机器人的灵活定价策略 |
| `price_templates` | 价格模板表 | 8 | 提供可复用的标准化定价策略模板 |
| `price_history` | 价格变更历史表 | 7 | 追踪价格配置的变更历史和原因 |
| `system_configs` | 系统配置表 | 15 | 集中管理系统参数、功能开关和业务规则 |
| `system_config_history` | 系统配置变更历史表 | 7 | 记录配置变更的审计轨迹 |

## 执行方法

### 方法1：使用Bash脚本（推荐）

```bash
# 设置环境变量（可选，有默认值）
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=tron_energy_rental
export DB_USER=postgres
export DB_PASSWORD=your_password

# 执行脚本
chmod +x scripts/apply-chinese-comments.sh
./scripts/apply-chinese-comments.sh
```

### 方法2：使用TypeScript脚本

```bash
# 安装依赖（如果还没安装）
npm install

# 执行脚本
npx ts-node scripts/apply-chinese-comments.ts
```

### 方法3：直接使用psql

```bash
# 直接执行SQL文件
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d tron_energy_rental -f migrations/005_add_chinese_comments.sql
```

## 环境变量配置

脚本会自动检测以下环境变量，如果未设置则使用默认值：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DB_HOST` | `localhost` | 数据库主机地址 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_NAME` | `tron_energy_rental` | 数据库名称 |
| `DB_USER` | `postgres` | 数据库用户名 |
| `DB_PASSWORD` | `postgres` | 数据库密码 |

## 注释内容示例

### 表级别注释
```sql
COMMENT ON TABLE users IS '用户信息表 - 存储系统所有用户的基本信息、认证信息和业务数据';
```

### 字段级别注释
```sql
COMMENT ON COLUMN users.id IS '用户唯一标识符（UUID）';
COMMENT ON COLUMN users.role IS '用户角色：user=普通用户，agent=代理用户，admin=管理员';
COMMENT ON COLUMN users.status IS '用户状态：active=活跃，inactive=非活跃，banned=已封禁';
```

## 验证结果

执行完成后，可以通过以下SQL查询验证注释是否添加成功：

```sql
-- 查看表注释
SELECT 
    schemaname,
    tablename,
    obj_description((schemaname||'.'||tablename)::regclass) as table_comment
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 查看字段注释
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    col_description((t.table_schema||'.'||t.table_name)::regclass, c.ordinal_position) as column_comment
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;
```

## 注意事项

1. **权限要求**：执行脚本的用户需要有对数据库的COMMENT权限
2. **备份建议**：执行前建议备份数据库
3. **错误处理**：脚本会自动跳过已存在的注释，不会重复添加
4. **回滚**：如果需要移除注释，可以手动执行相应的DROP COMMENT语句

## 故障排除

### 常见错误

1. **权限不足**
   ```
   ERROR: permission denied for table users
   ```
   解决：确保用户有足够的权限

2. **连接失败**
   ```
   ERROR: connection to server at "localhost" (127.0.0.1), port 5432 failed
   ```
   解决：检查数据库服务是否运行，连接参数是否正确

3. **表不存在**
   ```
   ERROR: relation "table_name" does not exist
   ```
   解决：确保数据库表已经创建

### 获取帮助

如果遇到问题，可以：
1. 检查数据库连接配置
2. 查看脚本执行日志
3. 手动执行单个SQL语句进行测试
4. 检查数据库用户权限

## 更新日志

- **v1.0.0** (2024-01-16) - 初始版本，为所有15个表添加中文注释
- 覆盖了总计约200个字段的详细注释
- 包含表级别和字段级别的完整说明
- 提供了多种执行方式的选择

## 联系信息

如有问题或建议，请联系开发团队。
