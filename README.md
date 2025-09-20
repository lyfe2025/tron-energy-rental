# TRON 能量租赁系统

<div align="center">

![TRON Energy Rental](https://img.shields.io/badge/TRON-Energy%20Rental-red?style=for-the-badge&logo=tron)
![Vue 3](https://img.shields.io/badge/Vue-3.4.15+-4FC08D?style=for-the-badge&logo=vue.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-336791?style=for-the-badge&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-6+-DC382D?style=for-the-badge&logo=redis)

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

- **多机器人管理系统**
  - 支持多个Telegram机器人同时运行
  - 智能负载均衡和故障转移
  - 实时机器人状态监控
  - 动态机器人配置管理

- **Telegram 机器人集群**
  - 24/7 自动化服务
  - 多语言支持
  - 实时通知推送
  - 便捷的命令操作
  - Webhook和长轮询双模式

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
  - 缓存系统监控
  - 数据库性能监控

### 🛡️ 安全特性

- **多重安全验证**
- **数据加密存储**
- **API 访问限流**
- **操作日志审计**
- **资金安全保障**

## 🏗️ 技术架构

### 前端技术栈

- **框架**: Vue 3.4.15+ + TypeScript 5.3+
- **构建工具**: Vite 5.0.12+
- **UI 组件**: Element Plus 2.11+
- **状态管理**: Pinia 3.0+
- **路由管理**: Vue Router 4.2+
- **样式框架**: Tailwind CSS 3.4+
- **图表库**: ECharts 6.0+ / Recharts 3.1+
- **HTTP 客户端**: Axios 1.6+
- **图标库**: Lucide Vue Next

### 后端技术栈

- **运行时**: Node.js 18+ / TypeScript 5.3+
- **框架**: Express.js 4.21+ + TypeScript
- **数据库**: PostgreSQL 12+ (pg 8.11+)
- **缓存**: Redis 6+ (ioredis 5.7+ / redis 4.6+)
- **区块链**: TronWeb 6.0+ SDK
- **身份验证**: JWT (jsonwebtoken 9.0+)
- **数据验证**: Joi 17.11+ + Express Validator 7.2+
- **日志系统**: Winston 3.17+ (日志轮转支持)
- **进程管理**: PM2 / Docker
- **定时任务**: Node-cron 4.2+
- **消息推送**: Telegram Bot API (node-telegram-bot-api 0.66+)

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
   # 复制生产环境配置模板
   cp deployment/templates/env.production.template .env
   # 或复制开发环境配置模板
   cp deployment/templates/env.development.template .env.development
   # 编辑配置文件，设置数据库、Redis、TRON网络等参数
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
- **质押管理**: `/api/energy-pool/stake/*`
- **能量池管理**: `/api/energy-pool/*`, `/api/energy-pools-extended/*`
- **订单管理**: `/api/orders/*`
- **用户管理**: `/api/users/*`, `/api/user-levels/*`
- **代理系统**: `/api/agents/*`
- **统计数据**: `/api/statistics/*`
- **系统管理**: `/api/system/*`, `/api/system-configs/*`
- **机器人管理**: `/api/bots/*`, `/api/multi-bot/*`
- **Telegram集成**: `/api/telegram/*`, `/api/telegram-bot-notifications/*`
- **TRON网络**: `/api/tron/*`, `/api/tron-networks/*`
- **支付系统**: `/api/payment/*`
- **价格配置**: `/api/price-configs/*`
- **监控系统**: `/api/monitoring/*`, `/api/network-logs/*`
- **配置缓存**: `/api/config-cache/*`
- **文件上传**: `/api/uploads/*`
- **调度任务**: `/api/scheduler/*`

### API 使用示例

```bash
# 用户登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tronrental.com","password":"admin123456"}'

# 获取质押概览
curl -X GET http://localhost:3001/api/energy-pool/stake/overview \
  -H "Authorization: Bearer <your-token>"

# 健康检查
curl -X GET http://localhost:3001/api/health

# 获取API端点列表
curl -X GET http://localhost:3001/api
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
│   ├── components/         # Vue 组件 (116个文件)
│   ├── pages/             # 页面组件 (456个文件)
│   ├── stores/            # Pinia 状态管理
│   ├── services/          # 前端服务层 (27个文件)
│   ├── composables/       # Vue组合式函数
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型定义
│   └── router/            # 路由配置
├── api/                   # 后端源码
│   ├── routes/            # API路由定义 (覆盖所有业务模块)
│   ├── services/          # 业务逻辑层 (202个服务文件)
│   │   ├── telegram-bot/  # Telegram机器人服务集群
│   │   ├── tron/          # TRON区块链服务
│   │   ├── monitoring/    # 系统监控服务
│   │   ├── config-cache/  # 配置缓存服务
│   │   └── energy-pool/   # 能量池管理服务
│   ├── controllers/       # 控制器层
│   ├── middleware/        # 中间件 (认证、验证、RBAC等)
│   ├── config/            # 配置管理
│   ├── database/          # 数据库连接配置
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript 类型定义
├── migrations/            # 数据库迁移文件
├── docs/                  # 项目文档
│   ├── api/               # API文档
│   ├── tron-api/          # TRON API文档
│   ├── telegram-bot-api/  # Telegram机器人API文档
│   └── DONE/              # 已完成功能文档
├── deployment/            # 部署相关文件
│   ├── scripts/           # 部署脚本
│   ├── configs/           # 服务器配置
│   ├── docker/            # Docker配置
│   └── templates/         # 配置模板
├── scripts/               # 各类脚本文件
│   ├── admin/             # 管理员脚本
│   ├── database/          # 数据库脚本
│   ├── development/       # 开发脚本
│   └── maintenance/       # 维护脚本
├── tests/                 # 测试文件
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   ├── e2e/               # 端到端测试
│   └── fixtures/          # 测试数据
├── logs/                  # 日志文件
├── backups/               # 数据库备份
└── public/                # 静态资源
    ├── uploads/           # 上传文件
    └── assets/            # 静态资源
```

### 开发脚本

```bash
# 开发服务
pnpm run dev               # 同时启动前端和后端
pnpm run client:dev        # 启动前端开发服务器
pnpm run server:dev        # 启动后端开发服务器
pnpm run restart           # 一键重启所有服务

# 代码检查和类型检查
pnpm run lint              # ESLint 检查
pnpm run lint:fix          # 自动修复ESLint错误
pnpm run type-check        # 前端TypeScript类型检查
pnpm run type-check:api    # 后端TypeScript类型检查
pnpm run check             # Vue组件类型检查

# 测试
pnpm run test              # 运行测试
pnpm run test:run          # 运行测试（非监听模式）
pnpm run test:ui           # 测试 UI界面
pnpm run test:coverage     # 测试覆盖率报告
pnpm run test:unit         # 运行单元测试
pnpm run test:integration  # 运行集成测试
pnpm run test:watch        # 监听模式运行测试

# 数据库管理
pnpm run db:create         # 创建数据库
pnpm run db:setup          # 创建数据库并运行迁移
pnpm run migrate           # 运行迁移
pnpm run migrate:status    # 迁移状态
pnpm run migrate:rollback  # 回滚迁移
pnpm run migrate:sync      # 同步迁移文件
pnpm run migrate:sync:dry  # 干运行同步迁移

# 构建和预览
pnpm run build             # 构建生产版本
pnpm run preview           # 预览构建结果

# 代码注释管理
pnpm run comments:apply    # 应用中文注释
pnpm run comments:verify   # 验证注释
pnpm run comments:setup    # 设置注释系统
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
├── e2e/                   # 端到端测试
├── fixtures/              # 测试数据
├── mocks/                 # 模拟数据
├── setup/                 # 测试设置
├── utils/                 # 测试工具
└── setup.ts               # 全局测试配置
```

### 测试覆盖率要求

- **全局覆盖率**: 80%
- **分支覆盖率**: 80%
- **函数覆盖率**: 80%
- **语句覆盖率**: 80%

## 📊 监控与日志

### 日志系统

- **日志级别**: error, warn, info, debug
- **日志文件**: 
  - 应用日志: `logs/app-YYYY-MM-DD.log`
  - 后端日志: `logs/backend.log`
  - 前端日志: `logs/frontend.log`
  - 机器人日志: `logs/bots/`
- **日志轮转**: 按日期自动轮转，自动清理策略
- **结构化日志**: JSON 格式便于分析
- **日志管理**: LogRotationManager 统一管理

### 监控指标

- **系统资源监控**
  - CPU、内存、磁盘使用率
  - 网络流量和连接状态
  - 进程健康状态

- **应用性能监控**
  - API 响应时间
  - 请求成功率和错误率
  - 并发连接数
  - 服务可用性

- **数据库监控**
  - PostgreSQL 连接状态
  - 查询性能和慢查询
  - 数据库锁和死锁

- **缓存监控**
  - Redis 缓存命中率
  - 内存使用情况
  - 连接池状态

- **业务监控**
  - 质押操作成功率
  - 机器人服务状态
  - 订单处理效率
  - TRON网络连接状态

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

**🔧 当前版本**: v1.0.0  
**📅 最后更新**: 2025年9月  
**💻 活跃维护**: ✅ 持续更新中

 Made with ❤️ by TRON Energy Rental Team

</div>