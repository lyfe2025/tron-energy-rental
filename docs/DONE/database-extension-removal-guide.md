# UUID扩展依赖移除指南

## 🎯 概述

本项目已从依赖 `uuid-ossp` 扩展迁移到使用 PostgreSQL 内置的 `gen_random_uuid()` 函数，以简化部署流程并减少外部依赖。

## 📋 变更摘要

### ✅ 优势
- **简化部署**：无需安装额外的PostgreSQL扩展
- **减少依赖**：避免扩展版本兼容性问题
- **提升性能**：使用内置函数，性能更优
- **降低复杂度**：减少数据库管理开销
- **提高稳定性**：内置函数更稳定可靠

### 📋 变更内容
- 将 12 个表的 `uuid_generate_v4()` 替换为 `gen_random_uuid()`
- 移除对 `uuid-ossp` 扩展的依赖
- 更新部署文档和脚本

## 🔧 系统要求

### 新要求
- **PostgreSQL 版本**: 13.0 或更高版本
- **原因**: `gen_random_uuid()` 函数从 PostgreSQL 13 开始内置支持

### 版本检查
```sql
SELECT version();
-- 确保版本为 PostgreSQL 13.x 或更高
```

## 🚀 部署指南

### 新部署（推荐）
对于全新的部署环境：

1. **确保 PostgreSQL 版本**
   ```bash
   # 检查版本
   psql --version
   # 确保版本 >= 13.0
   ```

2. **无需安装扩展**
   ```sql
   -- 新部署不需要执行这些命令
   -- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- ❌ 不再需要
   ```

3. **直接使用内置函数**
   ```sql
   -- 创建表时直接使用 gen_random_uuid()
   CREATE TABLE example_table (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       name varchar(255) NOT NULL
   );
   ```

### 现有环境迁移

#### 步骤 1: 数据库备份
```bash
# 执行迁移前务必备份
cd /Volumes/wwx/dev/TronResourceDev/tron-energy-rental
./project.sh
# 选择：数据库管理 > 创建新备份
```

#### 步骤 2: 执行迁移脚本
```bash
# 使用自动化脚本
./scripts/database/remove-uuid-extension.sh

# 或手动执行 SQL 迁移
psql -d tron_energy_rental -f migrations/20250923_remove_uuid_ossp_extension.sql
```

#### 步骤 3: 验证迁移
```sql
-- 检查是否还有使用旧函数的字段
SELECT table_name, column_name, column_default 
FROM information_schema.columns 
WHERE column_default LIKE '%uuid_generate_v4%' 
AND table_schema = 'public';

-- 应该返回 0 行

-- 测试新函数
SELECT gen_random_uuid();
-- 应该成功生成 UUID
```

#### 步骤 4: 移除扩展（可选）
```sql
-- 确认所有字段已迁移后执行
DROP EXTENSION IF EXISTS "uuid-ossp";
```

## 📊 受影响的表

以下 12 个表的 `id` 字段已从 `uuid_generate_v4()` 迁移到 `gen_random_uuid()`：

| 表名 | 字段 | 变更前 | 变更后 |
|------|------|--------|--------|
| agent_applications | id | uuid_generate_v4() | gen_random_uuid() |
| agent_earnings | id | uuid_generate_v4() | gen_random_uuid() |
| agents | id | uuid_generate_v4() | gen_random_uuid() |
| energy_pools | id | uuid_generate_v4() | gen_random_uuid() |
| orders | id | uuid_generate_v4() | gen_random_uuid() |
| system_configs | id | uuid_generate_v4() | gen_random_uuid() |
| telegram_bot_notification_configs | id | uuid_generate_v4() | gen_random_uuid() |
| telegram_message_templates | id | uuid_generate_v4() | gen_random_uuid() |
| telegram_notification_analytics | id | uuid_generate_v4() | gen_random_uuid() |
| telegram_notification_logs | id | uuid_generate_v4() | gen_random_uuid() |
| user_notification_preferences | id | uuid_generate_v4() | gen_random_uuid() |
| users | id | uuid_generate_v4() | gen_random_uuid() |

## 🔍 验证清单

### 迁移前检查
- [ ] 确认 PostgreSQL 版本 >= 13.0
- [ ] 创建完整数据库备份
- [ ] 在测试环境先行验证
- [ ] 确认应用代码无直接调用 uuid_generate_v4()

### 迁移后验证
- [ ] 所有表字段使用 gen_random_uuid()
- [ ] UUID 生成功能正常
- [ ] 应用程序正常运行
- [ ] 新记录插入正常
- [ ] 无扩展依赖残留

## 🛠️ 故障排除

### 常见问题

#### Q1: PostgreSQL 版本过低
**错误**: `function gen_random_uuid() does not exist`
**解决**: 升级 PostgreSQL 到 13+ 版本

#### Q2: 迁移后 UUID 格式不同
**说明**: `gen_random_uuid()` 生成的 UUID 与 `uuid_generate_v4()` 格式完全兼容，都是 UUID v4 格式

#### Q3: 应用程序报错
**检查**: 确认应用代码中没有直接调用 `uuid_generate_v4()` 函数

### 回滚方案

如果需要回滚到使用扩展：

```sql
-- 1. 重新安装扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 恢复字段默认值（示例）
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 3. 重复其他表的操作
```

## 📝 部署更新

### Docker 部署
```dockerfile
# Dockerfile 中无需安装 uuid-ossp 扩展
# 只需确保 PostgreSQL >= 13

FROM postgres:14
# 无需额外的扩展安装步骤
```

### 部署脚本更新
```bash
# 部署脚本中移除扩展安装命令
# 旧代码（删除）:
# psql -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 新代码：无需扩展安装
psql -c "SELECT gen_random_uuid();" # 测试内置函数
```

## 📚 参考资料

- [PostgreSQL gen_random_uuid() 文档](https://www.postgresql.org/docs/13/functions-uuid.html)
- [PostgreSQL 13 发布说明](https://www.postgresql.org/docs/13/release-13.html)
- [UUID v4 标准规范](https://tools.ietf.org/html/rfc4122)

## 📅 时间线

- **2025-09-23**: 创建迁移脚本和工具
- **计划**: 在测试环境验证
- **计划**: 生产环境迁移
- **目标**: 新部署无扩展依赖

---

> **注意**: 此变更向后兼容，现有数据不会受到影响。只影响新插入记录的 UUID 生成方式。
