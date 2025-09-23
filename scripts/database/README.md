# 数据库序列修复工具

## 问题描述
PostgreSQL自增序列可能会与表中实际数据不同步，导致"duplicate key value violates unique constraint"错误。

## 解决方案

### 1. 手动检查和修复
```bash
# 检查login_logs序列状态
./scripts/database/check-sequences.sh
```

### 2. 自动修复脚本
```bash
# 执行完整的序列修复（包含所有表）
./scripts/database/auto-fix-sequences.sh
```

### 3. 单表修复SQL
```sql
-- 修复login_logs表序列
SELECT setval('login_logs_id_seq', (SELECT MAX(id) FROM login_logs) + 1);

-- 检查修复结果
SELECT 
    last_value as sequence_value,
    (SELECT MAX(id) FROM login_logs) as max_table_id,
    last_value - (SELECT MAX(id) FROM login_logs) as safe_margin
FROM login_logs_id_seq;
```

## 预防措施

1. **定期检查**：建议每周运行一次 `check-sequences.sh`
2. **备份先行**：修复前始终先备份数据库
3. **监控日志**：注意应用日志中的重复键值错误

## 文件说明

- `check-sequences.sh` - 检查和修复login_logs序列的简单脚本
- `auto-fix-sequences.sh` - 自动检查所有表序列的完整脚本  
- `fix-sequence-sync.sql` - 手动执行的SQL修复脚本
- `backup-database.sh` - 数据库备份脚本（修复前必须执行）

## 应急处理

如果再次遇到序列问题：

1. 立即备份数据库
2. 运行检查脚本：`./scripts/database/check-sequences.sh`
3. 如果显示需要修复，脚本会自动修复
4. 测试应用功能是否恢复正常

## 技术原理

序列问题通常发生在：
- 直接插入指定ID值到表中
- 从备份恢复数据库后
- 手动修改表数据后

修复原理：
```sql
-- 设置序列值为表中最大ID + 1，确保下次插入不冲突
SELECT setval('序列名', (SELECT MAX(id) FROM 表名) + 1);
```

这个方法是**动态的**，不是写死的值，会根据表中实际数据自动计算正确的序列值。
