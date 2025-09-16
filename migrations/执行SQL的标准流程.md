# 📚 SQL 迁移执行标准流程

> ⚠️ **重要提醒**: 任何重要的数据库迁移操作前，都必须先执行备份！

## 🚀 执行流程

### 1️⃣ 检查当前迁移状态
```bash
npm run migrate:status
```
> 📝 查看哪些迁移已执行，哪些待执行

### 2️⃣ 🛡️ 执行数据库备份（必须！）
```bash
./scripts/database/backup-database.sh
```
> ⚠️ **强制要求**: 任何修改数据库结构的操作前必须备份

### 3️⃣ 创建迁移文件
```bash
# 使用标准命名格式
touch migrations/$(date +%Y%m%d)_descriptive_name.sql
```
> 📋 命名示例: `20250917_add_user_preferences_table.sql`

### 4️⃣ 编写迁移内容
```sql
-- 迁移文件模板
BEGIN;

-- 添加你的迁移逻辑
-- 示例：创建表
CREATE TABLE IF NOT EXISTS example_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 示例：添加列
ALTER TABLE existing_table 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);

-- 示例：创建索引
CREATE INDEX IF NOT EXISTS idx_example_name 
ON example_table(name);

COMMIT;
```

### 5️⃣ 确认迁移被识别
```bash
npm run migrate:status
```
> ✅ 确保新迁移文件出现在待执行列表中

### 6️⃣ 执行迁移
```bash
npm run migrate
```
> 🔄 执行所有待执行的迁移

### 7️⃣ 验证执行结果
```bash
npm run migrate:status
```
> ✅ 确认迁移已成功执行

### 8️⃣ 测试应用功能
```bash
# 重启服务进行测试
npm run restart

# 检查 TypeScript 错误
rm -rf node_modules/.cache && rm -rf dist && npm run check
```

## 🎯 核心原则

### 📏 命名规范
- **格式**: `YYYYMMDD_descriptive_name.sql`
- **示例**: `20250917_add_user_preferences_table.sql`
- **要求**: 描述性强，便于理解迁移目的

### 🔒 事务安全
```sql
BEGIN;
-- 所有迁移操作
COMMIT;
```
> 确保迁移原子性，要么全部成功，要么全部回滚

### 🔄 幂等性保证
```sql
-- 表创建
CREATE TABLE IF NOT EXISTS ...

-- 列添加
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...

-- 索引创建
CREATE INDEX IF NOT EXISTS ...

-- 数据插入
INSERT ... ON CONFLICT DO NOTHING;
```

### 🛡️ 安全措施
- ✅ **迁移前必须备份**: `./scripts/database/backup-database.sh`
- ✅ **使用事务包装**: `BEGIN; ... COMMIT;`
- ✅ **保持幂等性**: 重复执行不会出错
- ✅ **测试验证**: 迁移后测试应用功能

## 🚨 故障处理

### 迁移失败时
```bash
# 回滚最后一次迁移
npm run migrate:rollback

# 检查迁移状态
npm run migrate:status

# 从备份恢复（如果需要）
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental < backup_file.sql
```

### 常见问题
- **迁移卡住**: 检查是否有长时间运行的查询锁定表
- **权限错误**: 确保数据库用户有足够权限
- **语法错误**: 在测试环境先验证 SQL 语法

## 📝 最佳实践

1. **小步迁移**: 避免一次性大量修改
2. **向后兼容**: 尽量保持与旧版本兼容
3. **数据验证**: 迁移后验证数据完整性
4. **文档记录**: 在迁移文件中添加清晰的注释
5. **测试先行**: 在开发环境充分测试

## 🔗 相关命令

| 命令 | 说明 |
|------|------|
| `npm run migrate:status` | 查看迁移状态 |
| `npm run migrate` | 执行迁移 |
| `npm run migrate:rollback` | 回滚迁移 |
| `./scripts/database/backup-database.sh` | 数据库备份 |
| `npm run restart` | 重启服务 |
| `npm run check` | TypeScript 检查 |