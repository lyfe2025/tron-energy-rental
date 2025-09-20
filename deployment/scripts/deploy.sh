#!/bin/bash

# =================================================================================================
# TRON能量租赁系统 - 宝塔面板自动化部署脚本
# =================================================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="tron-energy-rental"
PROJECT_PATH="/www/wwwroot/${PROJECT_NAME}"
NGINX_CONFIG_PATH="/www/server/panel/vhost/nginx"
BACKUP_PATH="/www/backup/${PROJECT_NAME}"

# 函数：打印信息
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

# 函数：检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 命令未找到，请先安装"
        exit 1
    fi
}

# 函数：检查服务状态
check_service() {
    if systemctl is-active --quiet $1; then
        log_success "$1 服务运行正常"
    else
        log_error "$1 服务未运行"
        exit 1
    fi
}

# 函数：创建备份
create_backup() {
    log_info "创建数据备份..."
    
    # 创建备份目录
    mkdir -p ${BACKUP_PATH}/$(date +%Y%m%d_%H%M%S)
    CURRENT_BACKUP="${BACKUP_PATH}/$(date +%Y%m%d_%H%M%S)"
    
    # 备份数据库
    if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
        log_info "备份PostgreSQL数据库..."
        pg_dump -h localhost -U $DB_USER -d $DB_NAME > ${CURRENT_BACKUP}/database.sql
        log_success "数据库备份完成"
    fi
    
    # 备份配置文件
    if [ -f "${PROJECT_PATH}/.env.production" ]; then
        cp ${PROJECT_PATH}/.env.production ${CURRENT_BACKUP}/
        log_success "配置文件备份完成"
    fi
    
    # 备份上传文件
    if [ -d "${PROJECT_PATH}/public/uploads" ]; then
        cp -r ${PROJECT_PATH}/public/uploads ${CURRENT_BACKUP}/
        log_success "上传文件备份完成"
    fi
}

# 函数：检查系统环境
check_environment() {
    log_info "检查系统环境..."
    
    # 检查必要的命令
    check_command "node"
    check_command "npm"
    check_command "pm2"
    check_command "nginx"
    check_command "psql"
    check_command "redis-cli"
    
    # 检查Node.js版本
    NODE_VERSION=$(node -v | sed 's/v//')
    REQUIRED_NODE_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
        log_error "Node.js版本过低，需要 >= $REQUIRED_NODE_VERSION，当前版本: $NODE_VERSION"
        exit 1
    fi
    log_success "Node.js版本检查通过: $NODE_VERSION"
    
    # 检查服务状态
    check_service "postgresql"
    check_service "redis-server"
    check_service "nginx"
    
    log_success "系统环境检查完成"
}

# 函数：安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    cd $PROJECT_PATH
    
    # 检查是否有pnpm
    if command -v pnpm &> /dev/null; then
        log_info "使用pnpm安装依赖..."
        pnpm install --production
    else
        log_info "使用npm安装依赖..."
        npm install --production
    fi
    
    log_success "依赖安装完成"
}

# 函数：构建项目
build_project() {
    log_info "构建项目..."
    
    cd $PROJECT_PATH
    
    # 清理旧的构建文件
    rm -rf dist
    rm -rf node_modules/.cache
    
    # 构建前端
    if command -v pnpm &> /dev/null; then
        pnpm run build
    else
        npm run build
    fi
    
    log_success "项目构建完成"
}

# 函数：数据库迁移
migrate_database() {
    log_info "执行数据库迁移..."
    
    cd $PROJECT_PATH
    
    # 检查数据库连接
    if ! psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" &> /dev/null; then
        log_error "数据库连接失败，请检查配置"
        exit 1
    fi
    
    # 执行迁移
    if command -v pnpm &> /dev/null; then
        pnpm run migrate
    else
        npm run migrate
    fi
    
    log_success "数据库迁移完成"
}

# 函数：配置PM2
setup_pm2() {
    log_info "配置PM2进程管理..."
    
    cd $PROJECT_PATH
    
    # 停止旧的进程
    pm2 stop ecosystem.config.js || true
    pm2 delete ecosystem.config.js || true
    
    # 复制配置文件
    cp deployment/configs/ecosystem.config.js ./
    
    # 启动新进程
    pm2 start ecosystem.config.js --env production
    
    # 保存配置
    pm2 save
    
    # 设置开机自启
    pm2 startup
    
    log_success "PM2配置完成"
}

# 函数：配置Nginx
setup_nginx() {
    log_info "配置Nginx..."
    
    # 检查Nginx配置语法
    nginx -t
    
    # 重载Nginx配置
    systemctl reload nginx
    
    log_success "Nginx配置完成"
}

# 函数：验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 等待服务启动
    sleep 10
    
    # 检查PM2进程状态
    if pm2 list | grep -q "online"; then
        log_success "PM2进程运行正常"
    else
        log_error "PM2进程启动失败"
        pm2 logs --lines 20
        exit 1
    fi
    
    # 检查API健康状态
    if curl -f -s http://localhost:3001/api/health > /dev/null; then
        log_success "API服务健康检查通过"
    else
        log_error "API服务健康检查失败"
        exit 1
    fi
    
    # 检查前端文件
    if [ -f "${PROJECT_PATH}/dist/index.html" ]; then
        log_success "前端文件存在"
    else
        log_error "前端文件不存在"
        exit 1
    fi
    
    log_success "部署验证完成"
}

# 函数：清理
cleanup() {
    log_info "清理临时文件..."
    
    cd $PROJECT_PATH
    
    # 清理缓存
    rm -rf node_modules/.cache
    rm -rf .vite
    
    # 清理日志（保留最近7天）
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log_success "清理完成"
}

# 主函数
main() {
    log_info "开始部署TRON能量租赁系统..."
    
    # 检查是否在正确的目录
    if [ ! -f "package.json" ]; then
        log_error "未找到package.json，请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 加载环境变量
    if [ -f ".env.production" ]; then
        source .env.production
        log_info "已加载生产环境配置"
    else
        log_warning "未找到.env.production文件，使用默认配置"
    fi
    
    # 执行部署步骤
    check_environment
    create_backup
    install_dependencies
    build_project
    migrate_database
    setup_pm2
    setup_nginx
    verify_deployment
    cleanup
    
    log_success "🎉 部署完成！"
    log_info "项目地址: ${PROJECT_PATH}"
    log_info "PM2状态: pm2 status"
    log_info "查看日志: pm2 logs"
    log_info "健康检查: curl http://localhost:3001/api/health"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 脚本帮助信息
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "TRON能量租赁系统 - 宝塔面板部署脚本"
    echo ""
    echo "使用方法:"
    echo "  ./deploy.sh                 执行完整部署"
    echo "  ./deploy.sh --help          显示帮助信息"
    echo ""
    echo "环境要求:"
    echo "  - Node.js >= 18.0.0"
    echo "  - PostgreSQL >= 13"
    echo "  - Redis >= 6.0"
    echo "  - Nginx"
    echo "  - PM2"
    echo ""
    echo "部署前请确保:"
    echo "  1. 已配置.env.production文件"
    echo "  2. 数据库服务正常运行"
    echo "  3. 有足够的磁盘空间"
    echo "  4. 网络连接正常"
    exit 0
fi

# 执行主函数
main "$@"
