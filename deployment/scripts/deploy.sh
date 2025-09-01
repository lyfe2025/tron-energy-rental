#!/bin/bash

# TRON能量租赁系统 - 一键部署脚本
# 作者: 系统管理员
# 描述: 自动化部署TRON能量租赁系统到生产服务器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_NAME="tron-energy-rental"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_DIR="$SCRIPT_DIR/.."
LOG_FILE="/tmp/${PROJECT_NAME}-deploy-$(date +%Y%m%d_%H%M%S).log"

# 默认配置
NODE_ENV=${NODE_ENV:-production}
SKIP_ENV_CHECK=${SKIP_ENV_CHECK:-false}
SKIP_BACKUP=${SKIP_BACKUP:-false}
SKIP_TESTS=${SKIP_TESTS:-false}
ENABLE_PM2=${ENABLE_PM2:-true}
AUTO_START=${AUTO_START:-true}

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# 错误处理
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "部署失败！查看日志文件: $LOG_FILE"
        log_info "回滚建议: 运行 ./deployment/scripts/rollback.sh"
    fi
}

trap cleanup EXIT

print_header() {
    echo "========================================"
    echo "      TRON能量租赁系统一键部署工具"
    echo "========================================"
    echo "项目: $PROJECT_NAME"
    echo "环境: $NODE_ENV"
    echo "时间: $(date)"
    echo "日志: $LOG_FILE"
    echo "========================================"
    echo ""
}

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示帮助信息"
    echo "  -e, --env ENV           设置环境 (development|production) [默认: production]"
    echo "  --skip-env-check        跳过环境检查"
    echo "  --skip-backup           跳过数据备份"
    echo "  --skip-tests            跳过测试"
    echo "  --no-pm2                不使用PM2管理进程"
    echo "  --no-auto-start         部署后不自动启动服务"
    echo ""
    echo "示例:"
    echo "  $0                      使用默认配置部署"
    echo "  $0 -e development       部署到开发环境"
    echo "  $0 --skip-backup        跳过备份直接部署"
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--env)
                NODE_ENV="$2"
                shift 2
                ;;
            --skip-env-check)
                SKIP_ENV_CHECK=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --no-pm2)
                ENABLE_PM2=false
                shift
                ;;
            --no-auto-start)
                AUTO_START=false
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查环境
check_environment() {
    if [ "$SKIP_ENV_CHECK" = "true" ]; then
        log_warning "跳过环境检查"
        return 0
    fi
    
    log_step "执行环境检查..."
    
    if [ -f "$SCRIPT_DIR/check-environment.sh" ]; then
        if bash "$SCRIPT_DIR/check-environment.sh"; then
            log_success "环境检查通过"
        else
            log_error "环境检查失败，请先解决环境问题"
            exit 1
        fi
    else
        log_warning "环境检查脚本不存在，跳过检查"
    fi
}

# 检查Git状态
check_git_status() {
    log_step "检查Git状态..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -d ".git" ]; then
        log_warning "当前目录不是Git仓库"
        return 0
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_warning "存在未提交的更改"
        echo "未提交的文件:"
        git status --porcelain
        echo ""
        read -p "是否继续部署? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            exit 0
        fi
    fi
    
    # 显示当前分支和最新提交
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    LATEST_COMMIT=$(git rev-parse --short HEAD)
    COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s")
    
    log_info "当前分支: $CURRENT_BRANCH"
    log_info "最新提交: $LATEST_COMMIT - $COMMIT_MESSAGE"
}

# 创建备份
create_backup() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        log_warning "跳过数据备份"
        return 0
    fi
    
    log_step "创建数据备份..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    # 备份数据库
    if command -v pg_dump >/dev/null 2>&1; then
        log_info "备份PostgreSQL数据库..."
        
        # 从环境变量或配置文件读取数据库信息
        DB_NAME=${DB_NAME:-tron_energy_rental}
        DB_USER=${DB_USER:-postgres}
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-5432}
        
        BACKUP_FILE="$BACKUP_DIR/db_backup_${DB_NAME}_${TIMESTAMP}.sql"
        
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
            log_success "数据库备份完成: $BACKUP_FILE"
        else
            log_warning "数据库备份失败，继续部署..."
        fi
    else
        log_warning "未找到pg_dump，跳过数据库备份"
    fi
    
    # 备份当前部署文件
    if [ -d "$PROJECT_ROOT/dist" ]; then
        log_info "备份当前部署文件..."
        tar -czf "$BACKUP_DIR/dist_backup_${TIMESTAMP}.tar.gz" -C "$PROJECT_ROOT" dist
        log_success "部署文件备份完成"
    fi
}

