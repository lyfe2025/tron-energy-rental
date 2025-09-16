# 数据库迁移管理

本目录用于管理数据库结构变更和数据迁移。

## 📁 目录结构

```
migrations/
├── README.md                                    # 本使用说明
├── 20250917_baseline_database_backup.sql       # 基线数据库备份
└── [future migrations...]                      # 未来的迁移文件
```

## 📋 迁移系统概述

### 基线设置
- **基线时间**: 2025-09-17 07:09:53
- **基线文件**: `20250917_baseline_database_backup.sql`
- **基线说明**: 包含完整的数据库结构和数据，作为迁移系统的起始点

### 工作原理
1. `schema_migrations` 表记录所有已执行的迁移
2. 系统按文件名字母顺序执行迁移
3. 每个迁移只会执行一次
4. 支持安全的幂等操作（IF NOT EXISTS等）

## 🚀 使用指南

### 查看迁移状态
```bash
npm run migrate:status
```

### 执行待执行的迁移
```bash
npm run migrate
```

### 回滚最后一个迁移
```bash
npm run migrate:rollback
```

### 自动同步迁移记录（特殊情况）
```bash
npm run migrate:sync:dry    # 预览同步操作
npm run migrate:sync        # 执行同步操作
```

## 🔄 具体操作步骤指南

### 步骤1: 准备阶段

#### 1.1 检查当前状态
```bash
# 确认当前迁移状态
npm run migrate:status

# 检查数据库连接
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -c "SELECT version();"
```

#### 1.2 备份数据库（重要迁移前必须）
```bash
# 使用项目备份脚本
./scripts/database/backup-database.sh

# 或手动备份
pg_dump postgresql://postgres:postgres@localhost:5432/tron_energy_rental > "backup_$(date +%Y%m%d_%H%M%S).sql"
```

### 步骤2: 创建迁移文件

#### 2.1 确定文件名
```bash
# 获取当前日期，确保文件名唯一
echo "今天是: $(date +%Y%m%d)"

# 检查是否已有同日期的迁移文件
ls migrations/$(date +%Y%m%d)_*.sql 2>/dev/null || echo "无同日期文件"
```

#### 2.2 创建迁移文件
```bash
# 创建新的迁移文件（替换 description 为实际描述）
touch migrations/$(date +%Y%m%d)_description.sql

# 示例：
touch migrations/$(date +%Y%m%d)_add_user_settings.sql
```

#### 2.3 编写迁移内容
使用编辑器打开文件并按照模板编写：
```sql
-- 迁移描述：添加用户设置功能
-- 创建时间: 2025-09-17
-- 目的: 为用户表添加个性化设置功能

BEGIN;

-- 1. 创建用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id 
ON user_settings(user_id);

-- 3. 添加注释
COMMENT ON TABLE user_settings IS '用户个性化设置表';

COMMIT;
```

### 步骤3: 验证迁移文件

#### 3.1 语法检查
```bash
# 检查SQL语法（不执行）
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -f migrations/your_migration_file.sql \
  --dry-run 2>/dev/null || echo "语法检查完成"
```

#### 3.2 确认迁移被识别
```bash
# 确认新迁移文件被系统识别
npm run migrate:status

# 应该看到类似输出：
# ○ Pending your_migration_file.sql
```

### 步骤4: 执行迁移

#### 4.1 本地测试环境执行
```bash
# 执行迁移
npm run migrate

# 查看执行结果
npm run migrate:status
```

#### 4.2 验证执行结果
```bash
# 检查表是否创建成功
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "\d your_table_name"

# 检查数据是否正确
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "SELECT COUNT(*) FROM your_table_name;"

# 检查索引是否创建
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "\di+ your_index_name"
```

### 步骤5: 问题处理

#### 5.1 如果迁移失败
```bash
# 查看错误详情
npm run migrate 2>&1 | tee migration_error.log

# 检查迁移状态
npm run migrate:status

# 如果需要回滚
npm run migrate:rollback
```

#### 5.2 修复迁移文件
```bash
# 编辑迁移文件修复问题
nano migrations/your_migration_file.sql

# 如果已经记录在schema_migrations中，需要先删除记录
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "DELETE FROM schema_migrations WHERE filename = 'your_migration_file.sql';"

# 重新执行
npm run migrate
```

### 步骤6: 生产环境部署

#### 6.1 部署前检查清单
- [ ] 本地环境测试通过
- [ ] 备份已创建并验证
- [ ] 迁移文件已code review
- [ ] 确认维护窗口时间
- [ ] 准备回滚方案

#### 6.2 生产环境执行
```bash
# 1. 创建生产环境备份
./scripts/database/backup-database.sh

# 2. 检查当前状态
npm run migrate:status

# 3. 执行迁移
npm run migrate

# 4. 验证结果
npm run migrate:status

# 5. 功能测试
# 手动测试相关功能是否正常
```

