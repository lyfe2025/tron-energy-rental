#!/bin/bash

# =================================================================================================
# TRON能量租赁系统 - 宝塔面板一键安装脚本
# =================================================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置变量
PROJECT_NAME="tron-energy-rental"
PROJECT_PATH="/www/wwwroot/${PROJECT_NAME}"
DB_NAME="tron_energy_rental"
DB_USER="tron_user"

# 打印函数
print_banner() {
    echo -e "${CYAN}=================================================================${NC}"
    echo -e "${CYAN}🚀 TRON能量租赁系统 - 宝塔面板一键安装脚本${NC}"
    echo -e "${CYAN}=================================================================${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用root用户运行此脚本"
        exit 1
    fi
}

# 检查宝塔面板是否已安装
check_bt_panel() {
    if [ ! -f "/www/server/panel/BT-Panel" ]; then
        log_error "未检测到宝塔面板，请先安装宝塔面板"
        echo "安装命令："
        echo "Ubuntu: wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh"
        echo "CentOS: yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh"
        exit 1
    fi
    log_success "检测到宝塔面板"
}

# 安装Node.js
install_nodejs() {
    log_step "安装Node.js..."
    
    # 检查是否已安装Node.js 18+
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//')
        if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" = "18.0.0" ]; then
            log_success "Node.js $NODE_VERSION 已安装"
            return
        fi
    fi
    
    # 安装NodeJS管理器
    if [ ! -d "/www/server/nodejs" ]; then
        log_info "通过宝塔面板安装Node.js..."
        echo "请手动在宝塔面板软件商店安装 Node.js 版本管理器，并安装 Node.js 18+"
        echo "安装完成后重新运行此脚本"
        exit 1
    fi
    
    # 安装Node.js 18
    /www/server/nodejs/install.sh 18
    
    # 设置软链接
    ln -sf /www/server/nodejs/v18.*/bin/node /usr/local/bin/node
    ln -sf /www/server/nodejs/v18.*/bin/npm /usr/local/bin/npm
    ln -sf /www/server/nodejs/v18.*/bin/npx /usr/local/bin/npx
    
    log_success "Node.js 18 安装完成"
}

# 安装pnpm和PM2
install_node_tools() {
    log_step "安装pnpm和PM2..."
    
    # 安装pnpm
    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm
        ln -sf /www/server/nodejs/v18.*/bin/pnpm /usr/local/bin/pnpm
        log_success "pnpm安装完成"
    else
        log_success "pnpm已安装"
    fi
    
    # 安装PM2
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
        ln -sf /www/server/nodejs/v18.*/bin/pm2 /usr/local/bin/pm2
        log_success "PM2安装完成"
    else
        log_success "PM2已安装"
    fi
}

# 安装PostgreSQL
install_postgresql() {
    log_step "配置PostgreSQL..."
    
    # 检查PostgreSQL是否通过宝塔安装
    if [ ! -d "/www/server/pgsql" ]; then
        log_info "请在宝塔面板软件商店安装PostgreSQL"
        echo "安装完成后重新运行此脚本"
        exit 1
    fi
    
    # 启动PostgreSQL服务
    systemctl enable postgresql
    systemctl start postgresql
    
    log_success "PostgreSQL配置完成"
}

# 安装Redis
install_redis() {
    log_step "配置Redis..."
    
    # 检查Redis是否通过宝塔安装
    if [ ! -d "/www/server/redis" ]; then
        log_info "请在宝塔面板软件商店安装Redis"
        echo "安装完成后重新运行此脚本"
        exit 1
    fi
    
    # 启动Redis服务
    systemctl enable redis
    systemctl start redis
    
    log_success "Redis配置完成"
}

