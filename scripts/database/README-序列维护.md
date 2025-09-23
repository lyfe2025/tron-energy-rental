# 数据库序列维护指南

## 问题说明

当出现 "duplicate key value violates unique constraint" 错误时，通常是因为序列值与表中实际的最大ID不同步导致的。

## 解决方案

### 1. 立即修复（针对特定表）

```bash
# 修复login_logs表的序列
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -c "SELECT setval('login_logs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM login_logs));"
```

### 2. 全面同步所有序列

```bash
# 运行通用序列同步脚本
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -f scripts/database/sync-sequences.sql
```

### 3. 检查序列状态

```bash
# 检查所有序列的当前状态
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -f scripts/database/check-sequences.sql
```

## 预防措施

1. **避免手动指定ID值**：在INSERT语句中不要指定自增ID字段的值
2. **数据恢复后同步序列**：从备份恢复数据后，务必运行序列同步脚本
3. **定期检查**：建议在系统维护时定期检查序列状态

## 常见的错误类型

- `duplicate key value violates unique constraint "xxx_pkey"`
- `duplicate key value violates unique constraint "xxx_id_seq"`

这些错误都可以通过同步序列来解决。

## 脚本说明

- `sync-sequences.sql`: 自动同步所有序列到正确值
- `check-sequences.sql`: 检查序列状态（仅查看，不修改）
- 本文档: 操作指南和预防措施
