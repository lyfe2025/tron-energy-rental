#!/bin/bash

# TRON能量租赁系统 - 环境检查脚本
# 作者: 系统管理员
# 描述: 检查服务器运行环境是否满足部署要求

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

# 检查结果统计
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# 记录检查结果
check_result() {
    if [ $1 -eq 0 ]; then
        log_success "$2"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        log_error "$2"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
}

# 记录警告结果
check_warning() {
    log_warning "$1"
    CHECKS_WARNING=$((CHECKS_WARNING + 1))
}

print_header() {
    echo "========================================"
    echo "    TRON能量租赁系统环境检查工具"
    echo "========================================"
    echo ""
}

# 检查操作系统
check_os() {
    log_info "检查操作系统..."
    
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    case $OS in
        Linux*)
            log_success "操作系统: Linux ($ARCH)"
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                log_info "发行版: $NAME $VERSION"
            fi
            ;;
        Darwin*)
            log_success "操作系统: macOS ($ARCH)"
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            return 1
            ;;
    esac
    
    return 0
}

# 检查Node.js版本
check_nodejs() {
    log_info "检查Node.js..."
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        
        if [ "$NODE_MAJOR" -ge 18 ]; then
            log_success "Node.js版本: $NODE_VERSION (满足要求 >= 18.x)"
            return 0
        else
            log_error "Node.js版本过低: $NODE_VERSION (需要 >= 18.x)"
            return 1
        fi
    else
        log_error "未安装Node.js"
        return 1
    fi
}

# 检查包管理器
check_package_manager() {
    log_info "检查包管理器..."
    
    HAS_PNPM=false
    HAS_NPM=false
    
    if command -v pnpm >/dev/null 2>&1; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm版本: $PNPM_VERSION"
        HAS_PNPM=true
    fi
    
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        log_success "npm版本: $NPM_VERSION"
        HAS_NPM=true
    fi
    
    if [ "$HAS_PNPM" = true ] || [ "$HAS_NPM" = true ]; then
        return 0
    else
        log_error "未安装npm或pnpm包管理器"
        return 1
    fi
}

# 检查PostgreSQL
check_postgresql() {
    log_info "检查PostgreSQL..."
    
    if command -v psql >/dev/null 2>&1; then
        PSQL_VERSION=$(psql --version | head -n1)
        log_success "$PSQL_VERSION"
        
        # 检查PostgreSQL服务是否运行
        if command -v systemctl >/dev/null 2>&1; then
            if systemctl is-active --quiet postgresql; then
                log_success "PostgreSQL服务正在运行"
            else
                check_warning "PostgreSQL服务未运行，可能需要启动"
            fi
        elif command -v brew >/dev/null 2>&1; then
            if brew services list | grep postgresql | grep started >/dev/null; then
                log_success "PostgreSQL服务正在运行"
            else
                check_warning "PostgreSQL服务未运行，可能需要启动"
            fi
        fi
        
        return 0
    else
        log_error "未安装PostgreSQL客户端工具"
        return 1
    fi
}

# 检查Redis
check_redis() {
    log_info "检查Redis..."
    
    if command -v redis-cli >/dev/null 2>&1; then
        REDIS_VERSION=$(redis-cli --version)
        log_success "$REDIS_VERSION"
        
        # 检查Redis服务是否运行
        if redis-cli ping >/dev/null 2>&1; then
            log_success "Redis服务正在运行"
        else
            check_warning "Redis服务未运行或无法连接"
        fi
        
        return 0
    else
        log_error "未安装Redis客户端工具"
        return 1
    fi
}

# 检查Git
check_git() {
    log_info "检查Git..."
    
    if command -v git >/dev/null 2>&1; then
        GIT_VERSION=$(git --version)
        log_success "$GIT_VERSION"
        return 0
    else
        log_error "未安装Git"
        return 1
    fi
}

