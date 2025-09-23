# TRON 能量租赁系统

<div align="center">

![TRON Energy Rental](https://img.shields.io/badge/TRON-Energy%20Rental-red?style=for-the-badge&logo=tron)
![Vue 3](https://img.shields.io/badge/Vue-3.4.15+-4FC08D?style=for-the-badge&logo=vue.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-336791?style=for-the-badge&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-6+-DC382D?style=for-the-badge&logo=redis)

**基于 TRON 2.0 质押机制的专业能量租赁平台**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [部署指南](#-部署指南) • [数据库备份恢复](#-数据库备份和恢复) • [API 文档](#-api-文档) • [贡献指南](#-贡献指南)

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

### 🚀 开发体验优化

- **快速安装**: 预配置镜像源，依赖安装仅需2秒
- **智能提示**: 安装过程显示友好的进度提示
- **一键管理**: 提供便捷的镜像源切换脚本
- **网络优化**: 内置重试机制确保安装稳定性

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
- **图标库**: Lucide Vue Next 0.511+
- **工具库**: Lodash ES 4.17+, Clsx 2.1+

### 后端技术栈

- **运行时**: Node.js 18+ / TypeScript 5.3+
- **框架**: Express.js 4.21+ + TypeScript
- **数据库**: PostgreSQL 12+ (pg 8.11+)
- **缓存**: Redis 6+ (ioredis 5.7+ / redis 4.6+)
- **区块链**: TronWeb 6.0+ SDK
- **身份验证**: JWT (jsonwebtoken 9.0+)
- **数据验证**: Joi 17.11+ + Express Validator 7.2+
- **日志系统**: Winston 3.17+ (winston-daily-rotate-file 5.0+)
- **进程管理**: PM2 (ecosystem.config.cjs)
- **定时任务**: Node-cron 4.2+
- **消息推送**: Telegram Bot API (node-telegram-bot-api 0.66+)
- **系统监控**: Systeminformation 5.27+
- **加密安全**: Bcrypt 6.0+, Bcryptjs 2.4+

### 基础设施

- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **监控**: 系统资源监控
- **部署**: 传统部署 + 容器化部署

## 🚀 快速开始

### 环境要求

#### 基础环境
- **Node.js** >= 18.0.0 (推荐 18.19+ LTS)
- **PostgreSQL** >= 12.0 (推荐 13+，无需额外扩展)
- **Redis** >= 6.0 (用于缓存和会话存储)
- **Git** (用于代码管理)
- **pnpm** >= 8.0.0 (推荐) 或 **npm** >= 9.0.0

#### 系统要求
- **内存**: 最小 2GB，推荐 4GB+
- **磁盘空间**: 最小 10GB 可用空间
- **网络**: 稳定的网络连接（用于TRON区块链API调用）

#### 生产环境推荐
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **进程管理器**: PM2 (已包含配置)
- **反向代理**: Nginx (配置文件已提供)
- **SSL证书**: Let's Encrypt 或商业证书

### 镜像源配置

项目已预配置淘宝镜像源以提高国内用户的依赖安装速度：

- **默认镜像源**: `https://registry.npmmirror.com/` (淘宝镜像)
- **配置文件**: `.npmrc` (项目根目录)
- **安装提示**: 自动显示安装进度和完成提示
- **网络优化**: 内置重试机制和超时配置

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd tron-energy-rental
   ```

2. **检查镜像源配置**
   ```bash
   # 检查当前镜像源（项目已预配置淘宝镜像源）
   npm run registry:check
   ```

3. **安装依赖**
   ```bash
   # 使用 pnpm (推荐，约2秒完成)
   pnpm install
   
   # 或使用 npm
   npm install
   ```

4. **配置环境变量**
   ```bash
   # 复制环境变量配置文件
   cp .env .env.local  # 用于本地开发
   
   # 编辑配置文件，根据你的环境修改以下关键配置：
   # - 数据库连接信息
   # - Redis配置
   # - JWT密钥
   # - 管理员账户信息
   # - TRON网络配置
   ```
   
   **重要配置项说明：**
   ```bash
   # 数据库配置（必须修改）
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/tron_energy_rental
   
   # 安全配置（生产环境必须修改）
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
   ADMIN_PASSWORD=your-secure-admin-password
   
   # 服务端口配置
   PORT=3001          # 后端API端口
   VITE_PORT=5173     # 前端开发服务器端口
   ```

5. **数据库初始化**
   ```bash
   # 创建数据库（自动创建）
   pnpm run db:create
   
   # 运行数据库迁移
   pnpm run migrate
   
   # 验证数据库连接
   psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -c "SELECT version();"
   ```
   
   **注意**: 本项目的PostgreSQL配置**不需要任何扩展**，使用标准PostgreSQL功能即可。

6. **启动开发服务**
   ```bash
   # 同时启动前端和后端
   pnpm run dev
   
   # 或分别启动
   pnpm run client:dev  # 前端 (端口 5173)
   pnpm run server:dev  # 后端 (端口 3001)
   ```

7. **访问应用**
   - **前端界面**: http://localhost:5173
   - **后端 API**: http://localhost:3001/api
   - **API文档**: http://localhost:3001/api (显示所有可用端点)
   - **健康检查**: http://localhost:3001/api/health
   - **管理员账户**: admin@tronrental.com / admin123456
   
   **首次登录后建议：**
   ```bash
   # 测试API连接
   curl -s -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@tronrental.com","password":"admin123456"}' | jq .
   
   # 检查系统状态
   curl http://localhost:3001/api/health
   ```

### 🔄 快速重启

```bash
# 一键重启所有服务（自动清理进程）
pnpm run restart

# 手动停止现有服务后重启
ps aux | grep -E 'tron-energy-rental|tsx.*server\.ts|vite.*5173' | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
pnpm run dev
```

### 📦 镜像源管理

项目已预配置国内镜像源以加速依赖安装。如需切换镜像源：

```bash
# 检查当前镜像源
npm run registry:check

# 切换到淘宝镜像源（国内推荐，默认配置）
npm run registry:taobao

# 切换到npm官方镜像源（海外或公司环境）
npm run registry:npm

# 重置镜像源配置到系统默认
npm run registry:reset
```

**镜像源说明：**
- **淘宝镜像源**: `https://registry.npmmirror.com/` (国内网络优化)
- **官方镜像源**: `https://registry.npmjs.org/` (海外网络)
- **自动重试**: 内置网络超时重试机制
- **缓存优化**: 支持本地缓存加速后续安装

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

### 🚀 生产环境部署（推荐）

#### 方式一：PM2部署（推荐）

1. **环境准备**
   ```bash
   # 安装全局依赖
   npm install -g pm2 pnpm
   
   # 克隆项目
   git clone <your-repo-url> /var/www/tron-energy-rental
   cd /var/www/tron-energy-rental
   ```

2. **安装依赖和构建**
   ```bash
   # 安装依赖
   pnpm install
   
   # 构建前端
   pnpm run build
   
   # 配置环境变量（重要！）
   cp .env .env.production
   nano .env.production  # 修改生产环境配置
   ```

3. **数据库初始化**
   ```bash
   # 创建数据库
   pnpm run db:create
   
   # 运行迁移
   pnpm run migrate
   ```

4. **启动服务（PM2）**
   ```bash
   # 使用PM2启动服务
   pm2 start ecosystem.config.cjs --env production
   
   # 保存PM2配置
   pm2 save
   pm2 startup
   
   # 查看服务状态
   pm2 status
   pm2 logs
   ```

#### 方式二：宝塔面板部署

1. **一键安装脚本**
   ```bash
   # 下载并运行宝塔安装脚本
   wget https://raw.githubusercontent.com/your-repo/main/deployment/scripts/install.sh
   chmod +x install.sh
   sudo ./install.sh
   ```

2. **手动部署步骤**
   - 参考: [deployment/宝塔面板部署指南.md](./deployment/宝塔面板部署指南.md)
   - 包含完整的宝塔面板配置说明

### 🔧 Nginx配置

项目提供了完整的Nginx配置文件：

```bash
# 复制Nginx配置
cp deployment/configs/nginx-same-server.conf /etc/nginx/sites-available/tron-energy-rental
ln -s /etc/nginx/sites-available/tron-energy-rental /etc/nginx/sites-enabled/

# 修改配置中的域名
nano /etc/nginx/sites-available/tron-energy-rental

# 测试并重载Nginx
nginx -t
systemctl reload nginx
```

### 📊 PM2配置说明

项目使用优化的PM2配置 (`ecosystem.config.cjs`)：

- **执行模式**: Fork模式，单实例优化
- **内存管理**: 自动重启当内存超过1.5GB
- **日志管理**: 分离的错误和输出日志
- **健康检查**: 30秒间隔的应用监控
- **性能优化**: Node.js运行时参数调优

**常用PM2命令：**
```bash
# 服务管理
pm2 start ecosystem.config.cjs --env production
pm2 restart tron-energy-api
pm2 stop tron-energy-api
pm2 delete tron-energy-api

# 监控和日志
pm2 status
pm2 monit
pm2 logs tron-energy-api
pm2 logs tron-energy-api --lines 100

# 配置管理
pm2 save
pm2 startup  # 开机自启
pm2 reload ecosystem.config.cjs  # 零停机重载
```

### 🛡️ 安全配置

**生产环境必须修改的配置：**
```bash
# .env.production 中的关键配置
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
SESSION_SECRET=your-session-secret-change-this-to-random-string
CSRF_SECRET=your-csrf-secret-change-this-to-random-string
ADMIN_PASSWORD=change-this-default-password
DB_PASSWORD=change-this-database-password
REDIS_PASSWORD=set-redis-password-if-needed
```

### 📁 部署配置文件

- **PM2配置**: `ecosystem.config.cjs` (已优化的生产配置)
- **Nginx配置**: `deployment/configs/nginx-same-server.conf`
- **环境模板**: 项目根目录的 `.env` 文件
- **安装脚本**: `deployment/scripts/install.sh` (宝塔面板)
- **部署脚本**: `deployment/scripts/deploy.sh`

### 🔍 部署验证

```bash
# 检查服务状态
pm2 status
curl http://localhost:3001/api/health

# 检查前端访问
curl -I http://your-domain.com

# 运行健康检查脚本
./deployment/scripts/health-check.sh
```

详细部署说明请参考: [deployment/README.md](./deployment/README.md)

## 💾 数据库备份和恢复

### 📁 备份系统概述

项目提供了完善的数据库备份和恢复系统，支持两种备份格式：

#### 🔧 双重备份策略

| 备份类型 | 文件名格式 | 适用场景 | 特点 |
|---------|-----------|----------|------|
| **标准版本** | `db_backup_tron_energy_rental_*.sql` | 完整数据库重建 | 包含 DROP/CREATE DATABASE 语句 |
| **Navicat兼容版** | `db_backup_navicat_*.sql` | 图形化工具导入 | 不包含数据库创建语句，更安全 |

### 🚀 创建数据库备份

#### 使用项目管理脚本（推荐）

```bash
# 启动统一管理脚本
./project.sh

# 选择操作流程：
# 7) 数据库管理
# 1) 创建新备份（完整）      - 生成标准版本备份
# 2) 创建Navicat兼容备份     - 生成图形化工具兼容版本
```

#### 使用独立备份脚本

```bash
# 标准版本备份
./scripts/database/backup-database.sh

# 查看备份历史
ls -la backups/
```

### 🔄 数据库恢复最佳实践

#### ⭐ 推荐方案：命令行导入（适用所有场景）

经过大量测试验证，**命令行导入是最稳定可靠的方式**，适用于：
- ✅ 开发环境数据恢复
- ✅ 生产环境部署
- ✅ 数据库迁移
- ✅ 灾难恢复

**步骤详解：**

```bash
# 1. 创建目标数据库（如果不存在）
psql postgresql://username:password@localhost:5432/postgres \
  -c "CREATE DATABASE your_target_database;"

# 2. 使用标准版本恢复（完整重建）
psql postgresql://username:password@localhost:5432/postgres \
  -f backups/db_backup_tron_energy_rental_20250923_121841.sql

# 3. 使用Navicat版本恢复（导入到现有数据库）
psql postgresql://username:password@localhost:5432/your_target_database \
  -f backups/db_backup_navicat_tron_energy_rental_20250923_121843.sql
```

**实际操作示例：**

```bash
# 使用项目默认用户恢复
psql postgresql://postgres:postgres@localhost:5432/postgres \
  -f backups/db_backup_navicat_tron_energy_rental_20250923_121843.sql

# 验证恢复结果
psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

#### 📊 图形化工具使用指南

**针对 Navicat / pgAdmin 用户的特别说明：**

1. **优先推荐：先用命令行导入，再用图形界面管理**
   ```bash
   # 先命令行导入数据
   psql -d your_database -f backup_file.sql
   
   # 然后用 Navicat 连接管理
   # 享受图形界面的便利性
   ```

2. **Navicat 直接导入的注意事项**
   - ✅ 使用 `db_backup_navicat_*.sql` 文件
   - ⚙️ 导入设置中勾选"遇到错误时继续"
   - 📝 确保使用 UTF-8 编码
   - 📋 建议分段导入大文件

### 🔍 恢复验证和测试

```bash
# 1. 检查表数量
psql -d your_database -c "
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';"

# 2. 检查数据完整性
psql -d your_database -c "
SELECT 
  schemaname, 
  tablename, 
  n_tup_ins as insert_count,
  n_tup_upd as update_count
FROM pg_stat_user_tables 
ORDER BY tablename;"

# 3. 测试应用连接
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tronrental.com","password":"admin123456"}' | jq .

# 4. 检查关键功能
psql -d your_database -c "SELECT COUNT(*) FROM admins WHERE role = 'super_admin';"
```

### 🚨 故障排查指南

#### 常见问题及解决方案

**1. Navicat 导入报错 "syntax error at or near"**
```bash
# 问题：图形化工具对SQL格式严格解析
# 解决：使用命令行导入（推荐）
psql -d your_database -f backup_file.sql

# 或者调整 Navicat 设置：
# - 勾选"遇到错误时继续"
# - 确保编码为 UTF-8
# - 尝试分段导入
```

**2. 权限相关错误**
```bash
# 问题：备份文件包含特定用户的所有者信息
# 解决：项目已使用 --no-owner --no-privileges 参数，无此问题

# 验证备份参数
grep -E "no-owner|no-privileges" scripts/core/database-manager.sh
```

**3. 数据库已存在错误**
```bash
# 标准版本会自动处理，Navicat版本需要手动创建
CREATE DATABASE your_database_name WITH 
  TEMPLATE = template0 
  ENCODING = 'UTF8' 
  LOCALE = 'C';
```

### 📋 备份恢复检查清单

**备份前检查：**
- [ ] 数据库连接正常
- [ ] 备份目录权限充足
- [ ] 磁盘空间充足（建议预留3倍数据库大小）

**恢复前检查：**
- [ ] 备份文件完整性验证
- [ ] 目标环境PostgreSQL版本兼容
- [ ] 用户权限配置正确

**恢复后验证：**
- [ ] 表数量正确（预期：41个表）
- [ ] 管理员账户可正常登录
- [ ] 应用服务启动正常
- [ ] 关键业务功能测试通过

### 🔒 安全最佳实践

```bash
# 1. 备份文件加密（生产环境推荐）
gpg --symmetric --cipher-algo AES256 backup_file.sql
gpg --decrypt backup_file.sql.gpg > backup_file.sql

# 2. 定期备份策略
# 添加到 crontab
0 2 * * * /path/to/scripts/database/backup-database.sh
0 0 * * 0 find /path/to/backups -name "*.sql" -mtime +30 -delete

# 3. 备份完整性验证
scripts/database/verify-backup.sh backup_file.sql
```

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
# 🚀 开发服务
pnpm run dev               # 同时启动前端和后端开发服务器
pnpm run client:dev        # 仅启动前端开发服务器 (端口 5173)
pnpm run server:dev        # 仅启动后端开发服务器 (端口 3001)
pnpm run restart           # 一键重启所有服务（自动杀死旧进程）

# 📦 镜像源管理（加速国内依赖安装）
pnpm run registry:check    # 检查当前镜像源配置
pnpm run registry:taobao   # 切换到淘宝镜像源（国内推荐）
pnpm run registry:npm      # 切换到npm官方镜像源（海外推荐）
pnpm run registry:reset    # 重置镜像源配置到默认

# 🔍 代码质量检查
pnpm run lint              # ESLint 代码检查
pnpm run lint:fix          # 自动修复ESLint错误
pnpm run type-check        # 前端TypeScript类型检查
pnpm run type-check:api    # 后端TypeScript类型检查
pnpm run check             # Vue组件类型检查和编译验证

# 🧪 测试相关
pnpm run test              # 运行所有测试（监听模式）
pnpm run test:run          # 运行所有测试（单次执行）
pnpm run test:ui           # 启动测试UI界面
pnpm run test:coverage     # 生成测试覆盖率报告
pnpm run test:unit         # 运行单元测试
pnpm run test:integration  # 运行集成测试
pnpm run test:watch        # 监听模式运行测试

# 🗄️ 数据库管理
pnpm run db:create         # 创建数据库
pnpm run db:setup          # 创建数据库并运行所有迁移
pnpm run migrate           # 运行待执行的迁移
pnpm run migrate:status    # 查看迁移状态
pnpm run migrate:rollback  # 回滚最后一次迁移
pnpm run migrate:sync      # 同步迁移文件
pnpm run migrate:sync:dry  # 干运行同步迁移（不执行）

# 💾 数据库备份和恢复
# 项目提供统一的数据库管理脚本，支持备份、恢复、验证等操作
./project.sh               # 进入项目管理脚本，选择数据库管理
scripts/database/backup-database.sh      # 独立备份脚本
scripts/database/restore-database.sh     # 独立恢复脚本

# 🏗️ 构建和预览
pnpm run build             # 构建生产版本
pnpm run preview           # 预览构建结果

# 🎯 PM2生产环境管理
pnpm run pm2:start         # 启动PM2服务
pnpm run pm2:stop          # 停止PM2服务
pnpm run pm2:restart       # 重启PM2服务
pnpm run pm2:reload        # 零停机重载PM2服务
pnpm run pm2:status        # 查看PM2状态
pnpm run pm2:logs          # 查看PM2日志
pnpm run pm2:monit         # PM2监控界面

# 📝 代码注释管理
pnpm run comments:apply    # 应用中文注释
pnpm run comments:verify   # 验证注释完整性
pnpm run comments:setup    # 设置注释系统
```

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 代码规范
- 组件文件控制在 300 行以内
- 使用语义化的提交信息
- 编写必要的单元测试

## 🧪 测试

#### 运行测试

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

# 测试UI界面
pnpm run test:ui
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

## 🚀 生产环境最佳实践

### 🔒 安全配置清单

#### 必须修改的配置
```bash
# 1. 数据库安全
DB_PASSWORD="complex-password-with-symbols"
REDIS_PASSWORD="redis-secure-password"

# 2. 应用密钥（必须32字符以上）
JWT_SECRET="your-super-secure-jwt-secret-key-at-least-32-chars"
SESSION_SECRET="your-session-secret-change-this-random-string"
CSRF_SECRET="your-csrf-secret-change-this-random-string"

# 3. 管理员账户
ADMIN_EMAIL="your-admin@yourdomain.com"
ADMIN_PASSWORD="complex-admin-password"

# 4. 生产环境标识
NODE_ENV=production

# 5. 限制访问主机
VITE_ALLOWED_HOSTS="yourdomain.com,www.yourdomain.com,api.yourdomain.com"
```

#### 防火墙配置
```bash
# 安装并配置ufw
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3001/tcp     # 禁止直接访问API端口
sudo ufw deny 5432/tcp     # 禁止直接访问数据库
sudo ufw deny 6379/tcp     # 禁止直接访问Redis
```

### 📈 性能优化建议

#### PM2优化配置
当前项目的PM2配置已经优化，包括：
- **内存管理**: 1.5GB内存限制自动重启
- **进程优化**: Node.js运行时参数调优
- **健康检查**: 30秒间隔监控
- **日志管理**: 分离的错误和输出日志
- **Zero-downtime**: 零停机重载功能

#### 扩展配置（高负载环境）
```bash
# 多实例配置（需要Nginx负载均衡）
# 修改 ecosystem.config.cjs 中的 instances: 2-4
# 配置不同端口：3001, 3002, 3003, 3004
```

### 🔍 监控告警

#### 系统监控
```bash
# 设置定时健康检查
crontab -e
# 添加以下行：
*/5 * * * * /var/www/tron-energy-rental/deployment/scripts/health-check.sh -q -r
0 2 * * * find /var/www/tron-energy-rental/logs -name "*.log" -mtime +7 -delete
```

#### 关键指标监控
- **API响应时间**: < 2秒
- **内存使用率**: < 80%
- **CPU使用率**: < 70%
- **磁盘使用率**: < 85%
- **数据库连接数**: < 80% 最大连接数
- **Redis内存使用**: < 80%

### 🔄 备份策略

#### 双重备份系统
项目提供两种备份格式以适应不同使用场景：
- **标准版本**: 完整数据库重建，适合自动化部署
- **Navicat兼容版**: 图形化工具导入，适合手动管理

#### 自动化数据库备份
```bash
# 添加到crontab - 使用项目管理脚本
0 2 * * * cd /var/www/tron-energy-rental && ./project.sh -c "backup_both"
0 0 * * 0 find /var/www/tron-energy-rental/backups -name "*.sql" -mtime +30 -delete

# 或使用独立备份脚本
0 2 * * * /var/www/tron-energy-rental/scripts/database/backup-database.sh
```

#### 备份文件结构
```
backups/
├── db_backup_tron_energy_rental_*.sql      # 标准版本备份
├── db_backup_navicat_*.sql                 # Navicat兼容版本
├── daily/                                  # 每日备份归档
├── weekly/                                 # 每周备份归档  
└── monthly/                                # 每月备份归档
```

#### 备份最佳实践
```bash
# 备份前检查
./scripts/database/backup-database.sh --verify-before
./scripts/database/backup-database.sh --encrypt

# 恢复测试（推荐命令行方式）
psql -d test_restore_db -f backup_file.sql

# 验证恢复结果  
psql -d test_restore_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### 🚨 故障排查指南

#### 常见问题诊断
```bash
# 1. 检查服务状态
pm2 status
systemctl status nginx postgresql redis

# 2. 检查端口占用
ss -tlnp | grep -E ":80|:443|:3001|:5432|:6379"

# 3. 检查日志错误
pm2 logs tron-energy-api --lines 50
tail -f /var/log/nginx/error.log

# 4. 数据库连接测试
psql postgresql://username:password@localhost:5432/tron_energy_rental -c "SELECT 1;"

# 5. Redis连接测试
redis-cli ping

# 6. 数据库备份恢复诊断
# 检查备份文件完整性
ls -la backups/ | grep -E "\.sql$"
head -10 backups/your_backup_file.sql

# 测试备份恢复（命令行方式 - 推荐）
psql -d test_database -f backups/backup_file.sql --single-transaction

# 图形化工具问题诊断
# 如果 Navicat 导入失败，尝试：
# - 使用 Navicat 兼容版本文件
# - 检查文件编码（应为 UTF-8）
# - 在 Navicat 中启用"遇到错误时继续"选项
```

#### 应急响应流程
1. **服务异常**: 检查PM2状态 → 查看错误日志 → 重启服务
2. **数据库问题**: 检查连接 → 查看慢查询 → 重启数据库服务
3. **网络问题**: 检查Nginx配置 → 验证SSL证书 → 重载配置
4. **内存泄漏**: 监控内存使用 → 分析heap dump → 优化代码
5. **数据库损坏**: 立即备份当前状态 → 使用最新备份恢复 → 验证数据完整性
6. **备份恢复失败**: 
   - 优先使用命令行导入 `psql -f backup_file.sql`
   - 检查备份文件完整性和权限
   - 尝试不同备份版本（标准版 vs Navicat版）
   - 分段恢复或手动执行关键部分

### 📋 生产部署检查清单

- [ ] 环境变量安全配置完成
- [ ] 数据库密码已修改
- [ ] JWT密钥已更换（32字符以上）
- [ ] 管理员密码已修改
- [ ] 防火墙规则配置完成
- [ ] SSL证书安装完成
- [ ] Nginx配置优化完成
- [ ] PM2服务正常运行
- [ ] 数据库备份策略设置
- [ ] 日志轮转配置完成
- [ ] 监控告警设置完成
- [ ] 健康检查脚本配置
- [ ] 性能基准测试完成

---

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