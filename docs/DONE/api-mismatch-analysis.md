# API路径不匹配分析报告

## 问题概述
前端调用的API路径与后端实际提供的路由存在严重不匹配，导致系统管理模块无法正常加载数据。

## 管理员角色模块 (AdminRoles) - 严重不匹配

### 前端期望的API (来自useAdminRoles.ts):
- ✅ `/api/system/admin-roles` (GET) - 后端已提供
- ❌ `/api/admin-roles/{adminId}/permissions` (GET) - 后端无此路由
- ❌ `/api/admin-roles/assign` (POST) - 后端无此路由
- ❌ `/admin-roles/remove` (DELETE) - 后端无此路由
- ❌ `/admin-roles/batch` (POST) - 后端无此路由
- ❌ `/admin-roles/stats` (GET) - 后端无此路由
- ❌ `/api/admin-roles/history` (GET) - 后端无此路由
- ❌ `/api/admin-roles/export` (GET) - 后端无此路由
- ❌ `/api/admin-roles/import` (POST) - 后端无此路由
- ❌ `/api/admin-roles/config` (GET/PUT) - 后端无此路由
- ❌ `/admin-roles/check-conflicts` (POST) - 后端无此路由
- ❌ `/api/admin-roles/approvals` (GET) - 后端无此路由
- ❌ `/api/admin-roles/approvals/process` (POST) - 后端无此路由

### 后端实际提供的API (来自admin-roles.ts):
- ✅ `GET /api/system/admin-roles` - 获取管理员角色列表
- ✅ `GET /api/system/admin-roles/admin/:adminId` - 获取特定管理员的角色
- ✅ `POST /api/system/admin-roles` - 分配角色给管理员
- ✅ `DELETE /api/system/admin-roles` - 移除管理员角色

### 数据结构不匹配:
- **前端期望**: AdminRoleInfo包含admin_id、username、email、roles等用户信息
- **后端返回**: 角色信息(id、name、code、type等)，不是用户信息

## 其他模块状态

### 部门管理 (Departments) - ✅ 匹配良好
- 前端调用: `/api/system/departments/*`
- 后端提供: `/api/system/departments/*`
- 数据结构: 匹配

### 岗位管理 (Positions) - ✅ 匹配良好
- 前端调用: `/api/system/positions/*`
- 后端提供: `/api/system/positions/*`
- 数据结构: 匹配

### 角色管理 (Roles) - ⚠️ 部分不匹配
- 大部分API匹配
- 缺少: `/api/system/roles/export`, `/api/system/roles/import`

### 菜单管理 (Menus) - ⚠️ 部分不匹配
- 大部分API匹配
- 缺少: `/api/system/menus/stats`, `/api/system/menus/batch`, `/api/system/menus/move`, `/api/system/menus/check-name`

## 解决方案建议

### 立即修复 (管理员角色模块)
1. 修正前端API调用路径，使用后端实际提供的路由
2. 调整前端数据结构期望，匹配后端返回格式
3. 移除或重新实现缺失的功能

### 中期完善
1. 为角色和菜单模块补充缺失的API接口
2. 统一API路径命名规范
3. 完善数据结构文档

## 影响评估
- **严重**: 管理员角色模块完全无法使用
- **中等**: 角色和菜单模块部分功能受限
- **轻微**: 部门和岗位模块工作正常