# 检查PM2 (可选)
check_pm2() {
    log_info "检查PM2进程管理器..."
    
    if command -v pm2 >/dev/null 2>&1; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2版本: $PM2_VERSION"
        return 0
    else
        check_warning "未安装PM2进程管理器 (推荐安装用于生产环境)"
        return 0
    fi
}

# 检查Nginx (可选)
check_nginx() {
    log_info "检查Nginx..."
    
    if command -v nginx >/dev/null 2>&1; then
        NGINX_VERSION=$(nginx -version 2>&1)
        log_success "$NGINX_VERSION"
        
        # 检查Nginx服务状态
        if command -v systemctl >/dev/null 2>&1; then
            if systemctl is-active --quiet nginx; then
                log_success "Nginx服务正在运行"
            else
                check_warning "Nginx服务未运行"
            fi
        fi
        
        return 0
    else
        check_warning "未安装Nginx (推荐安装用于反向代理)"
        return 0
    fi
}

# 检查端口占用
check_ports() {
    log_info "检查端口占用情况..."
    
    PORTS=(3001 3000 5432 6379)
    PORT_NAMES=("API服务" "前端服务" "PostgreSQL" "Redis")
    
    for i in "${!PORTS[@]}"; do
        PORT=${PORTS[$i]}
        NAME=${PORT_NAMES[$i]}
        
        if command -v lsof >/dev/null 2>&1; then
            if lsof -i:$PORT >/dev/null 2>&1; then
                check_warning "端口 $PORT ($NAME) 已被占用"
            else
                log_success "端口 $PORT ($NAME) 可用"
            fi
        elif command -v netstat >/dev/null 2>&1; then
            if netstat -tuln | grep ":$PORT " >/dev/null 2>&1; then
                check_warning "端口 $PORT ($NAME) 已被占用"
            else
                log_success "端口 $PORT ($NAME) 可用"
            fi
        else
            check_warning "无法检查端口 $PORT 占用情况 (缺少lsof或netstat命令)"
        fi
    done
}

# 检查磁盘空间
check_disk_space() {
    log_info "检查磁盘空间..."
    
    REQUIRED_SPACE_GB=5
    
    if command -v df >/dev/null 2>&1; then
        AVAILABLE_SPACE_KB=$(df . | tail -1 | awk '{print $4}')
        AVAILABLE_SPACE_GB=$((AVAILABLE_SPACE_KB / 1024 / 1024))
        
        if [ $AVAILABLE_SPACE_GB -ge $REQUIRED_SPACE_GB ]; then
            log_success "可用磁盘空间: ${AVAILABLE_SPACE_GB}GB (满足要求 >= ${REQUIRED_SPACE_GB}GB)"
            return 0
        else
            log_error "磁盘空间不足: ${AVAILABLE_SPACE_GB}GB (需要 >= ${REQUIRED_SPACE_GB}GB)"
            return 1
        fi
    else
        check_warning "无法检查磁盘空间"
        return 0
    fi
}

# 检查内存
check_memory() {
    log_info "检查系统内存..."
    
    REQUIRED_MEMORY_GB=2
    
    if command -v free >/dev/null 2>&1; then
        TOTAL_MEMORY_KB=$(free | grep '^Mem:' | awk '{print $2}')
        TOTAL_MEMORY_GB=$((TOTAL_MEMORY_KB / 1024 / 1024))
        
        if [ $TOTAL_MEMORY_GB -ge $REQUIRED_MEMORY_GB ]; then
            log_success "系统内存: ${TOTAL_MEMORY_GB}GB (满足要求 >= ${REQUIRED_MEMORY_GB}GB)"
            return 0
        else
            log_error "系统内存不足: ${TOTAL_MEMORY_GB}GB (建议 >= ${REQUIRED_MEMORY_GB}GB)"
            return 1
        fi
    elif [ "$(uname -s)" = "Darwin" ]; then
        TOTAL_MEMORY_BYTES=$(sysctl -n hw.memsize)
        TOTAL_MEMORY_GB=$((TOTAL_MEMORY_BYTES / 1024 / 1024 / 1024))
        
        if [ $TOTAL_MEMORY_GB -ge $REQUIRED_MEMORY_GB ]; then
            log_success "系统内存: ${TOTAL_MEMORY_GB}GB (满足要求 >= ${REQUIRED_MEMORY_GB}GB)"
            return 0
        else
            log_error "系统内存不足: ${TOTAL_MEMORY_GB}GB (建议 >= ${REQUIRED_MEMORY_GB}GB)"
            return 1
        fi
    else
        check_warning "无法检查系统内存"
        return 0
    fi
}

