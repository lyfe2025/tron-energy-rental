# TRON 能量租赁系统

<div align="center">

![TRON Energy Rental](https://img.shields.io/badge/TRON-Energy%20Rental-red?style=for-the-badge&logo=tron)
![Vue 3](https://img.shields.io/badge/Vue-3.4+-4FC08D?style=for-the-badge&logo=vue.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-336791?style=for-the-badge&logo=postgresql)

**基于 TRON 2.0 质押机制的专业能量租赁平台**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [部署指南](#-部署指南) • [API 文档](#-api-文档) • [贡献指南](#-贡献指南)

</div>

## 📖 项目简介

TRON 能量租赁系统是一个基于 TRON 2.0 质押机制的专业能量租赁平台，为用户提供便捷的 TRX 质押、能量代理、订单管理等服务。系统采用现代化的全栈架构，支持多网络配置，具备完善的管理后台和 Telegram 机器人集成。

### 🎯 核心价值

- **专业质押服务**: 基于 TRON 2.0 官方质押机制，安全可靠
- **智能能量管理**: 自动化能量分配和回收，提高资源利用率
- **多渠道接入**: 支持 Web 界面和 Telegram 机器人操作
- **完善的代理系统**: 多级代理佣金分配，支持业务拓展
- **实时监控统计**: 全方位的数据分析和业务监控

## ✨ 功能特性

### 🔥 核心功能

- **TRX 质押管理**
  - 支持能量和带宽质押
  - 批量质押操作
  - 14天解冻期管理
  - 自动提取到期资金

- **能量代理服务**
  - 灵活的委托策略
  - 实时委托状态跟踪
  - 委托收益统计
  - 批量委托操作

- **订单管理系统**
  - 完整的订单生命周期管理
  - 多种支付方式支持
  - 订单状态实时更新
  - 自动化订单处理

### 🤖 智能化功能

- **Telegram 机器人**
  - 24/7 自动化服务
  - 多语言支持
  - 实时通知推送
  - 便捷的命令操作

- **代理系统**
  - 多级代理佣金
  - 实时收益统计
  - 代理商管理后台
  - 推广链接生成

- **监控与统计**
  - 实时业务数据监控
  - 详细的财务报表
  - 系统性能监控
  - 异常告警机制

### 🛡️ 安全特性

- **多重安全验证**
- **数据加密存储**
- **API 访问限流**
- **操作日志审计**
- **资金安全保障**

## 🏗️ 技术架构

### 前端技术栈

- **框架**: Vue 3.4+ + TypeScript
- **构建工具**: Vite 5.0+
- **UI 组件**: Element Plus
- **状态管理**: Pinia
- **路由管理**: Vue Router 4
- **样式框架**: Tailwind CSS
- **图表库**: ECharts
- **HTTP 客户端**: Axios

### 后端技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL 12+
- **缓存**: Redis 6+
- **区块链**: TronWeb SDK
- **身份验证**: JWT
- **数据验证**: Joi + Express Validator
- **日志系统**: Winston
- **进程管理**: PM2

### 基础设施

- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **监控**: 系统资源监控
- **部署**: 传统部署 + 容器化部署

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 12.0
- Redis >= 6.0
- Git

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd tron-energy-rental
   ```

2. **安装依赖**
   ```bash
   # 使用 pnpm (推荐)
   pnpm install
   
   # 或使用 npm
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置数据库和其他必要参数
   ```

4. **数据库初始化**
   ```bash
   # 创建数据库
   pnpm run db:create
   
   # 运行迁移
   pnpm run migrate
   ```

5. **启动开发服务**
   ```bash
   # 同时启动前端和后端
   pnpm run dev
   
   # 或分别启动
   pnpm run client:dev  # 前端 (端口 5173)
   pnpm run server:dev  # 后端 (端口 3001)
   ```

6. **访问应用**
   - 前端界面: http://localhost:5173
   - 后端 API: http://localhost:3001
   - 管理员账户: admin@tronrental.com / admin123456

### 快速重启

```bash
# 一键重启所有服务
pnpm run restart
```

## 📚 API 文档

### 核心 API 端点

- **认证相关**: `/api/auth/*`
- **质押管理**: `/api/stake/*`
- **订单管理**: `/api/orders/*`
- **用户管理**: `/api/users/*`
- **代理系统**: `/api/agents/*`
- **统计数据**: `/api/statistics/*`

### API 使用示例

```bash
# 用户登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tronrental.com","password":"admin123456"}'

# 获取质押概览
curl -X GET http://localhost:3001/api/stake/overview \
  -H "Authorization: Bearer <your-token>"
```

详细的 API 文档请参考: [docs/质押管理系统详细文档.md](./docs/质押管理系统详细文档.md)

## 🐳 部署指南

### 传统部署

1. **环境检查**
   ```bash
   ./deployment/scripts/check-environment.sh
   ```

2. **一键部署**
   ```bash
   ./deployment/scripts/deploy.sh
   ```

### Docker 部署

1. **快速启动**
   ```bash
   ./deployment/scripts/docker-deploy.sh up
   ```

2. **生产环境部署**
   ```bash
   # 构建并启动所有服务
   docker-compose -f deployment/docker/docker-compose.yml up -d
   ```

### 部署配置

- **Nginx 配置**: `deployment/configs/nginx.conf`
- **PM2 配置**: `deployment/configs/pm2.config.js`
- **Docker 配置**: `deployment/docker/`
- **环境模板**: `deployment/templates/`

详细部署说明请参考: [deployment/README.md](./deployment/README.md)

## 🛠️ 开发指南

### 项目结构

```
tron-energy-rental/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件
│   ├── pages/             # 页面组件
│   ├── stores/            # Pinia 状态管理
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript 类型定义
├── api/                   # 后端源码
│   ├── routes/            # 路由定义
│   ├── services/          # 业务逻辑
│   ├── models/            # 数据模型
│   ├── middleware/        # 中间件
│   └── utils/             # 工具函数
├── migrations/            # 数据库迁移文件
├── docs/                  # 项目文档
├── deployment/            # 部署相关文件
├── scripts/               # 脚本文件
└── tests/                 # 测试文件
```

### 开发脚本

```bash
# 代码检查
pnpm run lint              # ESLint 检查
pnpm run type-check        # TypeScript 类型检查
pnpm run check             # 完整检查

# 测试
pnpm run test              # 运行测试
pnpm run test:coverage     # 测试覆盖率
pnpm run test:ui           # 测试 UI

# 数据库
pnpm run migrate           # 运行迁移
pnpm run migrate:status    # 迁移状态
pnpm run migrate:rollback  # 回滚迁移

# 构建
pnpm run build             # 构建生产版本
pnpm run preview           # 预览构建结果
```

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 代码规范
- 组件文件控制在 300 行以内
- 使用语义化的提交信息
- 编写必要的单元测试

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm run test

# 运行单元测试
pnpm run test:unit

# 运行集成测试
pnpm run test:integration

# 监听模式
pnpm run test:watch

# 生成覆盖率报告
pnpm run test:coverage
```

### 测试结构

```
tests/
├── unit/                  # 单元测试
├── integration/           # 集成测试
├── fixtures/              # 测试数据
└── helpers/               # 测试工具
```

## 📊 监控与日志

### 日志系统

- **日志级别**: error, warn, info, debug
- **日志文件**: `logs/app.log`
- **日志轮转**: 按日期和大小自动轮转
- **结构化日志**: JSON 格式便于分析

### 监控指标

- 系统资源使用率
- API 响应时间
- 数据库连接状态
- Redis 缓存命中率
- 业务关键指标

## 🤝 贡献指南

我们欢迎所有形式的贡献！请遵循以下步骤：

### 贡献流程

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **创建 Pull Request**

### 贡献类型

- 🐛 Bug 修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 代码优化
- 🧪 测试完善
- 🔧 工具改进

### 代码提交规范

```
type(scope): description

[optional body]

[optional footer]
```

**类型说明**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目和社区的支持：

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Express.js](https://expressjs.com/) - 快速、极简的 Node.js Web 框架
- [TronWeb](https://github.com/tronprotocol/tronweb) - TRON 区块链 JavaScript SDK
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [PostgreSQL](https://www.postgresql.org/) - 强大的开源关系型数据库

## 📞 联系我们

- **项目维护者**: [项目团队]
- **技术支持**: support@example.com
- **问题反馈**: [GitHub Issues](../../issues)
- **功能建议**: [GitHub Discussions](../../discussions)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

 Made with ❤️ by TRON Energy Rental Team

</div>