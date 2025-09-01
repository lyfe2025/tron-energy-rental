# TRON能量租赁系统 - 部署指南

## 📋 概述

本文档提供TRON能量租赁系统的完整部署指南，包括传统部署和Docker容器化部署两种方式。

## 🏗️ 部署架构

```
deployment/
├── scripts/           # 部署脚本
│   ├── check-environment.sh    # 环境检查脚本
│   ├── deploy.sh               # 一键部署脚本
│   └── docker-deploy.sh        # Docker部署脚本
├── configs/           # 服务器配置文件
│   ├── nginx.conf              # Nginx配置
│   └── pm2.config.js           # PM2进程管理配置
├── docker/            # Docker相关文件
│   ├── Dockerfile              # Docker镜像构建
│   ├── docker-compose.yml      # 容器编排配置
│   ├── docker-compose.dev.yml  # 开发环境配置
│   ├── entrypoint.sh           # 容器启动脚本
│   ├── redis.conf              # Redis配置
│   └── .dockerignore           # Docker忽略文件
└── templates/         # 配置模板
    ├── env.production.template  # 生产环境配置模板
    └── env.development.template # 开发环境配置模板
```

## 🔧 系统要求

### 最低配置
- **操作系统**: Ubuntu 18.04+ / CentOS 7+ / macOS 10.15+
- **CPU**: 2核心
- **内存**: 2GB RAM
- **磁盘**: 20GB可用空间
- **网络**: 稳定的互联网连接

### 推荐配置
- **操作系统**: Ubuntu 20.04+ / CentOS 8+
- **CPU**: 4核心
- **内存**: 4GB RAM
- **磁盘**: 50GB可用空间 (SSD推荐)

### 必需软件
- **Node.js**: >= 18.x
- **PostgreSQL**: >= 12.x
- **Redis**: >= 6.x
- **Git**: 最新版本
- **Nginx**: 最新版本 (可选)
- **PM2**: 最新版本 (推荐)

## 📦 部署方式

### 方式一：传统部署

#### 1. 环境检查

```bash
# 运行环境检查脚本
./deployment/scripts/check-environment.sh
```

环境检查脚本会自动检测：
- 操作系统兼容性
- Node.js版本
- 数据库连接
- Redis服务
- 端口占用情况
- 磁盘空间和内存

#### 2. 一键部署

```bash
# 使用默认配置部署到生产环境
./deployment/scripts/deploy.sh

# 部署到开发环境
./deployment/scripts/deploy.sh -e development

# 跳过测试和备份的快速部署
./deployment/scripts/deploy.sh --skip-tests --skip-backup

# 查看所有选项
./deployment/scripts/deploy.sh --help
```

#### 3. 手动部署步骤

如果需要手动控制部署过程：

```bash
# 1. 克隆项目
git clone <repository-url>
cd tron-energy-rental

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp deployment/templates/env.production.template .env.production
# 编辑 .env.production 文件

# 4. 数据库迁移
pnpm run migrate

# 5. 构建项目
pnpm run build

# 6. 启动服务
pnpm run dev:api
```

### 方式二：Docker容器化部署

#### 1. 前置条件

确保已安装Docker和Docker Compose：

```bash
# 安装Docker (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. 快速启动

```bash
# 生产环境部署
./deployment/scripts/docker-deploy.sh up

# 开发环境部署
./deployment/scripts/docker-deploy.sh -e development up

# 包含监控和Telegram机器人
./deployment/scripts/docker-deploy.sh --with-monitoring --with-telegram up
```

#### 3. Docker命令详解

```bash
# 查看服务状态
./deployment/scripts/docker-deploy.sh status

# 查看服务日志
./deployment/scripts/docker-deploy.sh logs
./deployment/scripts/docker-deploy.sh logs api  # 查看特定服务日志

# 重启服务
./deployment/scripts/docker-deploy.sh restart

# 停止服务
./deployment/scripts/docker-deploy.sh down

# 备份数据
./deployment/scripts/docker-deploy.sh backup

# 恢复数据
./deployment/scripts/docker-deploy.sh restore /path/to/backup.sql

# 清理资源
./deployment/scripts/docker-deploy.sh clean
```

## ⚙️ 配置说明

### 环境变量配置

复制并编辑环境配置文件：

```bash
# 生产环境
cp deployment/templates/env.production.template .env.production