# 生成环境配置建议
generate_recommendations() {
    echo ""
    echo "========================================"
    echo "            环境配置建议"
    echo "========================================"
    
    if [ $CHECKS_FAILED -gt 0 ]; then
        log_error "发现 $CHECKS_FAILED 个严重问题需要解决"
        echo ""
        echo "必需安装的组件："
        
        if ! command -v node >/dev/null 2>&1; then
            echo "  • Node.js (>= 18.x): https://nodejs.org/"
        fi
        
        if ! command -v npm >/dev/null 2>&1 && ! command -v pnpm >/dev/null 2>&1; then
            echo "  • pnpm包管理器: npm install -g pnpm"
        fi
        
        if ! command -v psql >/dev/null 2>&1; then
            echo "  • PostgreSQL数据库: https://postgresql.org/"
        fi
        
        if ! command -v redis-cli >/dev/null 2>&1; then
            echo "  • Redis缓存服务: https://redis.io/"
        fi
        
        if ! command -v git >/dev/null 2>&1; then
            echo "  • Git版本控制: https://git-scm.com/"
        fi
    fi
    
    if [ $CHECKS_WARNING -gt 0 ]; then
        echo ""
        log_warning "发现 $CHECKS_WARNING 个警告，建议优化"
        echo ""
        echo "推荐安装的组件："
        
        if ! command -v pm2 >/dev/null 2>&1; then
            echo "  • PM2进程管理器: npm install -g pm2"
        fi
        
        if ! command -v nginx >/dev/null 2>&1; then
            echo "  • Nginx反向代理: apt-get install nginx (Ubuntu) 或 brew install nginx (macOS)"
        fi
    fi
    
    echo ""
    echo "快速安装命令 (Ubuntu/Debian):"
    echo "  sudo apt update"
    echo "  sudo apt install -y nodejs npm postgresql redis-server nginx git"
    echo "  npm install -g pnpm pm2"
    echo ""
    echo "快速安装命令 (macOS):"
    echo "  brew install node postgresql redis nginx git"
    echo "  npm install -g pnpm pm2"
}

# 主检查流程
main() {
    print_header
    
    # 执行所有检查
    check_result $? "$(check_os)"
    check_result $? "$(check_nodejs)"
    check_result $? "$(check_package_manager)"
    check_result $? "$(check_postgresql)"
    check_result $? "$(check_redis)"
    check_result $? "$(check_git)"
    check_pm2
    check_nginx
    check_ports
    check_result $? "$(check_disk_space)"
    check_result $? "$(check_memory)"
    
    # 显示检查结果总结
    echo ""
    echo "========================================"
    echo "            检查结果总结"
    echo "========================================"
    log_success "通过检查: $CHECKS_PASSED 项"
    
    if [ $CHECKS_WARNING -gt 0 ]; then
        log_warning "警告项目: $CHECKS_WARNING 项"
    fi
    
    if [ $CHECKS_FAILED -gt 0 ]; then
        log_error "失败项目: $CHECKS_FAILED 项"
    fi
    
    # 生成建议
    generate_recommendations
    
    echo ""
    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "环境检查完成！系统满足部署要求"
        echo "您可以运行部署脚本: ./deployment/scripts/deploy.sh"
        exit 0
    else
        log_error "环境检查失败！请先解决上述问题再进行部署"
        exit 1
    fi
}

# 运行主程序
main "$@"
