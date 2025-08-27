# TronResourceDev 项目

这是一个基于 Vue 3 + TypeScript + Express + PostgreSQL + Redis 的全栈项目，提供 Tron 资源租赁服务。

## 🚀 快速开始

### 开发环境要求
- Node.js >= 18
- pnpm >= 8
- TypeScript >= 5
- PostgreSQL >= 14
- Redis >= 6

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

# 仅启动客户端
pnpm client:dev

# 仅启动服务端
pnpm server:dev
```

## 📝 开发规范

### 代码质量检查
```bash
# 运行完整的开发检查
./scripts/dev-check.sh

# 仅检查API代码
./scripts/api-check.sh

# 仅检查前端代码
./scripts/frontend-check.sh

# 快速检测常见问题
./scripts/quick-fix.sh

# TypeScript 类型检查
pnpm type-check
pnpm type-check:api

# ESLint 检查
pnpm lint

# 自动修复 ESLint 问题
pnpm lint:fix

# Vue 类型检查
pnpm check
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

# 一键设置数据库
pnpm db:setup
```

### 中文注释管理
```bash
# 一键完成注释迁移和验证
pnpm comments:setup

# 分别执行
pnpm comments:apply    # 添加中文注释
pnpm comments:verify   # 验证注释结果
```

## 🔧 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速的前端构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Pinia** - Vue 状态管理
- **Vue Router** - Vue.js 官方路由管理器
- **Recharts** - 基于 React 的图表库
- **Lucide Vue** - 精美的图标库

### 后端
- **Express.js** - Node.js Web 应用框架
- **PostgreSQL** - 强大的开源关系型数据库
- **Redis** - 高性能的内存数据库
- **JWT** - JSON Web Token 身份验证
- **bcryptjs** - 密码哈希加密
- **Joi** - 数据验证库
- **TronWeb** - TRON 区块链交互库
- **WebSocket** - 实时通信支持

### 开发工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **TypeScript** - 类型检查
- **Nodemon** - 开发环境自动重启
- **TSX** - TypeScript 执行器

## 📚 项目特性

### 🎯 核心功能
- **用户管理** - 完整的用户注册、登录、权限管理
- **能量包管理** - TRON 能量资源包配置和销售
- **订单系统** - 完整的订单流程管理
- **价格管理** - 灵活的价格配置和模板系统
- **代理系统** - 多级代理和收益分配
- **机器人集成** - Telegram 机器人自动化服务
- **统计分析** - 数据可视化和报表功能

### 🗄️ 数据库特性
- **100% 中文注释覆盖** - 16个表，181个字段全部注释
- **完整的迁移系统** - 支持版本控制和回滚
- **数据完整性** - 外键约束和业务规则验证
- **性能优化** - 索引优化和查询优化

### 🔒 安全特性
- **JWT 身份验证** - 安全的用户会话管理
- **密码加密** - bcrypt 哈希加密
- **输入验证** - 严格的数据验证和清理
- **权限控制** - 基于角色的访问控制

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

### 数据库连接问题
1. 确保 PostgreSQL 服务正在运行
2. 检查环境变量配置
3. 运行 `pnpm db:setup` 初始化数据库

## 📖 文档

- [开发规范指南](./DEVELOPMENT_GUIDE.md) - 详细的开发规范和最佳实践
- [API 路由模板](./api/templates/route-template.ts) - 标准的路由文件模板
- [项目完成报告](./PROJECT_COMPLETION_REPORT.md) - 项目开发进度和成果
- [中文注释说明](./CHINESE_COMMENTS_README.md) - 数据库中文注释使用指南

## 🤝 贡献指南

1. 遵循项目开发规范
2. 提交代码前运行开发检查脚本
3. 使用提供的代码模板
4. 保持代码风格一致
5. 添加适当的中文注释

## 🎉 项目状态

- **开发状态**: 🟢 活跃开发中
- **代码质量**: 🟢 优秀 (ESLint + TypeScript)
- **测试覆盖**: 🟡 基础测试
- **文档完整度**: 🟢 完整
- **数据库注释**: 🟢 100% 中文注释覆盖

---

**记住**：遵循规范可以避免大部分错误，提高开发效率！

> 💡 **提示**: 使用 `./scripts/dev-check.sh` 可以快速检查项目状态并修复常见问题。