#### 6.3 监控和验证
```bash
# 检查应用日志
tail -f logs/app-$(date +%Y-%m-%d).log

# 检查数据库性能
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 验证关键功能
npm run test  # 如果有自动化测试
```

### 步骤7: 完成和记录

#### 7.1 更新文档
```bash
# 如果迁移涉及API变更，更新相关文档
# 更新数据库设计文档
# 通知团队成员相关变更
```

#### 7.2 清理临时文件
```bash
# 清理备份文件（保留重要的）
ls -la backups/

# 清理日志文件
rm migration_error.log 2>/dev/null || true
```

## 📋 快速操作清单

### 日常迁移操作
```bash
# 1. 检查状态
npm run migrate:status

# 2. 备份（重要迁移）
./scripts/database/backup-database.sh

# 3. 创建迁移文件
touch migrations/$(date +%Y%m%d)_description.sql

# 4. 编写迁移内容
# （使用编辑器编辑文件）

# 5. 执行迁移
npm run migrate

# 6. 验证结果
npm run migrate:status
```

### 紧急回滚操作
```bash
# 1. 立即回滚最后一个迁移
npm run migrate:rollback

# 2. 检查状态
npm run migrate:status

# 3. 如果需要完全恢复
# 使用备份文件恢复数据库
```

### 错误排查步骤
```bash
# 1. 查看详细错误
npm run migrate 2>&1 | tee debug.log

# 2. 检查迁移表状态
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "SELECT * FROM schema_migrations ORDER BY executed_at DESC LIMIT 5;"

# 3. 检查数据库连接
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "SELECT current_database(), current_user, version();"

# 4. 验证文件语法
cat migrations/your_file.sql | head -20
```

## 📝 迁移文件命名规范

### 命名格式
```
YYYYMMDD_description.sql
```

### 命名示例
- `20250917_add_user_preferences.sql`
- `20250918_create_notification_system.sql`
- `20250919_update_price_config_structure.sql`
- `20250920_add_indexes_for_performance.sql`

### 命名要求
- ✅ **日期前缀**: 使用 YYYYMMDD 格式确保执行顺序
- ✅ **描述性**: 简洁明了地描述变更内容
- ✅ **小写字母**: 使用小写字母和下划线
- ✅ **英文描述**: 使用英文描述，避免特殊字符

## 🔨 迁移文件编写规范

### 文件结构模板
```sql
-- 迁移描述
-- 创建时间: YYYY-MM-DD
-- 目的: 简要说明此迁移的目的

BEGIN;

-- 1. 结构变更
-- CREATE TABLE, ALTER TABLE, CREATE INDEX 等

-- 2. 数据变更
-- INSERT, UPDATE (谨慎使用)

-- 3. 权限设置
-- GRANT, REVOKE (如需要)

COMMIT;
```

### 最佳实践

#### ✅ 推荐做法
```sql
-- 使用IF NOT EXISTS确保幂等性
CREATE TABLE IF NOT EXISTS new_table (...);

-- 安全的列添加
ALTER TABLE existing_table 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);

-- 安全的索引创建
CREATE INDEX IF NOT EXISTS idx_table_column 
ON table_name (column_name);

-- 安全的数据插入
INSERT INTO table_name (col1, col2) 
VALUES ('val1', 'val2')
ON CONFLICT (unique_col) DO NOTHING;
```

#### ❌ 避免的操作
```sql
-- 避免不可逆的删除操作
DROP TABLE table_name;           -- 危险
DROP COLUMN column_name;         -- 危险

-- 避免大批量数据修改
UPDATE large_table SET ...;     -- 可能导致锁表

-- 避免硬编码的数据
INSERT INTO ... VALUES (1, 'hardcoded'); -- 不灵活
```

## 🛡️ 安全措施

### 备份策略
- 执行重要迁移前，建议先备份数据库
- 使用项目提供的备份脚本：`./scripts/database/backup-database.sh`

### 测试流程
1. **本地测试**: 在本地环境先测试迁移
2. **备份验证**: 确保备份文件完整性
3. **分步执行**: 复杂迁移拆分为多个小迁移
4. **回滚准备**: 准备回滚方案

### 事务使用
```sql
BEGIN;
-- 相关的变更放在同一个事务中
-- 确保原子性
COMMIT;
```

## 📊 常用操作示例

### 创建新表
```sql
-- 20250918_create_user_settings.sql
-- 创建用户设置表

BEGIN;

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id 
ON user_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_user_settings_key 
ON user_settings(setting_key);

-- 添加注释
COMMENT ON TABLE user_settings IS '用户个人设置表';
COMMENT ON COLUMN user_settings.setting_key IS '设置项键名';
COMMENT ON COLUMN user_settings.setting_value IS '设置项值';

COMMIT;
```

