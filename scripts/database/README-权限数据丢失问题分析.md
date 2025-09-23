# 权限数据丢失问题分析和解决方案

## 问题描述

登录后台后看不到菜单，发现 `role_permissions` 表数据为空，导致所有角色都无法获取菜单权限。

## 根本原因

**罪魁祸首：`scripts/sync-menus.ts` 脚本**

该脚本在执行菜单同步时会：
1. **删除所有权限数据**（第359行）：`DELETE FROM role_permissions`
2. **只恢复超级管理员权限**：只为 `super_admin` 角色重新分配权限
3. **其他角色权限丢失**：系统管理员、部门管理员、普通管理员、操作员的权限都没有恢复

## 影响范围

- ✅ 超级管理员：权限正常（脚本会自动恢复）
- ❌ 其他所有角色：无法查看任何菜单

## 解决方案

### 1. 立即修复（已完成）

执行权限恢复脚本：
```bash
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -f scripts/database/restore-role-permissions.sql
```

### 2. 预防措施（已完成）

**修复 `scripts/sync-menus.ts` 脚本：**

- ✅ 添加了安全警告和确认机制
- ✅ 将 `assignPermissionsToSuperAdmin()` 改为 `restoreAllRolePermissions()`
- ✅ 现在会自动恢复所有角色的权限
- ✅ 添加权限恢复验证

### 3. 验证工具（已创建）

**检查权限状态：**
```bash
psql -f scripts/database/verify-role-permissions.sql
```

## 现有脚本说明

| 脚本文件 | 功能 | 安全性 |
|---------|------|--------|
| `restore-role-permissions.sql` | 恢复所有角色权限 | ✅ 安全 |
| `verify-role-permissions.sql` | 验证权限配置 | ✅ 安全（只读） |
| `sync-menus.ts` | 菜单同步（已修复） | ⚠️ 危险（会清空数据） |

## 权限分配策略

### 超级管理员（super_admin）
- 拥有所有 32 个菜单权限
- 完整的系统管理权限

### 系统管理员（system_admin）
- 拥有 31 个菜单权限
- 排除部分敏感配置（如系统设置）

### 部门管理员（dept_admin）
- 拥有 27 个菜单权限
- 主要业务管理权限

### 普通管理员（admin）
- 拥有 17 个菜单权限
- 基本管理操作权限

### 操作员（operator）
- 拥有 10 个菜单权限
- 基本查看和操作权限

## 最佳实践

### 1. 数据库操作前备份
```bash
# 使用项目备份脚本
./scripts/database/backup-database.sh

# 或使用项目管理脚本
./project.sh
# 选择: 7) 数据库管理 -> 1) 备份数据库
```

### 2. 权限修改后验证
```bash
# 验证权限配置
psql -f scripts/database/verify-role-permissions.sql
```

### 3. 测试环境先验证
在生产环境执行任何菜单/权限相关脚本前，先在开发环境测试。

## 经验教训

1. **危险操作必须加确认**：已为 `sync-menus.ts` 添加确认机制
2. **完整恢复而不是部分恢复**：不能只恢复超级管理员权限
3. **操作前备份**：重要数据操作前必须备份
4. **充分测试**：脚本要在测试环境充分验证

## 监控和预防

建议定期检查权限状态：
```bash
# 每周执行一次权限状态检查
psql -f scripts/database/verify-role-permissions.sql
```

如果发现权限异常，立即执行恢复脚本：
```bash
psql -f scripts/database/restore-role-permissions.sql
```
