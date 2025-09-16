# 迁移系统快速参考

## 🚀 常用命令

```bash
# 查看迁移状态
npm run migrate:status

# 执行所有待执行的迁移
npm run migrate

# 回滚最后一个迁移
npm run migrate:rollback

# 备份数据库
./scripts/database/backup-database.sh

# 创建新迁移文件
touch migrations/$(date +%Y%m%d)_description.sql
```

## 📋 操作流程

```
1. 检查状态 → 2. 备份 → 3. 创建文件 → 4. 编写内容 → 5. 执行迁移 → 6. 验证结果
```

## 🔧 迁移文件模板

```sql
-- 迁移描述：简要说明
-- 创建时间: YYYY-MM-DD
-- 目的: 详细目的

BEGIN;

-- SQL 语句
CREATE TABLE IF NOT EXISTS ...;
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...;
CREATE INDEX IF NOT EXISTS ...;

COMMIT;
```

## ⚠️ 重要提醒

- ✅ 文件命名：`YYYYMMDD_description.sql`
- ✅ 使用事务：`BEGIN; ... COMMIT;`
- ✅ 幂等操作：`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
- ⚠️ 重要迁移前先备份
- ⚠️ 生产环境前先在测试环境验证

## 🆘 紧急情况

```bash
# 迁移失败回滚
npm run migrate:rollback

# 查看错误详情
npm run migrate 2>&1 | tee error.log

# 检查数据库连接
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -c "SELECT version();"
```