# 创建数据库和用户
setup_database() {
    log_step "设置数据库..."
    
    # 提示用户输入数据库密码
    echo -e "${YELLOW}请设置数据库密码：${NC}"
    read -s -p "数据库密码: " DB_PASSWORD
    echo ""
    read -s -p "确认密码: " DB_PASSWORD_CONFIRM
    echo ""
    
    if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
        log_error "密码不匹配，请重新运行脚本"
        exit 1
    fi
    
    # 创建数据库和用户
    sudo -u postgres psql << EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
\q
EOF
    
    log_success "数据库创建完成"
    
    # 保存数据库配置
    echo "DB_PASSWORD=${DB_PASSWORD}" > /tmp/db_config
}

# 创建项目目录
setup_project_directory() {
    log_step "创建项目目录..."
    
    # 创建项目目录
    mkdir -p $PROJECT_PATH
    cd $PROJECT_PATH
    
    # 创建必要的子目录
    mkdir -p logs
    mkdir -p public/uploads
    mkdir -p backups
    
    # 设置权限
    chown -R www-data:www-data $PROJECT_PATH
    chmod -R 755 $PROJECT_PATH
    
    log_success "项目目录创建完成: $PROJECT_PATH"
}

# 生成环境配置文件
generate_env_config() {
    log_step "生成环境配置文件..."
    
    # 获取服务器IP
    SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
    
    # 生成随机密钥
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    CSRF_SECRET=$(openssl rand -base64 32)
    
    # 读取数据库密码
    source /tmp/db_config
    
    # 生成.env.production文件
    cat > $PROJECT_PATH/.env.production << EOF
# TRON能量租赁系统 - 生产环境配置
NODE_ENV=production

# 前端配置
VITE_VUE_DEVTOOLS=false
VITE_PORT=5173
VITE_HOST=0.0.0.0
VITE_API_URL=http://${SERVER_IP}
VITE_ALLOWED_HOSTS=${SERVER_IP},localhost,127.0.0.1

# 后端配置
PORT=3001
HOST_ADDRESS=127.0.0.1

# 数据库配置
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SCHEMA=tron_energy
DB_SSL=false
DB_MAX_CONNECTIONS=50

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=tron_energy

# 安全配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
SESSION_SECRET=${SESSION_SECRET}
CSRF_SECRET=${CSRF_SECRET}
BCRYPT_ROUNDS=12

# 系统配置
ADMIN_EMAIL=admin@${SERVER_IP}
ADMIN_PASSWORD=admin123456
LOG_LEVEL=info
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=50
EOF
    
    log_success "环境配置文件生成完成"
    log_warning "请修改 $PROJECT_PATH/.env.production 中的域名和密码配置"
    
    # 清理临时文件
    rm -f /tmp/db_config
}

# 创建systemd服务文件
create_systemd_service() {
    log_step "创建systemd服务..."
    
    cat > /etc/systemd/system/tron-energy-rental.service << EOF
[Unit]
Description=TRON Energy Rental System
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${PROJECT_PATH}
Environment=NODE_ENV=production
ExecStart=/usr/local/bin/pm2-runtime start ecosystem.config.js --env production
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    log_success "systemd服务创建完成"
}

