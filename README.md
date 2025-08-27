# TronResourceDev 项目

这是一个基于 Vue 3 + TypeScript + Express + PostgreSQL 的全栈项目，提供 Tron 资源租赁服务。

## 🚀 快速开始

### 开发环境要求
- Node.js >= 18
- pnpm >= 8
- TypeScript >= 5
- PostgreSQL >= 14

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
# 启动 API 服务器
pnpm dev:api

# 启动前端开发服务器
pnpm dev:frontend

# 同时启动前后端
pnpm dev
```

## 📝 开发规范

### 代码质量检查
```bash
# 运行完整的开发检查
./scripts/dev-check.sh

# 类型检查
pnpm type-check

# ESLint 检查
pnpm lint

# 自动修复 ESLint 问题
pnpm lint:fix
```

### 数据库操作
```bash
# 创建数据库
pnpm db:create

# 运行迁移
pnpm migrate

# 查看迁移状态
pnpm migrate:status

# 回滚迁移
pnpm migrate:rollback
```

## 🔧 开发工具

### VS Code 扩展推荐
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Vue Language Features (Volar)

### VS Code 任务
按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)，然后输入 "Tasks: Run Task" 来运行以下任务：
- 开发检查
- TypeScript 类型检查
- ESLint 检查
- ESLint 自动修复
- 启动 API 服务器
- 启动前端服务器

## 📚 文档

- [开发规范指南](./DEVELOPMENT_GUIDE.md) - 详细的开发规范和最佳实践
- [API 路由模板](./api/templates/route-template.ts) - 标准的路由文件模板

## 🚨 常见问题

### TypeScript 错误
如果遇到 TypeScript 错误，请：
1. 运行 `pnpm type-check` 查看具体错误
2. 参考 [开发规范指南](./DEVELOPMENT_GUIDE.md) 中的常见错误解决方案
3. 使用 `pnpm lint:fix` 自动修复格式问题

### 导入错误
- 类型导入使用 `type` 关键字：`import { type Request } from 'express'`
- 默认导出使用默认导入：`import pool from '../config/database'`
- 用户ID使用 `userId` 而不是 `id`

## 🤝 贡献指南

1. 遵循项目开发规范
2. 提交代码前运行开发检查脚本
3. 使用提供的代码模板
4. 保持代码风格一致

---

**记住**：遵循规范可以避免大部分错误，提高开发效率！
