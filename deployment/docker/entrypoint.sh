#!/bin/sh

# TRON能量租赁系统 - Docker容器启动脚本
# 作者: 系统管理员
# 描述: Docker容器启动时的初始化脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查必需的环境变量
check_required_env() {
    log_info "检查必需的环境变量..."
    
    REQUIRED_VARS="DB_HOST DB_NAME DB_USER DB_PASSWORD JWT_SECRET"
    
    for var in $REQUIRED_VARS; do
        if [ -z "$(eval echo \$$var)" ]; then
            log_error "缺少必需的环境变量: $var"
            exit 1
        fi
    done
    
    log_success "环境变量检查通过"
}

# 等待数据库连接
wait_for_database() {
    log_info "等待数据库连接..."
    
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME}
    DB_USER=${DB_USER}
    
    # 最大等待时间 (秒)
    MAX_WAIT=60
    WAIT_COUNT=0
    
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            log_success "数据库连接成功"
            return 0
        fi
        
        log_info "等待数据库连接... ($WAIT_COUNT/$MAX_WAIT)"
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
    done
    
    log_error "数据库连接超时"
    exit 1
}

# 等待Redis连接
wait_for_redis() {
    if [ -z "$REDIS_HOST" ]; then
        log_warning "未配置Redis，跳过Redis连接检查"
        return 0
    fi
    
    log_info "等待Redis连接..."
    
    REDIS_HOST=${REDIS_HOST:-localhost}
    REDIS_PORT=${REDIS_PORT:-6379}
    
    # 最大等待时间 (秒)
    MAX_WAIT=30
    WAIT_COUNT=0
    
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if nc -z "$REDIS_HOST" "$REDIS_PORT" >/dev/null 2>&1; then
            log_success "Redis连接成功"
            return 0
        fi
        
        log_info "等待Redis连接... ($WAIT_COUNT/$MAX_WAIT)"
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
    done
    
    log_warning "Redis连接超时，但继续启动应用"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    if [ -d "/app/migrations" ] && [ "$(ls -A /app/migrations 2>/dev/null)" ]; then
        log_info "发现迁移文件，开始执行迁移..."
        
        if pnpm run migrate; then
            log_success "数据库迁移完成"
        else
            log_warning "数据库迁移失败，但继续启动应用"
        fi
    else
        log_info "未发现迁移文件，跳过数据库迁移"
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p /app/logs
    mkdir -p /app/backups
    mkdir -p /tmp/uploads
    
    log_success "目录创建完成"
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    # 确保日志目录可写
    chmod 755 /app/logs
    chmod 755 /app/backups
    
    log_success "文件权限设置完成"
}

# 启动前健康检查
pre_start_health_check() {
    log_info "执行启动前健康检查..."
    
    # 检查Node.js版本
    NODE_VERSION=$(node --version)
    log_info "Node.js版本: $NODE_VERSION"
    
    # 检查内存使用
    MEMORY_INFO=$(free -h 2>/dev/null || echo "内存信息不可用")
    log_info "内存信息: $MEMORY_INFO"
    
    # 检查磁盘空间
    DISK_INFO=$(df -h /app 2>/dev/null || echo "磁盘信息不可用")
    log_info "磁盘信息: $DISK_INFO"
    
    log_success "健康检查完成"
}

# 启动应用
start_application() {
    log_info "启动TRON能量租赁系统..."
    
    # 设置启动模式
    START_MODE=${START_MODE:-api}
    
    case $START_MODE in
        "api")
            log_info "启动API服务..."
            exec tsx api/server.ts
            ;;
        "scheduler")
            log_info "启动定时任务服务..."
            exec tsx api/services/scheduler.ts
            ;;
        "bot")
            log_info "启动Telegram机器人服务..."
            exec tsx api/services/telegram-bot.ts
            ;;
        "dev")
            log_info "启动开发模式..."
            exec pnpm run dev
            ;;
        *)
            log_error "未知的启动模式: $START_MODE"
            exit 1
            ;;
    esac
}

# 信号处理
handle_signal() {
    log_info "收到停止信号，正在优雅关闭..."
    
    # 给应用一些时间来优雅关闭
    if [ ! -z "$APP_PID" ]; then
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi
    
    log_success "应用已优雅关闭"
    exit 0
}

# 注册信号处理器
trap 'handle_signal' TERM INT

# 主启动流程
main() {
    log_info "=========================================="
    log_info "    TRON能量租赁系统容器启动"
    log_info "=========================================="
    log_info "时间: $(date)"
    log_info "环境: ${NODE_ENV:-development}"
    log_info "启动模式: ${START_MODE:-api}"
    log_info "=========================================="
    
    # 执行启动前检查
    check_required_env
    create_directories
    set_permissions
    pre_start_health_check
    
    # 等待依赖服务
    wait_for_database
    wait_for_redis
    
    # 运行迁移
    run_migrations
    
    # 启动应用
    start_application
}

# 如果是bash或sh直接执行，运行主函数
if [ "${0##*/}" = "entrypoint.sh" ]; then
    main "$@"
fi