# 开发环境
cp deployment/templates/env.development.template .env.development
```

#### 重要配置项

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tron_energy_rental
DB_USER=tron_user
DB_PASSWORD=your_secure_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters

# TRON网络配置
TRON_NETWORK=mainnet  # 或 testnet
TRON_API_KEY=your_tron_api_key
TRON_PRIVATE_KEY=your_tron_private_key

# Telegram机器人配置
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### Nginx配置

生产环境建议使用Nginx作为反向代理：

```bash
# 复制Nginx配置
sudo cp deployment/configs/nginx.conf /etc/nginx/sites-available/tron-energy-rental
sudo ln -s /etc/nginx/sites-available/tron-energy-rental /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx
```

### PM2配置

使用PM2管理Node.js进程：

```bash
# 启动服务
pm2 start deployment/configs/pm2.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

## 🔒 安全配置

### 防火墙设置

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### SSL证书配置

使用Let's Encrypt免费SSL证书：

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 数据库安全

```bash
# PostgreSQL安全配置
sudo -u postgres psql

-- 创建专用用户
CREATE USER tron_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE tron_energy_rental OWNER tron_user;
GRANT ALL PRIVILEGES ON DATABASE tron_energy_rental TO tron_user;

-- 限制连接
ALTER USER tron_user CONNECTION LIMIT 20;
```

## 📊 监控和日志

### 系统监控

```bash
# 查看系统状态
htop
df -h
free -h

# 查看端口占用
netstat -tulnp | grep :3001

# 查看进程
ps aux | grep node
```

### 应用监控

```bash
# PM2监控
pm2 monit

# 查看API健康状态
curl http://localhost:3001/api/health

# 查看应用日志
tail -f /var/log/tron-energy-rental/app.log
```

### Docker监控

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs tron-energy-api

# 查看容器资源使用
docker stats

# 进入容器
docker exec -it tron-energy-api sh
```

## 🔄 维护操作

### 数据备份

```bash
# 传统部署备份
./deployment/scripts/deploy.sh --backup-only

# Docker部署备份
./deployment/scripts/docker-deploy.sh backup

# 手动数据库备份
pg_dump -h localhost -U tron_user -d tron_energy_rental > backup.sql
```

### 应用更新

```bash
# 传统部署更新
git pull origin main
./deployment/scripts/deploy.sh

# Docker部署更新
git pull origin main
./deployment/scripts/docker-deploy.sh --rebuild up
```

### 日志轮转

```bash
# 配置logrotate
sudo nano /etc/logrotate.d/tron-energy-rental

# 内容：
/var/log/tron-energy-rental/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 appuser appuser
    postrotate
        pm2 reload all > /dev/null 2>&1 || true
    endscript
}
```

## 🚨 故障排除

### 常见问题

#### 1. 端口被占用

```bash
# 查找占用进程
sudo lsof -i :3001

# 杀死进程
sudo kill -9 <PID>
```

#### 2. 数据库连接失败

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 重启PostgreSQL
sudo systemctl restart postgresql

# 检查连接
psql -h localhost -U tron_user -d tron_energy_rental
```

#### 3. Redis连接失败

```bash
# 检查Redis状态
sudo systemctl status redis

# 重启Redis
sudo systemctl restart redis

# 测试连接
redis-cli ping
```

#### 4. 内存不足

```bash
# 检查内存使用
free -h

# 清理缓存
sudo echo 3 > /proc/sys/vm/drop_caches

# 重启服务
pm2 restart all
```

### 日志位置

```bash
# 应用日志
/var/log/tron-energy-rental/app.log

# Nginx日志
/var/log/nginx/tron-energy-access.log
/var/log/nginx/tron-energy-error.log

# PM2日志
~/.pm2/logs/

# 系统日志
/var/log/syslog
```

## 📈 性能优化

### 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';
```

### 缓存优化

```bash
# Redis内存优化
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 256mb
```

### 应用优化

```javascript
// Node.js优化选项
node --max-old-space-size=2048 api/server.js
```

## 🔧 开发环境设置

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd tron-energy-rental

# 安装依赖
pnpm install

# 复制环境配置
cp deployment/templates/env.development.template .env.development

# 启动开发服务器
pnpm run dev
```

### Docker开发环境

```bash
# 启动开发环境
./deployment/scripts/docker-deploy.sh -e development up

# 查看日志
./deployment/scripts/docker-deploy.sh -e development logs
```

## 📞 技术支持

如遇到部署问题，请查看：

1. **日志文件**: 检查应用和系统日志
2. **健康检查**: 确认服务健康状态
3. **网络连接**: 验证数据库和Redis连接
4. **端口状态**: 确认端口未被占用
5. **权限问题**: 检查文件和目录权限

## 📝 更新日志

- **v1.0.0**: 初始版本发布
- **v1.1.0**: 添加Docker支持
- **v1.2.0**: 增强监控和日志功能

---

> 📧 如需更多帮助，请联系技术支持团队