# 安装依赖
install_dependencies() {
    log_step "安装项目依赖..."
    
    cd "$PROJECT_ROOT"
    
    # 优先使用pnpm，其次npm
    if command -v pnpm >/dev/null 2>&1; then
        log_info "使用pnpm安装依赖..."
        pnpm install --frozen-lockfile --prod
    elif command -v npm >/dev/null 2>&1; then
        log_info "使用npm安装依赖..."
        npm ci --only=production
    else
        log_error "未找到npm或pnpm包管理器"
        exit 1
    fi
    
    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_step "构建项目..."
    
    cd "$PROJECT_ROOT"
    
    # 设置环境变量
    export NODE_ENV="$NODE_ENV"
    
    if command -v pnpm >/dev/null 2>&1; then
        pnpm run build
    else
        npm run build
    fi
    
    if [ ! -d "dist" ]; then
        log_error "构建失败，未找到dist目录"
        exit 1
    fi
    
    log_success "项目构建完成"
}

# 运行测试
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        log_warning "跳过测试"
        return 0
    fi
    
    log_step "运行测试..."
    
    cd "$PROJECT_ROOT"
    
    if command -v pnpm >/dev/null 2>&1; then
        if pnpm run test:run; then
            log_success "所有测试通过"
        else
            log_warning "测试失败，但继续部署..."
        fi
    else
        if npm run test:run; then
            log_success "所有测试通过"
        else
            log_warning "测试失败，但继续部署..."
        fi
    fi
}

# 数据库迁移
run_migrations() {
    log_step "执行数据库迁移..."
    
    cd "$PROJECT_ROOT"
    
    # 检查是否有迁移脚本
    if [ -d "migrations" ] && [ "$(ls -A migrations 2>/dev/null)" ]; then
        log_info "发现数据库迁移文件，执行迁移..."
        
        if command -v pnpm >/dev/null 2>&1; then
            pnpm run migrate
        else
            npm run migrate
        fi
        
        log_success "数据库迁移完成"
    else
        log_info "未发现迁移文件，跳过数据库迁移"
    fi
}

# 配置环境文件
setup_environment() {
    log_step "配置环境文件..."
    
    cd "$PROJECT_ROOT"
    
    ENV_FILE=".env.${NODE_ENV}"
    ENV_TEMPLATE="$DEPLOYMENT_DIR/templates/.env.${NODE_ENV}.template"
    
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_TEMPLATE" ]; then
            log_info "从模板创建环境文件: $ENV_FILE"
            cp "$ENV_TEMPLATE" "$ENV_FILE"
            log_warning "请检查并更新 $ENV_FILE 中的配置"
        else
            log_warning "未找到环境文件 $ENV_FILE，请手动创建"
        fi
    else
        log_success "环境文件已存在: $ENV_FILE"
    fi
}

# 停止现有服务
stop_services() {
    log_step "停止现有服务..."
    
    if [ "$ENABLE_PM2" = "true" ] && command -v pm2 >/dev/null 2>&1; then
        log_info "停止PM2服务..."
        pm2 stop all || true
        pm2 delete all || true
    else
        log_info "停止进程..."
        pkill -f "$PROJECT_NAME" || true
        pkill -f "node.*server" || true
        pkill -f "vite" || true
    fi
    
    # 等待进程完全停止
    sleep 3
    
    log_success "服务停止完成"
}