### 添加列
```sql
-- 20250919_add_user_avatar.sql
-- 为用户表添加头像字段

BEGIN;

-- 添加头像URL字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- 添加头像上传时间字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP WITH TIME ZONE;

-- 添加注释
COMMENT ON COLUMN users.avatar_url IS '用户头像URL';
COMMENT ON COLUMN users.avatar_updated_at IS '头像最后更新时间';

COMMIT;
```

### 创建索引
```sql
-- 20250920_add_performance_indexes.sql
-- 添加性能优化索引

BEGIN;

-- 为查询优化添加复合索引
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created 
ON orders(user_id, status, created_at DESC);

-- 为文本搜索添加索引
CREATE INDEX IF NOT EXISTS idx_users_username_lower 
ON users(LOWER(username));

-- 为时间范围查询添加索引
CREATE INDEX IF NOT EXISTS idx_energy_pools_expires_status 
ON energy_pools(expires_at, status) 
WHERE status = 'active';

COMMIT;
```

## 🔧 故障排除

### 常见问题

#### 1. 迁移执行失败
```bash
# 查看具体错误信息
npm run migrate

# 检查迁移状态
npm run migrate:status

# 如果需要，回滚最后一个迁移
npm run migrate:rollback
```

#### 2. 迁移记录不同步
```bash
# 使用自动同步功能
npm run migrate:sync:dry    # 先预览
npm run migrate:sync        # 确认后执行
```

#### 3. 文件名冲突
- 确保使用正确的日期前缀
- 检查是否有重复的文件名
- 必要时调整文件名并更新数据库记录

## 📞 支持与维护

### 相关脚本位置
- 迁移执行脚本: `api/scripts/migrate.ts`
- 自动同步脚本: `api/scripts/sync-migrations.ts`
- 数据库备份脚本: `scripts/database/backup-database.sh`

### 包管理命令
```json
{
  "migrate": "tsx api/scripts/migrate.ts up",
  "migrate:status": "tsx api/scripts/migrate.ts status", 
  "migrate:rollback": "tsx api/scripts/migrate.ts rollback",
  "migrate:sync": "tsx api/scripts/sync-migrations.ts",
  "migrate:sync:dry": "tsx api/scripts/sync-migrations.ts --dry-run"
}
```

### 注意事项
- 生产环境迁移前务必备份
- 复杂迁移建议在维护窗口执行
- 保持迁移文件的简洁和可读性
- 定期清理不必要的测试迁移文件

## 🎯 完整流程演示

### 刚才我们演示的完整流程：

```bash
# 步骤1: 获取当前日期
echo "今天是: $(date +%Y%m%d)"
# 输出: 今天是: 20250917

# 步骤2: 检查已有文件
ls migrations/$(date +%Y%m%d)_*.sql 2>/dev/null || echo "无同日期文件"
# 输出: migrations/20250917_baseline_database_backup.sql

# 步骤3: 创建新迁移文件
touch migrations/20250917_demo_migration_process.sql

# 步骤4: 编写迁移内容（使用编辑器）
# 内容包含BEGIN/COMMIT事务，INSERT语句，COMMENT语句

# 步骤5: 检查迁移状态
npm run migrate:status
# 输出: ○ Pending 20250917_demo_migration_process.sql

# 步骤6: 执行迁移
npm run migrate
# 输出: ✓ Migration completed: 20250917_demo_migration_process.sql

# 步骤7: 验证结果
npm run migrate:status
# 输出: ✓ Executed 20250917_demo_migration_process.sql

# 步骤8: 验证数据
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "SELECT config_key, config_value FROM system_configs WHERE config_key = 'demo_migration_executed';"
# 输出: demo_migration_executed | true

# 步骤9: 清理演示（生产环境不需要）
# 删除文件和记录
```

### 💡 关键要点总结：

1. **文件命名必须遵循**: `YYYYMMDD_description.sql`
2. **执行前务必检查状态**: `npm run migrate:status`
3. **重要迁移前要备份**: `./scripts/database/backup-database.sh`
4. **使用事务确保原子性**: `BEGIN; ... COMMIT;`
5. **执行后验证结果**: 检查状态和数据
6. **保持幂等性**: 使用 `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`

### 🚨 注意事项：

- **生产环境执行前必须先在测试环境验证**
- **重要迁移建议在维护窗口执行**
- **保留备份文件直到确认迁移稳定**
- **迁移失败时使用 `npm run migrate:rollback`**

---

**最后更新**: 2025-09-17  
**维护者**: AI Assistant  
**版本**: 1.0  
**演示完成**: ✅ 已验证完整流程
