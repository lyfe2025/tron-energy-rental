# 🚀 TRON能量租赁系统 - 宝塔面板快速部署指南

> **适用场景：** 全新云服务器 + 宝塔面板部署  
> **预计时间：** 30-60分钟  
> **难度等级：** ⭐⭐☆☆☆ (中等)

## 📋 快速开始

### 🎯 一键自动部署（推荐）

```bash
# 1. 下载并运行安装脚本
wget https://raw.githubusercontent.com/your-repo/tron-energy-rental/main/deployment/scripts/install.sh
chmod +x install.sh
sudo ./install.sh

# 2. 上传项目代码到 /www/wwwroot/tron-energy-rental

# 3. 运行部署脚本
cd /www/wwwroot/tron-energy-rental
./deployment/scripts/deploy.sh
```

### 🔧 手动分步部署

如果自动部署遇到问题，可以按照以下步骤手动部署：

#### 步骤1：准备宝塔环境
```bash
# 安装宝塔面板（如未安装）
# Ubuntu/Debian
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh

# CentOS
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh
```

#### 步骤2：在宝塔面板安装软件
登录宝塔面板，在软件商店安装：
- ✅ Nginx (1.20+)
- ✅ PostgreSQL (13+) 
- ✅ Redis (6.0+)
- ✅ Node.js (18+)

#### 步骤3：配置数据库
```bash
# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE tron_energy_rental;
CREATE USER tron_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tron_energy_rental TO tron_user;
ALTER DATABASE tron_energy_rental OWNER TO tron_user;
\q
```

#### 步骤4：部署项目
```bash
# 创建项目目录
mkdir -p /www/wwwroot/tron-energy-rental
cd /www/wwwroot/tron-energy-rental

# 上传/克隆项目代码
git clone [your-repo-url] .

# 复制配置文件
cp deployment/configs/.env.production.template .env.production

# 编辑配置文件（修改域名、密码等）
nano .env.production

# 安装依赖
npm install -g pnpm pm2
pnpm install

# 构建项目
pnpm run build

# 运行数据库迁移
pnpm run migrate

# 启动服务
cp deployment/configs/ecosystem.config.js ./
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 步骤5：配置Nginx
在宝塔面板中：
1. 创建站点：域名设置为你的域名，目录指向 `/www/wwwroot/tron-energy-rental/dist`
2. 配置SSL证书（推荐Let's Encrypt）
3. 修改Nginx配置（参考 `deployment/configs/nginx-same-server.conf`）

---

## 📁 文件结构说明

```
deployment/
├── README.md                          # 本文件
├── 宝塔面板部署指南.md                    # 详细部署文档
├── configs/                           # 配置文件
│   ├── .env.production.template       # 环境变量模板
│   ├── ecosystem.config.js            # PM2配置
│   └── nginx-same-server.conf         # Nginx配置示例
└── scripts/                          # 自动化脚本
    ├── install.sh                     # 一键环境安装
    ├── deploy.sh                      # 自动化部署
    └── health-check.sh                # 健康检查
```

---

## 🔍 部署验证

### 检查服务状态
```bash
# PM2进程状态
pm2 status

# API健康检查
curl http://localhost:3001/api/health

# 前端访问测试
curl -I https://yourdomain.com

# 运行健康检查脚本
./deployment/scripts/health-check.sh
```

### 功能测试
```bash
# 测试登录API
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"your_admin_password"}'
```

---

## 🛠️ 常用管理命令

### 服务管理
```bash
# 查看服务状态
pm2 status

# 重启服务
pm2 restart ecosystem.config.js

# 查看日志
pm2 logs

# 停止服务
pm2 stop ecosystem.config.js

# 删除服务
pm2 delete ecosystem.config.js
```

### 数据库管理
```bash
# 连接数据库
psql postgresql://tron_user:password@localhost:5432/tron_energy_rental