# 启动服务
start_services() {
    if [ "$AUTO_START" = "false" ]; then
        log_warning "跳过自动启动服务"
        return 0
    fi
    
    log_step "启动服务..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$ENABLE_PM2" = "true" ] && command -v pm2 >/dev/null 2>&1; then
        start_with_pm2
    else
        start_with_npm
    fi
}

# 使用PM2启动服务
start_with_pm2() {
    log_info "使用PM2启动服务..."
    
    PM2_CONFIG="$DEPLOYMENT_DIR/configs/pm2.config.js"
    
    if [ -f "$PM2_CONFIG" ]; then
        pm2 start "$PM2_CONFIG"
    else
        # 创建简单的PM2配置
        pm2 start api/server.ts --name "${PROJECT_NAME}-api" --interpreter tsx
    fi
    
    # 保存PM2配置
    pm2 save
    pm2 startup
    
    log_success "PM2服务启动完成"
}

# 使用npm启动服务
start_with_npm() {
    log_info "使用npm启动服务..."
    
    # 后台启动API服务
    nohup npm run dev:api > /tmp/${PROJECT_NAME}-api.log 2>&1 &
    API_PID=$!
    echo $API_PID > /tmp/${PROJECT_NAME}-api.pid
    
    log_success "服务启动完成 (PID: $API_PID)"
}

# 健康检查
health_check() {
    if [ "$AUTO_START" = "false" ]; then
        return 0
    fi
    
    log_step "执行健康检查..."
    
    API_URL="http://localhost:3001/api/health"
    MAX_ATTEMPTS=30
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        log_info "健康检查 ($ATTEMPT/$MAX_ATTEMPTS)..."
        
        if curl -f -s "$API_URL" > /dev/null 2>&1; then
            log_success "API服务健康检查通过"
            return 0
        fi
        
        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            log_error "健康检查失败，API服务可能未正常启动"
            return 1
        fi
        
        sleep 2
        ATTEMPT=$((ATTEMPT + 1))
    done
}

# 部署后清理
post_deploy_cleanup() {
    log_step "执行部署后清理..."
    
    cd "$PROJECT_ROOT"
    
    # 清理临时文件
    rm -rf node_modules/.cache || true
    
    # 清理旧的日志文件 (保留最近7天)
    find /tmp -name "${PROJECT_NAME}-*.log" -mtime +7 -delete 2>/dev/null || true
    
    log_success "清理完成"
}

# 显示部署总结
show_summary() {
    echo ""
    echo "========================================"
    echo "            部署完成总结"
    echo "========================================"
    log_success "部署完成时间: $(date)"
    log_info "环境: $NODE_ENV"
    log_info "项目路径: $PROJECT_ROOT"
    log_info "日志文件: $LOG_FILE"
    
    if [ "$AUTO_START" = "true" ]; then
        echo ""
        echo "服务地址:"
        echo "  • API服务: http://localhost:3001"
        echo "  • 前端服务: http://localhost:3000"
        echo ""
        echo "管理命令:"
        if [ "$ENABLE_PM2" = "true" ] && command -v pm2 >/dev/null 2>&1; then
            echo "  • 查看状态: pm2 status"
            echo "  • 查看日志: pm2 logs"
            echo "  • 重启服务: pm2 restart all"
            echo "  • 停止服务: pm2 stop all"
        else
            echo "  • 停止服务: pkill -f '$PROJECT_NAME'"
            echo "  • 查看日志: tail -f /tmp/${PROJECT_NAME}-api.log"
        fi
    fi
    
    echo ""
    echo "其他工具:"
    echo "  • 环境检查: ./deployment/scripts/check-environment.sh"
    echo "  • 服务状态: ./deployment/scripts/status.sh"
    echo "  • 查看日志: ./deployment/scripts/logs.sh"
    
    echo ""
    log_success "🎉 部署成功完成！"
}

# 主部署流程
main() {
    print_header
    parse_args "$@"
    
    # 执行部署步骤
    check_environment
    check_git_status
    create_backup
    install_dependencies
    build_project
    run_tests
    setup_environment
    run_migrations
    stop_services
    start_services
    health_check
    post_deploy_cleanup
    show_summary
}

# 运行主程序
main "$@"
