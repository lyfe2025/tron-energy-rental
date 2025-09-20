# 🔧 TRON能量租赁系统 - 环境配置与PM2部署说明

## 📋 目录

1. [环境配置文件详解](#环境配置文件详解)
2. [PM2部署工作原理](#PM2部署工作原理)
3. [部署方式对比](#部署方式对比)
4. [具体操作指南](#具体操作指南)
5. [常见问题解决](#常见问题解决)
6. [最佳实践建议](#最佳实践建议)

---

## 🌍 环境配置文件详解

### 配置文件类型与优先级

| 文件名 | 用途 | 加载时机 | 优先级 |
|--------|------|----------|--------|
| `.env` | 默认环境配置 | 总是加载 | 🔵 基础 |
| `.env.production` | 生产环境专用 | PM2部署时 | 🟢 高 |
| `.env.development` | 开发环境专用 | 开发模式时 | 🟡 中 |
| `.env.local` | 本地覆盖配置 | 本地开发时 | 🔴 最高 |

### 当前项目配置加载机制

#### ✅ 支持 `.env.production` 的场景

**1. PM2 部署模式**
```javascript
// ecosystem.config.js
{
  name: 'tron-energy-api',
  script: './api/server.ts',
  env_file: '.env.production',  // 🎯 PM2会自动加载此文件
  env: {
    NODE_ENV: 'production'
  }
}
```

**2. Vite 前端构建**
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')  // 🎯 根据mode加载对应文件
  // mode=production 时会加载 .env.production
})
```

#### ❌ 不支持 `.env.production` 的场景

**直接运行 Node.js 时**
```typescript
// api/app.ts (第41行)
dotenv.config();  // 🚨 只加载 .env 文件
```

### 配置文件内容对比

#### 开发环境 (`.env`)
```env
# 开发环境配置
NODE_ENV=development
VITE_HOST=localhost
VITE_API_URL=http://localhost:3001
HOST_ADDRESS=localhost
LOG_LEVEL=debug
VITE_VUE_DEVTOOLS=true
```

#### 生产环境 (`.env.production`)
```env
# 生产环境配置
NODE_ENV=production
VITE_HOST=0.0.0.0
VITE_API_URL=https://yourdomain.com
HOST_ADDRESS=0.0.0.0
LOG_LEVEL=info
VITE_VUE_DEVTOOLS=false

# 🔐 安全配置 (必须修改)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
SESSION_SECRET=your-session-secret-change-this-to-random-string
ADMIN_PASSWORD=change-this-default-password
DB_PASSWORD=change-this-database-password
```

---

## 🚀 PM2部署工作原理

### PM2 是什么？

PM2 (Process Manager 2) 是一个强大的 Node.js 应用进程管理器，它可以：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     用户        │    │      PM2        │    │   Node.js App   │
│                 │    │                 │    │                 │
│ pm2 start       │───▶│  进程管理器      │───▶│  api/server.ts  │
│ pm2 restart     │    │  监控 & 重启     │    │                 │
│ pm2 logs        │    │  日志管理       │    │  实际运行的应用   │
│ pm2 stop        │    │  负载均衡       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### PM2 vs 传统 Node.js 运行方式

#### 🔴 传统手动方式的问题

```bash
# ❌ 传统方式
node api/server.js
npm run dev
tsx api/server.ts

# 问题：
# 1. 🚨 进程崩溃后需要手动重启
# 2. 🚨 关闭终端后进程停止
# 3. 🚨 无法利用多核CPU
# 4. 🚨 难以管理多个进程
# 5. 🚨 日志管理困难
# 6. 🚨 无法监控性能
```

#### ✅ PM2 管理方式的优势

```bash
# ✅ PM2 方式
pm2 start ecosystem.config.js --env production

# 优势：
# 1. ✨ 自动重启 - 崩溃后立即重启
# 2. ✨ 后台运行 - 关闭终端不影响运行
# 3. ✨ 集群模式 - 充分利用多核CPU
# 4. ✨ 进程管理 - 统一管理多个应用
# 5. ✨ 日志轮转 - 自动管理日志文件
# 6. ✨ 性能监控 - 实时查看系统状态
# 7. ✨ 零停机重启 - 更新时不中断服务
```

### PM2 工作流程

```mermaid
graph TD
    A[PM2 启动] --> B[读取 ecosystem.config.js]
    B --> C[加载 .env.production]
    C --> D[启动多个进程实例]
    D --> E[监控进程状态]
    E --> F{进程正常?}
    F -->|是| G[继续监控]
    F -->|否| H[自动重启]
    H --> E
    G --> I[负载均衡请求]
    I --> J[记录日志]
    J --> E
```

### PM2 核心功能详解

#### 1. 进程管理
```bash
# 查看所有进程
pm2 list
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ tron-energy-api│ default     │ 1.0.0   │ cluster │ 12345    │
│ 1   │ tron-energy-api│ default     │ 1.0.0   │ cluster │ 12346    │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

#### 2. 自动重启机制
```javascript
// ecosystem.config.js
{
  autorestart: true,           // 启用自动重启
  max_restarts: 10,           // 最大重启次数
  min_uptime: '10s',          // 最小运行时间
  max_memory_restart: '2G',   // 内存限制重启
}
```

#### 3. 集群模式
```javascript
{
  instances: 2,        // 启动2个实例
  exec_mode: 'cluster' // 集群模式
}
```

#### 4. 日志管理
```bash
# 实时查看日志
pm2 logs

# 日志文件位置
./logs/api-error.log      # 错误日志
./logs/api-out.log        # 输出日志
./logs/api-combined.log   # 合并日志
```

#### 5. 性能监控
```bash
# 实时监控面板
pm2 monit

┌─ Process List ──────────────────────────────────────────────────────────┐
│[ 0] tron-energy-api   Mem:  234 MB    CPU:  15%   online   │ Logs       │
│[ 1] tron-energy-api   Mem:  198 MB    CPU:  12%   online   │            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ 部署方式对比

### 方式对比表

| 特性 | 手动运行 Node.js | npm scripts | PM2 管理 |
|------|------------------|-------------|----------|
| **进程管理** | ❌ 手动 | ❌ 手动 | ✅ 自动 |
| **崩溃重启** | ❌ 需手动重启 | ❌ 需手动重启 | ✅ 自动重启 |
| **后台运行** | ❌ 终端关闭即停止 | ❌ 终端关闭即停止 | ✅ 守护进程 |
| **多核利用** | ❌ 单进程 | ❌ 单进程 | ✅ 集群模式 |
| **日志管理** | ❌ 需自己处理 | ❌ 需自己处理 | ✅ 自动轮转 |
| **监控能力** | ❌ 无监控 | ❌ 无监控 | ✅ 实时监控 |
| **零停机更新** | ❌ 不支持 | ❌ 不支持 | ✅ reload命令 |
| **环境变量** | 🟡 基础支持 | 🟡 基础支持 | ✅ 环境特定文件 |
| **开机自启** | ❌ 需手动配置 | ❌ 需手动配置 | ✅ pm2 startup |
| **适用场景** | 🔧 开发调试 | 🔧 开发环境 | 🏭 生产环境 |

### 具体场景分析

#### 🔧 开发环境
```bash
# 推荐方式：npm scripts
npm run dev
npm run restart

# 优点：
# ✅ 热重载支持
# ✅ 开发工具集成
# ✅ 快速重启
# ✅ 调试友好

# 缺点：
# ❌ 不适合生产环境
# ❌ 进程管理能力弱
```

#### 🏭 生产环境
```bash
# 推荐方式：PM2
pm2 start ecosystem.config.js --env production

# 优点：
# ✅ 生产级稳定性
# ✅ 自动故障恢复
# ✅ 性能监控
# ✅ 集群支持
# ✅ 零停机部署

# 缺点：
# ❌ 学习成本略高
# ❌ 配置相对复杂
```

#### 🧪 测试环境
```bash
# 两种方式都可以
npm run dev        # 快速测试
pm2 start --env test  # 生产环境模拟
```

---

## 📖 具体操作指南

### 环境配置准备

#### 1. 创建生产环境配置文件
```bash
# 复制模板文件
cp deployment/configs/.env.production.template .env.production

# 编辑配置
nano .env.production
```

#### 2. 必须修改的配置项
```env
# 🔐 安全相关 (必须修改)
JWT_SECRET=请生成32位以上随机字符串
SESSION_SECRET=请生成随机字符串
CSRF_SECRET=请生成随机字符串
ADMIN_PASSWORD=请修改默认密码
DB_PASSWORD=请修改数据库密码

# 🌐 域名相关 (必须修改)
VITE_API_URL=https://你的域名.com
VITE_ALLOWED_HOSTS=你的域名.com,www.你的域名.com
```

#### 3. 生成安全密钥
```bash
# 生成JWT密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成Session密钥
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### PM2 部署流程

#### 1. 安装 PM2
```bash
# 全局安装 PM2
npm install -g pm2

# 验证安装
pm2 --version
```

#### 2. 配置 PM2
```bash
# 查看当前配置
cat deployment/configs/ecosystem.config.js

# 根据需要调整配置
nano deployment/configs/ecosystem.config.js
```

#### 3. 启动应用
```bash
# 方式1：使用配置文件启动 (推荐)
pm2 start deployment/configs/ecosystem.config.js --env production

# 方式2：直接启动
pm2 start api/server.ts --name "tron-energy-api" --interpreter tsx --env production

# 方式3：使用npm script启动
pm2 start npm --name "tron-energy" -- start
```

#### 4. 验证部署
```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs

# 健康检查
curl http://localhost:3001/api/health

# 测试前端
curl http://localhost:5173
```

#### 5. 配置开机自启
```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save

# 验证自启动
sudo reboot
pm2 list  # 重启后检查
```

### 日常运维操作

#### 应用管理
```bash
# 重启应用
pm2 restart tron-energy-api

# 停止应用
pm2 stop tron-energy-api

# 删除应用
pm2 delete tron-energy-api

# 重新加载配置
pm2 reload ecosystem.config.js --env production
```

#### 监控和日志
```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 describe tron-energy-api

# 查看日志 (实时)
pm2 logs tron-energy-api

# 查看日志 (历史)
pm2 logs tron-energy-api --lines 100

# 清空日志
pm2 flush
```

#### 性能调优
```bash
# 调整实例数量
pm2 scale tron-energy-api 4

# 重启所有实例
pm2 restart all

# 优雅重启 (零停机)
pm2 reload tron-energy-api
```

---

## 🚨 常见问题解决

### 问题1：PM2 启动失败

#### 现象
```bash
pm2 start ecosystem.config.js
[PM2] Error: spawn ENOENT
```

#### 原因分析
- Node.js 路径不正确
- tsx 解释器未安装
- 文件权限问题

#### 解决方案
```bash
# 1. 检查 Node.js 版本
node --version
npm --version

# 2. 安装 tsx 解释器
npm install -g tsx

# 3. 检查文件权限
ls -la api/server.ts
chmod +x api/server.ts

# 4. 使用绝对路径
which node  # 获取 Node.js 路径
which tsx   # 获取 tsx 路径

# 5. 修改配置文件
# ecosystem.config.js
{
  interpreter: '/usr/local/bin/tsx',  // 使用绝对路径
  script: '/完整路径/api/server.ts'
}
```

### 问题2：环境变量不生效

#### 现象
```bash
# 启动后仍然使用开发环境配置
console.log(process.env.NODE_ENV)  // development
```

#### 原因分析
- `.env.production` 文件不存在
- PM2 配置中 `env_file` 路径错误
- 环境变量优先级问题

#### 解决方案
```bash
# 1. 检查文件是否存在
ls -la .env.production

# 2. 验证 PM2 配置
cat ecosystem.config.js | grep env_file

# 3. 检查文件内容
head .env.production

# 4. 重新启动 PM2
pm2 delete all
pm2 start ecosystem.config.js --env production

# 5. 验证环境变量
pm2 logs | grep NODE_ENV
```

### 问题3：应用频繁重启

#### 现象
```bash
pm2 status
# restart 次数不断增加
```

#### 原因分析
- 内存泄漏导致超出限制
- 端口冲突
- 数据库连接失败
- 代码错误导致崩溃

#### 解决方案
```bash
# 1. 查看错误日志
pm2 logs --err

# 2. 检查内存使用
pm2 monit

# 3. 检查端口占用
netstat -tlnp | grep :3001

# 4. 调整 PM2 配置
{
  max_memory_restart: '4G',    // 增加内存限制
  max_restarts: 5,             // 限制重启次数
  min_uptime: '30s'            // 增加最小运行时间
}

# 5. 临时停止自动重启
pm2 stop tron-energy-api
# 修复问题后再启动
pm2 start tron-energy-api
```

### 问题4：数据库连接失败

#### 现象
```bash
# 日志中出现数据库连接错误
Error: connect ECONNREFUSED 127.0.0.1:5432
```

#### 原因分析
- PostgreSQL 服务未启动
- 数据库配置错误
- 防火墙阻止连接
- 用户权限问题

#### 解决方案
```bash
# 1. 检查 PostgreSQL 状态
systemctl status postgresql
sudo systemctl start postgresql

# 2. 测试数据库连接
psql -h localhost -U postgres -d tron_energy_rental -c "SELECT 1;"

# 3. 检查配置文件
grep DB_ .env.production

# 4. 验证用户权限
sudo -u postgres psql
\du  # 查看用户列表
\l   # 查看数据库列表

# 5. 重新创建数据库用户
CREATE USER tron_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tron_energy_rental TO tron_user;
```

### 问题5：前端无法访问后端API

#### 现象
```bash
# 前端控制台错误
Failed to fetch: http://localhost:3001/api/health
```

#### 原因分析
- 跨域配置问题
- API 服务未启动
- 网络配置错误
- Nginx 代理配置问题

#### 解决方案
```bash
# 1. 检查 API 服务状态
curl http://localhost:3001/api/health

# 2. 检查 PM2 进程
pm2 status

# 3. 检查 CORS 配置
# api/app.ts
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true
}));

# 4. 检查 Vite 代理配置
# vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
}

# 5. 检查防火墙
ufw status
ufw allow 3001
```

---

## 💡 最佳实践建议

### 🔐 安全最佳实践

#### 1. 环境变量安全
```bash
# ✅ 生产环境必须修改的配置
JWT_SECRET=32位以上随机字符串
SESSION_SECRET=16位以上随机字符串
ADMIN_PASSWORD=强密码
DB_PASSWORD=强密码

# ❌ 避免在生产环境使用的配置
JWT_SECRET=default-secret
ADMIN_PASSWORD=admin123456
LOG_LEVEL=debug
VITE_VUE_DEVTOOLS=true
```

#### 2. 文件权限控制
```bash
# 设置适当的文件权限
chmod 600 .env.production      # 仅所有者可读写
chmod 644 ecosystem.config.js  # 所有者读写，其他人只读
chmod 755 deployment/scripts/  # 可执行脚本
```

#### 3. 网络安全配置
```bash
# 防火墙配置
ufw enable
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw deny 3001   # 阻止直接访问 API 端口
ufw deny 5432   # 阻止直接访问数据库端口
```

### 🚀 性能最佳实践

#### 1. PM2 集群配置
```javascript
// 根据服务器CPU核心数配置
{
  instances: 'max',          // 或具体数字，如 4
  exec_mode: 'cluster',
  max_memory_restart: '2G',  // 根据可用内存调整
}
```

#### 2. 数据库连接池优化
```env
# .env.production
DB_MAX_CONNECTIONS=50      # 根据并发需求调整
DB_IDLE_TIMEOUT=30000     # 空闲连接超时
DB_QUERY_TIMEOUT=10000    # 查询超时
```

#### 3. Redis 缓存配置
```env
# Redis 配置优化
REDIS_MAX_CONNECTIONS=20
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
```

### 📊 监控最佳实践

#### 1. 健康检查配置
```bash
# 添加到 crontab
*/5 * * * * /www/wwwroot/tron-energy-rental/deployment/scripts/health-check.sh -q -r
```

#### 2. 关键指标监控
```bash
# 设置告警阈值
CPU_THRESHOLD=80%          # CPU使用率告警
MEMORY_THRESHOLD=85%       # 内存使用率告警
DISK_THRESHOLD=90%         # 磁盘使用率告警
API_RESPONSE_TIME=500ms    # API响应时间告警
ERROR_RATE=5%              # 错误率告警
```

#### 3. 日志管理策略
```javascript
// PM2 日志配置
{
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  combine_logs: true,
  merge_logs: true,
  log_file: './logs/api-combined.log',
  out_file: './logs/api-out.log',
  error_file: './logs/api-error.log'
}
```

### 🔄 运维最佳实践

#### 1. 部署流程标准化
```bash
#!/bin/bash
# 标准部署脚本

# 1. 备份当前版本
pm2 save

# 2. 更新代码
git pull origin main

# 3. 安装依赖
pnpm install

# 4. 构建前端
pnpm run build

# 5. 运行数据库迁移
pnpm run migrate

# 6. 零停机重启
pm2 reload ecosystem.config.js --env production

# 7. 健康检查
sleep 10
curl -f http://localhost:3001/api/health || exit 1

echo "部署成功！"
```

#### 2. 定期维护任务
```bash
# 每日任务
0 2 * * * /www/wwwroot/tron-energy-rental/scripts/daily-maintenance.sh

# 包含：
# - 数据库备份
# - 日志清理
# - 性能统计
# - 安全检查
```

#### 3. 故障恢复计划
```bash
# 灾难恢复脚本
./deployment/scripts/disaster-recovery.sh

# 包含：
# - 数据恢复
# - 服务重启
# - 配置恢复
# - 健康验证
```

### 📈 扩展性最佳实践

#### 1. 负载均衡准备
```nginx
# Nginx 负载均衡配置
upstream tron_api {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    server localhost:3004;
}
```

#### 2. 数据库读写分离
```env
# 主从数据库配置
DB_MASTER_URL=postgresql://user:pass@master:5432/db
DB_SLAVE_URL=postgresql://user:pass@slave:5432/db
```

#### 3. 微服务架构预留
```javascript
// 按功能模块分离服务
{
  apps: [
    {
      name: 'tron-api-core',
      script: './api/core/server.ts'
    },
    {
      name: 'tron-api-telegram',
      script: './api/telegram/server.ts'
    },
    {
      name: 'tron-api-payment',
      script: './api/payment/server.ts'
    }
  ]
}
```

---

## 📚 参考资料

### 官方文档
- [PM2 官方文档](https://pm2.keymetrics.io/docs/)
- [Node.js 环境变量最佳实践](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PostgreSQL 配置指南](https://www.postgresql.org/docs/current/runtime-config.html)

### 相关项目文档
- `deployment/宝塔面板部署指南.md` - 详细部署指南
- `deployment/README.md` - 快速部署指南
- `deployment/configs/` - 配置文件示例

### 社区资源
- [PM2 最佳实践](https://github.com/Unitech/pm2/blob/master/ADVANCED_README.md)
- [Node.js 生产环境清单](https://github.com/i0natan/nodebestpractices)

---

## 🎯 总结

### 核心要点
1. **环境配置**：`.env.production` 仅在 PM2 部署时自动加载
2. **PM2 优势**：生产级进程管理，自动重启，集群支持
3. **安全配置**：必须修改所有默认密码和密钥
4. **监控运维**：建立完善的健康检查和告警机制

### 推荐架构
```
开发环境: npm run dev (使用 .env)
测试环境: PM2 (使用 .env.test)
生产环境: PM2 (使用 .env.production)
```

### 部署检查清单
- [ ] 创建并配置 `.env.production` 文件
- [ ] 修改所有默认密码和密钥
- [ ] 配置 PM2 ecosystem.config.js
- [ ] 启动 PM2 并验证状态
- [ ] 配置开机自启
- [ ] 设置健康检查
- [ ] 配置监控告警
- [ ] 测试故障恢复

**祝您部署顺利！** 🚀

---

*最后更新：2025年9月20日*
*如有问题，请参考相关文档或联系技术支持。*