# 备份数据库
pg_dump -h localhost -U tron_user -d tron_energy_rental > backup.sql

# 恢复数据库
psql -h localhost -U tron_user -d tron_energy_rental < backup.sql

# 运行迁移
pnpm run migrate
```

### 项目更新
```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
pnpm install

# 重新构建
pnpm run build

# 运行迁移（如有）
pnpm run migrate

# 重启服务
pm2 restart ecosystem.config.js
```

---

## ❗ 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
netstat -tlnp | grep :3001
lsof -i :3001

# 杀死进程
kill -9 [进程ID]
```

### 2. 权限问题
```bash
# 设置正确权限
chown -R www-data:www-data /www/wwwroot/tron-energy-rental
chmod -R 755 /www/wwwroot/tron-energy-rental
```

### 3. 数据库连接失败
```bash
# 检查PostgreSQL状态
systemctl status postgresql

# 测试连接
psql -h localhost -U tron_user -d tron_energy_rental -c "SELECT 1;"
```

### 4. Nginx配置错误
```bash
# 测试配置语法
nginx -t

# 重载配置
systemctl reload nginx

# 查看错误日志
tail -f /var/log/nginx/error.log
```

### 5. Node.js内存不足
```bash
# 增加内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 或在PM2配置中添加
node_args: '--max-old-space-size=4096'
```

---

## 🔒 安全配置建议

### 必要的安全措施
1. **修改默认密码**
   - 数据库密码
   - 管理员密码  
   - JWT密钥

2. **启用HTTPS**
   - 申请SSL证书
   - 强制HTTPS重定向

3. **配置防火墙**
   - 只开放必要端口（80, 443, SSH）
   - 修改SSH默认端口

4. **定期备份**
   - 设置自动数据库备份
   - 备份重要配置文件

### 推荐的安全配置
```bash
# 安装fail2ban防暴力破解
apt install fail2ban

# 配置自动更新
apt install unattended-upgrades

# 设置防火墙
ufw enable
ufw allow 80
ufw allow 443
ufw allow [your-ssh-port]
```

---

## 📊 监控设置

### 设置定时健康检查
```bash
# 编辑crontab
crontab -e

# 添加健康检查（每5分钟）
*/5 * * * * /www/wwwroot/tron-energy-rental/deployment/scripts/health-check.sh -q -r

# 添加日志清理（每日）
0 2 * * * find /www/wwwroot/tron-energy-rental/logs -name "*.log" -mtime +7 -delete
```

### 监控面板集成
如果使用宝塔面板的监控功能：
1. 启用系统资源监控
2. 设置告警阈值
3. 配置通知方式

---

## 📞 技术支持

如果在部署过程中遇到问题：

1. **查看日志**
   ```bash
   # PM2日志
   pm2 logs
   
   # Nginx日志
   tail -f /var/log/nginx/error.log
   
   # 应用日志
   tail -f /www/wwwroot/tron-energy-rental/logs/api-error.log
   ```

2. **运行诊断**
   ```bash
   # 健康检查
   ./deployment/scripts/health-check.sh
   
   # 系统状态
   systemctl status nginx postgresql redis
   ```

3. **常用调试命令**
   ```bash
   # 检查网络连通性
   curl -I http://localhost:3001/api/health
   
   # 检查进程状态
   ps aux | grep -E "node|nginx|postgres|redis"
   
   # 检查端口监听
   ss -tlnp | grep -E ":80|:443|:3001|:5432|:6379"
   ```

---

## 🎉 部署成功

恭喜！如果你看到了这里，说明部署已经完成。

**访问地址：**
- 前端：https://yourdomain.com
- API：https://yourdomain.com/api
- 管理员登录：使用配置的管理员账号密码

**下一步建议：**
1. 完善系统配置
2. 导入初始数据
3. 配置监控告警
4. 设置备份策略
5. 进行压力测试

祝你使用愉快！🚀
