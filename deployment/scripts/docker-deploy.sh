#!/bin/bash

# TRON能量租赁系统 - Docker部署脚本
# 作者: 系统管理员
# 描述: 使用Docker容器化部署TRON能量租赁系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DOCKER_DIR="$SCRIPT_DIR/../docker"
ENV_FILE="$PROJECT_ROOT/.env"

# 默认配置
ENVIRONMENT=${ENVIRONMENT:-production}
REBUILD=${REBUILD:-false}
PULL_LATEST=${PULL_LATEST:-true}
WITH_MONITORING=${WITH_MONITORING:-false}
WITH_TELEGRAM=${WITH_TELEGRAM:-false}

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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

print_header() {
    echo "========================================"
    echo "    TRON能量租赁系统Docker部署工具"
    echo "========================================"
    echo "环境: $ENVIRONMENT"
    echo "重建镜像: $REBUILD"
    echo "拉取最新镜像: $PULL_LATEST"
    echo "启用监控: $WITH_MONITORING"
    echo "启用Telegram: $WITH_TELEGRAM"
    echo "========================================"
    echo ""
}

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项] [命令]"
    echo ""
    echo "命令:"
    echo "  up                      启动所有服务"
    echo "  down                    停止所有服务"
    echo "  restart                 重启所有服务"
    echo "  logs                    查看服务日志"
    echo "  status                  查看服务状态"
    echo "  clean                   清理容器和镜像"
    echo "  backup                  备份数据"
    echo "  restore <backup_file>   恢复数据"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示帮助信息"
    echo "  -e, --env ENV           设置环境 (development|production) [默认: production]"
    echo "  -r, --rebuild           强制重建镜像"
    echo "  --no-pull               不拉取最新镜像"
    echo "  --with-monitoring       启用监控服务"
    echo "  --with-telegram         启用Telegram机器人"
    echo ""
    echo "示例:"
    echo "  $0 up                   使用默认配置启动服务"
    echo "  $0 -e development up    启动开发环境"
    echo "  $0 --rebuild up         重建镜像并启动"
    echo "  $0 logs api             查看API服务日志"
}

# 解析命令行参数
parse_args() {
    COMMAND=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--rebuild)
                REBUILD=true
                shift
                ;;
            --no-pull)
                PULL_LATEST=false
                shift
                ;;
            --with-monitoring)
                WITH_MONITORING=true
                shift
                ;;
            --with-telegram)
                WITH_TELEGRAM=true
                shift
                ;;
            up|down|restart|logs|status|clean|backup|restore)
                COMMAND="$1"
                shift
                # 保留剩余参数给命令使用
                COMMAND_ARGS="$@"
                break
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    if [ -z "$COMMAND" ]; then
        log_error "请指定命令"
        show_help
        exit 1
    fi
}

# 检查Docker环境
check_docker() {
    log_step "检查Docker环境..."
    
    if ! command -v docker >/dev/null 2>&1; then
        log_error "未安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "未安装Docker Compose"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker服务未运行"
        exit 1
    fi
    
    log_success "Docker环境检查通过"
}

# 检查环境文件
check_env_file() {
    log_step "检查环境配置文件..."
    
    if [ ! -f "$ENV_FILE" ]; then
        ENV_TEMPLATE="$SCRIPT_DIR/../templates/env.${ENVIRONMENT}.template"
        
        if [ -f "$ENV_TEMPLATE" ]; then
            log_info "创建环境文件: $ENV_FILE"
            cp "$ENV_TEMPLATE" "$ENV_FILE"
            log_warning "请检查并更新 $ENV_FILE 中的配置"
        else
            log_error "环境文件不存在: $ENV_FILE"
            exit 1
        fi
    else
        log_success "环境文件已存在: $ENV_FILE"
    fi
}

# 构建Docker Compose命令
build_compose_command() {
    COMPOSE_CMD="docker-compose -f $DOCKER_DIR/docker-compose.yml"
    
    # 添加环境特定配置
    if [ "$ENVIRONMENT" = "development" ]; then
        COMPOSE_CMD="$COMPOSE_CMD -f $DOCKER_DIR/docker-compose.dev.yml"
    fi
    
    # 添加配置文件
    COMPOSE_CMD="$COMPOSE_CMD --env-file $ENV_FILE"
    
    # 设置项目名称
    COMPOSE_CMD="$COMPOSE_CMD -p tron-energy-rental"
    
    echo "$COMPOSE_CMD"
}

# 构建服务配置
build_service_profiles() {
    PROFILES=""
    
    if [ "$WITH_MONITORING" = "true" ]; then
        PROFILES="$PROFILES,monitoring"
    fi
    
    if [ "$WITH_TELEGRAM" = "true" ]; then
        PROFILES="$PROFILES,telegram"
    fi
    
    # 移除开头的逗号
    PROFILES="${PROFILES#,}"
    
    if [ -n "$PROFILES" ]; then
        echo "--profile $PROFILES"
    fi
}

