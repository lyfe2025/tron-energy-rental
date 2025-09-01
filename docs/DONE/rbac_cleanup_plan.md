# RBAC模块清理计划

## 问题分析

经过深度检查，发现数据库中存在两套RBAC权限管理系统：

### 1. 旧的RBAC系统（废弃）
- `admin_roles` 表：管理员角色表
- `admin_permissions` 表：管理员权限分配表
- 位置：`migrations/999_consolidated_schema.sql`
- 数据量：admin_roles(4条)，admin_permissions(4条)

### 2. 新的RBAC系统（当前使用）
- `roles` 表：角色表
- `role_permissions` 表：角色权限关联表
- `departments` 表：部门表
- `positions` 表：岗位表
- `menus` 表：菜单表
- `user_roles` 表：用户角色关联表
- `login_logs` 表：登录日志表
- `operation_logs` 表：操作日志表
- 位置：`migrations/create_rbac_tables.sql`
- 数据量：roles(5条)，role_permissions(49条)

## 代码检查结果

✅ **后端API代码**：未发现对废弃表的引用
✅ **前端代码**：未发现对废弃表的引用
✅ **当前系统**：完全使用新的RBAC系统

## 清理计划

### 阶段1：数据备份（已完成）
- ✅ 已执行数据库完整备份
- ✅ 备份文件：`backups/db_backup_tron_energy_rental_20250901_143620.sql`

### 阶段2：外键约束检查
需要检查是否有其他表引用废弃表：
```sql
-- 检查外键约束
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND (ccu.table_name = 'admin_roles' OR ccu.table_name = 'admin_permissions');
```

### 阶段3：安全删除废弃表
按照依赖关系顺序删除：
```sql
-- 1. 删除admin_permissions表（子表）
DROP TABLE IF EXISTS admin_permissions CASCADE;

-- 2. 删除admin_roles表（父表）
DROP TABLE IF EXISTS admin_roles CASCADE;
```

### 阶段4：清理迁移文件
需要更新 `migrations/999_consolidated_schema.sql`：
- 移除admin_roles和admin_permissions的表定义
- 移除相关的索引和约束
- 保持其他表结构不变

### 阶段5：验证系统功能
- 重启应用服务
- 测试管理员登录
- 测试权限管理功能
- 测试角色分配功能
- 验证审计日志功能

## 风险评估

### 低风险 ✅
- 废弃表未被任何代码引用
- 新RBAC系统功能完整
- 有完整数据备份

### 注意事项
- 删除前再次确认外键约束
- 保留备份文件至少30天
- 在测试环境先执行验证

## 执行时机建议

建议在系统维护窗口期执行，预计耗时：
- 外键检查：2分钟
- 表删除：1分钟
- 系统验证：10分钟
- 总计：15分钟

## 回滚计划

如果出现问题，可以通过以下方式回滚：
```bash
# 恢复数据库备份
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental < backups/db_backup_tron_energy_rental_20250901_143620.sql
```

---

**创建时间**：2025-01-09  
**创建人**：SOLO Coding  
**状态**：待执行