# 生成Nginx配置
generate_nginx_config() {
    log_step "生成Nginx配置..."
    
    # 获取服务器IP
    SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
    
    cat > /www/server/panel/vhost/nginx/${PROJECT_NAME}.conf << EOF
server {
    listen 80;
    server_name ${SERVER_IP} localhost;
    
    # 前端静态文件
    location / {
        root ${PROJECT_PATH}/dist;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存配置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传
    location /uploads {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 安全配置
    location ~ /\. {
        deny all;
    }
}
EOF
    
    # 测试Nginx配置
    nginx -t
    systemctl reload nginx
    
    log_success "Nginx配置生成完成"
}

# 创建快捷脚本
create_shortcuts() {
    log_step "创建管理脚本..."
    
    # 创建启动脚本
    cat > $PROJECT_PATH/start.sh << 'EOF'
#!/bin/bash
cd /www/wwwroot/tron-energy-rental
pm2 start ecosystem.config.js --env production
pm2 save
echo "✅ 服务启动完成"
EOF
    
    # 创建停止脚本
    cat > $PROJECT_PATH/stop.sh << 'EOF'
#!/bin/bash
cd /www/wwwroot/tron-energy-rental
pm2 stop ecosystem.config.js
echo "⏹️ 服务停止完成"
EOF
    
    # 创建重启脚本
    cat > $PROJECT_PATH/restart.sh << 'EOF'
#!/bin/bash
cd /www/wwwroot/tron-energy-rental
pm2 restart ecosystem.config.js
echo "🔄 服务重启完成"
EOF
    
    # 创建状态检查脚本
    cat > $PROJECT_PATH/status.sh << 'EOF'
#!/bin/bash
echo "📊 PM2进程状态："
pm2 status
echo ""
echo "🔗 数据库连接测试："
cd /www/wwwroot/tron-energy-rental
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://tron_user:password@localhost:5432/tron_energy_rental'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ 数据库连接正常:', res.rows[0].now);
  }
  pool.end();
});
"
echo ""
echo "📡 API健康检查："
curl -s http://localhost:3001/api/health || echo "❌ API服务未响应"
EOF
    
    # 设置执行权限
    chmod +x $PROJECT_PATH/*.sh
    
    log_success "管理脚本创建完成"
}

# 显示安装结果
show_result() {
    echo ""
    log_success "🎉 TRON能量租赁系统基础环境安装完成！"
    echo ""
    echo -e "${CYAN}📁 项目目录：${NC} $PROJECT_PATH"
    echo -e "${CYAN}🌐 访问地址：${NC} http://$(curl -s ifconfig.me)"
    echo -e "${CYAN}📊 API地址：${NC} http://$(curl -s ifconfig.me)/api"
    echo ""
    echo -e "${YELLOW}⚠️  下一步操作：${NC}"
    echo "1. 上传项目源代码到: $PROJECT_PATH"
    echo "2. 修改配置文件: $PROJECT_PATH/.env.production"
    echo "3. 运行部署脚本: $PROJECT_PATH/deployment/scripts/deploy.sh"
    echo ""
    echo -e "${YELLOW}📋 管理命令：${NC}"
    echo "启动服务: $PROJECT_PATH/start.sh"
    echo "停止服务: $PROJECT_PATH/stop.sh"
    echo "重启服务: $PROJECT_PATH/restart.sh"
    echo "查看状态: $PROJECT_PATH/status.sh"
    echo ""
    echo -e "${YELLOW}🔍 服务检查：${NC}"
    echo "PM2状态: pm2 status"
    echo "查看日志: pm2 logs"
    echo "Nginx状态: systemctl status nginx"
    echo "数据库状态: systemctl status postgresql"
    echo ""
    echo -e "${RED}⚠️  安全提醒：${NC}"
    echo "1. 修改数据库密码和管理员密码"
    echo "2. 配置SSL证书"
    echo "3. 设置防火墙规则"
    echo "4. 定期备份数据"
    echo ""
}

# 主函数
main() {
    print_banner
    
    log_info "开始安装TRON能量租赁系统..."
    
    check_root
    check_bt_panel
    install_nodejs
    install_node_tools
    install_postgresql
    install_redis
    setup_database
    setup_project_directory
    generate_env_config
    create_systemd_service
    generate_nginx_config
    create_shortcuts
    
    show_result
}

# 错误处理
trap 'log_error "安装过程中发生错误，请检查日志"; exit 1' ERR

# 显示帮助
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "TRON能量租赁系统 - 宝塔面板一键安装脚本"
    echo ""
    echo "使用方法:"
    echo "  sudo ./install.sh"
    echo ""
    echo "此脚本将："
    echo "  1. 检查宝塔面板环境"
    echo "  2. 安装Node.js、pnpm、PM2"
    echo "  3. 配置PostgreSQL和Redis"
    echo "  4. 创建项目目录和配置文件"
    echo "  5. 生成Nginx配置"
    echo "  6. 创建管理脚本"
    echo ""
    echo "安装完成后，请上传项目代码并运行deploy.sh完成部署"
    exit 0
fi

# 执行主函数
main "$@"