# 启动服务
cmd_up() {
    log_step "启动Docker服务..."
    
    cd "$PROJECT_ROOT"
    
    COMPOSE_CMD=$(build_compose_command)
    PROFILE_OPTS=$(build_service_profiles)
    
    # 拉取最新镜像
    if [ "$PULL_LATEST" = "true" ]; then
        log_info "拉取最新镜像..."
        $COMPOSE_CMD pull
    fi
    
    # 构建镜像
    if [ "$REBUILD" = "true" ]; then
        log_info "重建镜像..."
        $COMPOSE_CMD build --no-cache
    else
        $COMPOSE_CMD build
    fi
    
    # 启动服务
    log_info "启动服务..."
    $COMPOSE_CMD up -d $PROFILE_OPTS
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    $COMPOSE_CMD ps
    
    log_success "服务启动完成"
}

# 停止服务
cmd_down() {
    log_step "停止Docker服务..."
    
    cd "$PROJECT_ROOT"
    
    COMPOSE_CMD=$(build_compose_command)
    PROFILE_OPTS=$(build_service_profiles)
    
    $COMPOSE_CMD down $PROFILE_OPTS
    
    log_success "服务停止完成"
}

# 重启服务
cmd_restart() {
    log_step "重启Docker服务..."
    
    cmd_down
    sleep 3
    cmd_up
    
    log_success "服务重启完成"
}

# 查看日志
cmd_logs() {
    cd "$PROJECT_ROOT"
    
    COMPOSE_CMD=$(build_compose_command)
    
    if [ -n "$COMMAND_ARGS" ]; then
        $COMPOSE_CMD logs -f $COMMAND_ARGS
    else
        $COMPOSE_CMD logs -f
    fi
}

# 查看状态
cmd_status() {
    cd "$PROJECT_ROOT"
    
    COMPOSE_CMD=$(build_compose_command)
    
    log_info "服务状态:"
    $COMPOSE_CMD ps
    
    echo ""
    log_info "Docker镜像:"
    docker images | grep tron-energy || echo "未找到相关镜像"
    
    echo ""
    log_info "数据卷:"
    docker volume ls | grep tron-energy || echo "未找到相关数据卷"
}

# 清理资源
cmd_clean() {
    log_step "清理Docker资源..."
    
    cd "$PROJECT_ROOT"
    
    COMPOSE_CMD=$(build_compose_command)
    
    # 停止并删除容器
    $COMPOSE_CMD down --volumes --remove-orphans
    
    # 删除镜像
    docker images | grep tron-energy | awk '{print $3}' | xargs docker rmi -f || true
    
    # 清理未使用的资源
    docker system prune -f
    
    log_success "清理完成"
}

# 备份数据
cmd_backup() {
    log_step "备份数据..."
    
    cd "$PROJECT_ROOT"
    
    BACKUP_DIR="$PROJECT_ROOT/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    # 备份数据库
    docker exec tron-energy-postgres pg_dumpall -c -U tron_user > "$BACKUP_DIR/postgres_backup_${TIMESTAMP}.sql"
    
    # 备份Redis
    docker exec tron-energy-redis redis-cli BGSAVE
    docker cp tron-energy-redis:/data/dump.rdb "$BACKUP_DIR/redis_backup_${TIMESTAMP}.rdb"
    
    # 备份数据卷
    docker run --rm -v tron-energy-rental_postgres_data:/source -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres_volume_${TIMESTAMP}.tar.gz -C /source .
    docker run --rm -v tron-energy-rental_redis_data:/source -v "$BACKUP_DIR":/backup alpine tar czf /backup/redis_volume_${TIMESTAMP}.tar.gz -C /source .
    
    log_success "备份完成: $BACKUP_DIR"
}

# 恢复数据
cmd_restore() {
    if [ -z "$COMMAND_ARGS" ]; then
        log_error "请指定备份文件"
        exit 1
    fi
    
    BACKUP_FILE="$COMMAND_ARGS"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "备份文件不存在: $BACKUP_FILE"
        exit 1
    fi
    
    log_step "恢复数据: $BACKUP_FILE"
    
    # 停止服务
    cmd_down
    
    # 恢复数据库
    if [[ "$BACKUP_FILE" == *.sql ]]; then
        log_info "恢复PostgreSQL数据库..."
        # 启动PostgreSQL
        COMPOSE_CMD=$(build_compose_command)
        $COMPOSE_CMD up -d postgres
        sleep 10
        
        # 恢复数据
        docker exec -i tron-energy-postgres psql -U tron_user < "$BACKUP_FILE"
    fi
    
    log_success "数据恢复完成"
}

# 主函数
main() {
    print_header
    parse_args "$@"
    check_docker
    check_env_file
    
    case $COMMAND in
        up)
            cmd_up
            ;;
        down)
            cmd_down
            ;;
        restart)
            cmd_restart
            ;;
        logs)
            cmd_logs
            ;;
        status)
            cmd_status
            ;;
        clean)
            cmd_clean
            ;;
        backup)
            cmd_backup
            ;;
        restore)
            cmd_restore
            ;;
        *)
            log_error "未知命令: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"
