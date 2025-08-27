# Scripts 目录说明

此目录包含项目的各种实用脚本，采用模块化架构设计，便于维护和扩展。

## 🏗️ 模块化架构

### 核心模块 (v2.0)
- `core/utils.sh` - 通用工具函数和配置管理
- `core/service-manager.sh` - 服务管理模块 (启动/停止/重启)
- `core/log-manager.sh` - 日志管理模块 (查看/清理/统计)
- `core/database-manager.sh` - 数据库管理模块 (备份/恢复/验证)

### 架构优势
- ✅ 模块化设计，职责单一
- ✅ 代码复用，减少重复
- ✅ 易于测试和维护
- ✅ 便于功能扩展

## 📂 目录结构

```
scripts/
├── core/              # 核心模块 (被project.sh调用)
│   ├── utils.sh                 # 通用工具函数
│   ├── service-manager.sh       # 服务管理
│   ├── log-manager.sh          # 日志管理
│   └── database-manager.sh     # 数据库管理
├── database/          # 数据库独立脚本
│   ├── backup-database.sh      # 独立备份脚本
│   └── restore-database.sh     # 独立恢复脚本
├── development/       # 开发和测试工具
│   ├── dev-check.sh           # 开发环境检查
│   ├── api-check.sh           # API服务检查
│   ├── frontend-check.sh      # 前端服务检查
│   ├── quick-fix.sh           # 快速修复工具
│   ├── test_api.sh            # API测试脚本
│   └── test_api_updated.sh    # 更新的API测试
├── maintenance/       # 代码维护工具
│   ├── apply-chinese-comments.sh   # 应用中文注释
│   ├── apply-chinese-comments.ts   # TypeScript版注释工具
│   └── verify-comments.ts          # 验证注释完整性
├── admin/            # 管理员工具
│   ├── check-admin-accounts.ts     # 检查管理员账户
│   ├── update-admin-password.ts    # 更新管理员密码
│   ├── test-password.ts            # 测试密码功能
│   └── check-login-type.ts         # 检查登录类型
└── README.md         # 本文档
```

## 📦 脚本分类详解

### 🏗️ 核心模块 (core/)
被 `project.sh` 主脚本调用的核心功能模块，提供统一的服务管理入口。

### 💾 数据库工具 (database/)

#### backup-database.sh
- **功能**: 创建PostgreSQL数据库的完整备份
- **用法**: `./database/backup-database.sh [备份目录]`
- **特性**: 
  - 自动读取.env配置
  - 包含完整数据结构和数据
  - 生成带时间戳的SQL文件
  - 备份前自动测试连接

#### restore-database.sh
- **功能**: 从SQL备份文件恢复PostgreSQL数据库
- **用法**: `./database/restore-database.sh <备份文件路径>`
- **特性**: 
  - 双重确认保护机制
  - 恢复后自动验证
  - 详细的进度和错误提示
  - 支持任意路径的备份文件

### 🔧 开发工具 (development/)
开发和测试阶段使用的各种检查和修复工具。

#### dev-check.sh
- **功能**: 开发环境检查
- **用法**: `./development/dev-check.sh`
- **说明**: 检查开发环境的基本配置和依赖

#### api-check.sh
- **功能**: API服务检查
- **用法**: `./development/api-check.sh`
- **说明**: 检查后端API服务的运行状态

#### frontend-check.sh
- **功能**: 前端服务检查
- **用法**: `./development/frontend-check.sh`
- **说明**: 检查前端应用的运行状态

#### quick-fix.sh
- **功能**: 快速修复常见问题
- **用法**: `./development/quick-fix.sh`
- **说明**: 自动修复项目中的常见配置和依赖问题

#### test_api.sh / test_api_updated.sh
- **功能**: API测试脚本
- **用法**: `./development/test_api.sh`
- **说明**: 测试API接口的功能和性能

### 📝 代码维护 (maintenance/)
代码质量和注释维护相关工具。

#### apply-chinese-comments.sh
- **功能**: 应用中文注释到代码
- **用法**: `./maintenance/apply-chinese-comments.sh`
- **说明**: 为代码添加中文注释，提高可读性

#### apply-chinese-comments.ts
- **功能**: TypeScript版本的中文注释工具
- **用法**: `ts-node maintenance/apply-chinese-comments.ts`
- **说明**: 使用TypeScript实现的注释工具

#### verify-comments.ts
- **功能**: 验证代码注释完整性
- **用法**: `ts-node maintenance/verify-comments.ts`
- **说明**: 检查代码中注释的覆盖率和质量

### 👤 管理员工具 (admin/)
系统管理员账户和权限管理相关工具。

#### check-admin-accounts.ts
- **功能**: 检查管理员账户状态
- **用法**: `ts-node admin/check-admin-accounts.ts`
- **说明**: 验证系统中管理员账户的配置和权限

#### update-admin-password.ts
- **功能**: 更新管理员密码
- **用法**: `ts-node admin/update-admin-password.ts`
- **说明**: 安全地更新管理员账户密码

#### test-password.ts
- **功能**: 密码功能测试
- **用法**: `ts-node admin/test-password.ts`
- **说明**: 测试密码加密、验证等功能

#### check-login-type.ts
- **功能**: 检查登录类型配置
- **用法**: `ts-node admin/check-login-type.ts`
- **说明**: 验证系统登录方式的配置

## 🚀 使用指南

### 运行TypeScript脚本
```bash
# 确保已安装依赖
npm install

# 运行TypeScript脚本
npx ts-node scripts/脚本名.ts
```

### 运行Shell脚本
```bash
# 核心模块（通过project.sh调用）
./project.sh

# 数据库独立脚本
./scripts/database/backup-database.sh
./scripts/database/restore-database.sh

# 开发工具脚本
./scripts/development/dev-check.sh
./scripts/development/api-check.sh

# 代码维护脚本  
./scripts/maintenance/apply-chinese-comments.sh

# 管理员工具脚本
ts-node scripts/admin/check-admin-accounts.ts
```

### 查看脚本帮助
大多数脚本支持 `-h` 或 `--help` 参数：
```bash
./scripts/database/backup-database.sh --help
./scripts/database/restore-database.sh -h
```

## 📁 文件权限

所有 `.sh` 脚本文件都已设置执行权限：
```bash
-rwxr-xr-x  backup-database.sh
-rwxr-xr-x  restore-database.sh
# ... 其他脚本
```

## ⚠️ 注意事项

1. **数据库脚本**: 请确保 `.env` 文件配置正确
2. **TypeScript脚本**: 需要项目依赖已安装
3. **权限要求**: 某些脚本可能需要数据库管理权限
4. **备份恢复**: 恢复操作会覆盖现有数据，请谨慎操作

## 📞 问题反馈

如果脚本运行遇到问题，请：
1. 检查脚本的帮助信息
2. 确认环境配置正确
3. 查看详细错误日志
4. 联系开发团队获取支持

---
*最后更新: $(date "+%Y-%m-%d")*
