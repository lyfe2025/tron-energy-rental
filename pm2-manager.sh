#!/bin/bash

# =============================================================================
# 🚀 TRON能量租赁系统 - PM2管理脚本
# =============================================================================
# 功能：自动化PM2安装、配置、启动、监控、管理等所有操作
# 作者：TRON Energy Rental Team
# 版本：v1.0.0
# 更新：2025-09-21
# =============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="TRON能量租赁系统"
PROJECT_DIR="/Volumes/wwx/dev/TronResourceDev/tron-energy-rental"
CONFIG_FILE="ecosystem.config.cjs"
API_PORT="3001"
FRONTEND_PORT="5173"
HEALTH_CHECK_URL="http://localhost:${API_PORT}/api/health"

# 日志函数
log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}🎯 $1${NC}"
}

# 分割线
separator() {
    echo -e "${BLUE}========================================${NC}"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户，建议使用非root用户运行此脚本"
        read -p "是否继续? (y/N): " continue_as_root
        if [[ ! $continue_as_root =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统环境
check_system() {
    log_info "检查系统环境..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "检测到macOS系统"
        PACKAGE_MANAGER="brew"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "检测到Linux系统"
        if command -v apt-get &> /dev/null; then
            PACKAGE_MANAGER="apt"
        elif command -v yum &> /dev/null; then
            PACKAGE_MANAGER="yum"
        else
            log_error "不支持的Linux发行版"
            exit 1
        fi
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    # 检查Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js已安装: $NODE_VERSION"
    else
        log_warning "Node.js未安装"
        return 1
    fi
    
    # 检查npm/pnpm
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm已安装: $PNPM_VERSION"
        PKG_MANAGER="pnpm"
    elif command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm已安装: $NPM_VERSION"
        PKG_MANAGER="npm"
    else
        log_warning "npm/pnpm未安装"
        return 1
    fi
    
    return 0
}

# 安装Node.js
install_nodejs() {
    log_header "安装Node.js"
    
    case $PACKAGE_MANAGER in
        "brew")
            brew install node
            ;;
        "apt")
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "yum")
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs npm
            ;;
    esac
    
    if command -v node &> /dev/null; then
        log_success "Node.js安装成功: $(node --version)"
    else
        log_error "Node.js安装失败"
        exit 1
    fi
}

# 安装pnpm
install_pnpm() {
    log_header "安装pnpm"
    npm install -g pnpm
    
    if command -v pnpm &> /dev/null; then
        log_success "pnpm安装成功: $(pnpm --version)"
        PKG_MANAGER="pnpm"
    else
        log_warning "pnpm安装失败，将使用npm"
        PKG_MANAGER="npm"
    fi
}

# 检查PM2状态
check_pm2() {
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2已安装: $PM2_VERSION"
        return 0
    else
        log_warning "PM2未安装"
        return 1
    fi
}

# 安装PM2
install_pm2() {
    log_header "安装PM2"
    
    if check_pm2; then
        log_info "PM2已存在，是否重新安装? (y/N)"
        read -r reinstall
        if [[ ! $reinstall =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    log_info "开始安装PM2..."
    $PKG_MANAGER install -g pm2
    
    if check_pm2; then
        log_success "PM2安装成功"
        
        # 配置PM2自动补全
        if [[ "$SHELL" == *"zsh"* ]]; then
            pm2 completion install
            log_success "PM2 zsh自动补全已配置"
        elif [[ "$SHELL" == *"bash"* ]]; then
            pm2 completion install
            log_success "PM2 bash自动补全已配置"
        fi
    else
        log_error "PM2安装失败"
        exit 1
    fi
}

# 安装项目依赖
install_dependencies() {
    log_header "安装项目依赖"
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json文件不存在"
        return 1
    fi
    
    log_info "使用 $PKG_MANAGER 安装依赖..."
    $PKG_MANAGER install
    
    if [[ $? -eq 0 ]]; then
        log_success "依赖安装成功"
    else
        log_error "依赖安装失败"
        return 1
    fi
}

# 构建项目
build_project() {
    log_header "构建项目"
    
    log_info "开始构建前端项目..."
    $PKG_MANAGER run build
    
    if [[ $? -eq 0 ]] && [[ -d "dist" ]]; then
        log_success "项目构建成功"
    else
        log_error "项目构建失败"
        return 1
    fi
}

# 检查配置文件
check_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        log_success "PM2配置文件存在: $CONFIG_FILE"
        return 0
    else
        log_error "PM2配置文件不存在: $CONFIG_FILE"
        return 1
    fi
}

# 启动服务
start_services() {
    log_header "启动服务"
    
    if ! check_config; then
        log_error "配置文件检查失败，无法启动服务"
        return 1
    fi
    
    # 停止现有服务
    log_info "停止现有服务..."
    pm2 stop all 2>/dev/null
    
    # 启动服务
    log_info "启动PM2服务..."
    pm2 start $CONFIG_FILE --env production
    
    if [[ $? -eq 0 ]]; then
        log_success "服务启动成功"
        sleep 3
        show_status
    else
        log_error "服务启动失败"
        return 1
    fi
}

# 停止服务
stop_services() {
    log_header "停止服务"
    
    log_info "停止所有PM2服务..."
    pm2 stop all
    
    if [[ $? -eq 0 ]]; then
        log_success "服务停止成功"
    else
        log_error "服务停止失败"
    fi
}

# 重启服务
restart_services() {
    log_header "重启服务"
    
    log_info "重启PM2服务..."
    pm2 restart all
    
    if [[ $? -eq 0 ]]; then
        log_success "服务重启成功"
        sleep 3
        show_status
    else
        log_error "服务重启失败"
    fi
}

# 重载服务（零停机）
reload_services() {
    log_header "重载服务（零停机）"
    
    log_info "重载PM2服务..."
    pm2 reload all
    
    if [[ $? -eq 0 ]]; then
        log_success "服务重载成功"
        sleep 3
        show_status
    else
        log_error "服务重载失败"
    fi
}

# 删除服务
delete_services() {
    log_header "删除服务"
    
    log_warning "确定要删除所有PM2服务吗? (y/N)"
    read -r confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        pm2 delete all
        log_success "服务删除成功"
    else
        log_info "操作已取消"
    fi
}

# 健康检查
health_check() {
    log_header "服务健康检查"
    
    # 检查PM2服务状态
    log_info "检查PM2服务状态..."
    pm2 list
    
    echo ""
    
    # 检查端口监听
    log_info "检查端口监听状态..."
    
    # 检查API端口
    if lsof -i :$API_PORT &> /dev/null; then
        log_success "API端口 $API_PORT 正在监听"
    else
        log_error "API端口 $API_PORT 未监听"
    fi
    
    # 检查前端端口
    if lsof -i :$FRONTEND_PORT &> /dev/null; then
        log_success "前端端口 $FRONTEND_PORT 正在监听"
    else
        log_error "前端端口 $FRONTEND_PORT 未监听"
    fi
    
    echo ""
    
    # 检查API健康状态
    log_info "检查API健康状态..."
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" $HEALTH_CHECK_URL 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        content=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
        
        if [[ $http_code -eq 200 ]]; then
            log_success "API健康检查通过: $content"
        else
            log_error "API健康检查失败: HTTP $http_code"
        fi
    else
        log_error "无法连接到API服务"
    fi
    
    echo ""
    
    # 检查前端状态
    log_info "检查前端服务状态..."
    frontend_response=$(curl -s -I http://localhost:$FRONTEND_PORT 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        log_success "前端服务响应正常"
    else
        log_error "前端服务无响应"
    fi
}

# 显示服务状态
show_status() {
    log_header "服务状态"
    pm2 list
    echo ""
    pm2 monit --no-interaction
}

# 查看日志
show_logs() {
    log_header "服务日志"
    
    echo "请选择要查看的日志:"
    echo "1) API服务日志"
    echo "2) 前端服务日志"
    echo "3) 所有服务日志"
    echo "4) API错误日志"
    echo "5) 返回主菜单"
    
    read -p "请选择 (1-5): " log_choice
    
    case $log_choice in
        1)
            log_info "显示API服务日志 (Ctrl+C退出)..."
            pm2 logs tron-energy-api
            ;;
        2)
            log_info "显示前端服务日志 (Ctrl+C退出)..."
            pm2 logs tron-energy-frontend
            ;;
        3)
            log_info "显示所有服务日志 (Ctrl+C退出)..."
            pm2 logs
            ;;
        4)
            log_info "显示API错误日志..."
            pm2 logs tron-energy-api --err --lines 50
            ;;
        5)
            return
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
}

# 性能监控
show_monitoring() {
    log_header "性能监控"
    
    echo "请选择监控选项:"
    echo "1) 实时监控"
    echo "2) 服务详情"
    echo "3) 资源使用统计"
    echo "4) 返回主菜单"
    
    read -p "请选择 (1-4): " monitor_choice
    
    case $monitor_choice in
        1)
            log_info "启动实时监控 (Ctrl+C退出)..."
            pm2 monit
            ;;
        2)
            echo "请选择要查看的服务:"
            echo "1) API服务详情"
            echo "2) 前端服务详情"
            read -p "请选择 (1-2): " service_choice
            
            case $service_choice in
                1)
                    pm2 show tron-energy-api
                    ;;
                2)
                    pm2 show tron-energy-frontend
                    ;;
                *)
                    log_error "无效选择"
                    ;;
            esac
            ;;
        3)
            log_info "资源使用统计:"
            pm2 list
            echo ""
            echo "系统资源:"
            echo "CPU使用率: $(top -l 1 | grep "CPU usage" | awk '{print $3}' | cut -d% -f1)%"
            echo "内存使用: $(vm_stat | grep "Pages active" | awk '{print int($3)*4096/1024/1024"MB"}')"
            echo "负载平均: $(uptime | awk -F'load averages:' '{print $2}')"
            ;;
        4)
            return
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
    
    echo ""
    read -p "按回车键继续..."
}

# 配置开机自启
setup_startup() {
    log_header "配置开机自启"
    
    if ! check_pm2; then
        log_error "PM2未安装，请先安装PM2"
        return 1
    fi
    
    log_info "配置PM2开机自启..."
    
    # 保存当前PM2进程列表
    pm2 save
    
    # 生成启动脚本
    pm2 startup
    
    log_success "开机自启配置完成"
    log_info "下次重启后PM2将自动启动"
    
    # 显示启动脚本位置
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_info "LaunchAgent文件位置: ~/Library/LaunchAgents/pm2.*.plist"
    else
        log_info "Systemd服务文件位置: /etc/systemd/system/pm2-*.service"
    fi
}

# 取消开机自启
disable_startup() {
    log_header "取消开机自启"
    
    log_warning "确定要取消PM2开机自启吗? (y/N)"
    read -r confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        pm2 unstartup
        log_success "开机自启已取消"
    else
        log_info "操作已取消"
    fi
}

# 清理日志
cleanup_logs() {
    log_header "清理日志"
    
    echo "请选择清理选项:"
    echo "1) 清空所有日志"
    echo "2) 清理旧日志文件"
    echo "3) 返回主菜单"
    
    read -p "请选择 (1-3): " cleanup_choice
    
    case $cleanup_choice in
        1)
            log_warning "确定要清空所有PM2日志吗? (y/N)"
            read -r confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                pm2 flush
                log_success "日志清空完成"
            else
                log_info "操作已取消"
            fi
            ;;
        2)
            log_info "清理7天前的日志文件..."
            find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null
            log_success "旧日志文件清理完成"
            ;;
        3)
            return
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
}

# 性能优化配置
performance_tuning() {
    log_header "性能优化配置"
    
    echo "请选择优化选项:"
    echo "1) 查看当前配置"
    echo "2) 调整实例数量"
    echo "3) 调整内存限制"
    echo "4) 切换执行模式"
    echo "5) 返回主菜单"
    
    read -p "请选择 (1-5): " tune_choice
    
    case $tune_choice in
        1)
            log_info "当前PM2配置:"
            pm2 show tron-energy-api | grep -E "(instances|exec mode|memory|max memory restart)"
            ;;
        2)
            current_instances=$(pm2 list | grep tron-energy-api | wc -l | tr -d ' ')
            log_info "当前实例数: $current_instances"
            read -p "设置新的实例数 (1-12): " new_instances
            
            if [[ $new_instances =~ ^[0-9]+$ ]] && [[ $new_instances -ge 1 ]] && [[ $new_instances -le 12 ]]; then
                pm2 scale tron-energy-api $new_instances
                log_success "实例数已调整为: $new_instances"
            else
                log_error "无效的实例数"
            fi
            ;;
        3)
            log_info "内存限制调整需要修改配置文件"
            log_info "建议值: 1024M (小型) | 1536M (中型) | 2048M (大型) | 3072M (企业级)"
            ;;
        4)
            log_info "执行模式切换需要修改配置文件"
            log_info "Fork模式: 稳定性优先，便于调试"
            log_info "Cluster模式: 性能优先，充分利用多核CPU"
            ;;
        5)
            return
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
    
    echo ""
    read -p "按回车键继续..."
}

# 备份和恢复
backup_restore() {
    log_header "备份和恢复"
    
    echo "请选择操作:"
    echo "1) 备份PM2配置"
    echo "2) 恢复PM2配置"
    echo "3) 导出应用列表"
    echo "4) 返回主菜单"
    
    read -p "请选择 (1-4): " backup_choice
    
    case $backup_choice in
        1)
            backup_file="pm2-backup-$(date +%Y%m%d_%H%M%S).json"
            pm2 save
            cp ~/.pm2/dump.pm2 "$backup_file"
            log_success "配置已备份到: $backup_file"
            ;;
        2)
            echo "可用的备份文件:"
            ls -la pm2-backup-*.json 2>/dev/null || log_warning "没有找到备份文件"
            read -p "输入备份文件名: " restore_file
            
            if [[ -f "$restore_file" ]]; then
                cp "$restore_file" ~/.pm2/dump.pm2
                pm2 resurrect
                log_success "配置恢复成功"
            else
                log_error "备份文件不存在"
            fi
            ;;
        3)
            pm2 list > "pm2-apps-$(date +%Y%m%d_%H%M%S).txt"
            log_success "应用列表已导出"
            ;;
        4)
            return
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
    
    echo ""
    read -p "按回车键继续..."
}

# 故障排除
troubleshooting() {
    log_header "故障排除"
    
    echo "请选择故障排除选项:"
    echo "1) 诊断常见问题"
    echo "2) 重置PM2环境"
    echo "3) 检查端口占用"
    echo "4) 查看系统资源"
    echo "5) 返回主菜单"
    
    read -p "请选择 (1-5): " trouble_choice
    
    case $trouble_choice in
        1)
            log_info "诊断常见问题..."
            
            # 检查Node.js版本
            if command -v node &> /dev/null; then
                log_success "Node.js: $(node --version)"
            else
                log_error "Node.js未安装"
            fi
            
            # 检查PM2版本
            if command -v pm2 &> /dev/null; then
                log_success "PM2: $(pm2 --version)"
            else
                log_error "PM2未安装"
            fi
            
            # 检查配置文件
            if [[ -f "$CONFIG_FILE" ]]; then
                log_success "配置文件存在"
            else
                log_error "配置文件缺失"
            fi
            
            # 检查依赖
            if [[ -d "node_modules" ]]; then
                log_success "依赖已安装"
            else
                log_error "依赖未安装"
            fi
            
            # 检查构建文件
            if [[ -d "dist" ]]; then
                log_success "构建文件存在"
            else
                log_error "构建文件缺失"
            fi
            ;;
        2)
            log_warning "这将删除所有PM2进程和配置，确定继续吗? (y/N)"
            read -r confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                pm2 kill
                rm -rf ~/.pm2
                log_success "PM2环境已重置"
            else
                log_info "操作已取消"
            fi
            ;;
        3)
            log_info "检查端口占用..."
            echo "API端口 $API_PORT:"
            lsof -i :$API_PORT || log_warning "端口 $API_PORT 未被占用"
            echo ""
            echo "前端端口 $FRONTEND_PORT:"
            lsof -i :$FRONTEND_PORT || log_warning "端口 $FRONTEND_PORT 未被占用"
            ;;
        4)
            log_info "系统资源使用情况:"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                echo "CPU: $(top -l 1 | grep "CPU usage" | awk '{print $3}')"
                echo "内存: $(vm_stat | grep "Pages active" | awk '{print int($3)*4096/1024/1024"MB"}')"
                echo "负载: $(uptime | awk -F'load averages:' '{print $2}')"
            else
                echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1)%"
                echo "内存: $(free -h | grep Mem | awk '{print $3"/"$2}')"
                echo "负载: $(uptime | awk -F'load average:' '{print $2}')"
            fi
            echo ""
            echo "磁盘使用:"
            df -h | grep -E "(Filesystem|/dev/)"
            ;;
        5)
            return
            ;;
        *)
            log_error "无效选择"
            ;;
    esac
    
    echo ""
    read -p "按回车键继续..."
}

# 一键安装
one_click_install() {
    log_header "一键安装和配置"
    
    log_warning "这将执行完整的安装和配置流程，包括:"
    echo "  1. 检查系统环境"
    echo "  2. 安装Node.js (如需要)"
    echo "  3. 安装pnpm (如需要)"
    echo "  4. 安装PM2"
    echo "  5. 安装项目依赖"
    echo "  6. 构建项目"
    echo "  7. 启动服务"
    echo "  8. 配置开机自启"
    echo "  9. 健康检查"
    echo ""
    
    read -p "确定要开始一键安装吗? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        return
    fi
    
    # 执行安装流程
    separator
    
    # 1. 检查系统环境
    if ! check_system; then
        log_info "需要安装基础环境..."
        
        # 安装Node.js
        if ! command -v node &> /dev/null; then
            install_nodejs
        fi
        
        # 安装pnpm
        if ! command -v pnpm &> /dev/null; then
            install_pnpm
        fi
    fi
    
    # 2. 安装PM2
    if ! check_pm2; then
        install_pm2
    fi
    
    # 3. 安装项目依赖
    if [[ ! -d "node_modules" ]]; then
        install_dependencies
    else
        log_success "项目依赖已存在"
    fi
    
    # 4. 构建项目
    if [[ ! -d "dist" ]]; then
        build_project
    else
        log_success "构建文件已存在"
    fi
    
    # 5. 启动服务
    start_services
    
    # 6. 配置开机自启
    read -p "是否配置开机自启? (y/N): " setup_auto
    if [[ $setup_auto =~ ^[Yy]$ ]]; then
        setup_startup
    fi
    
    # 7. 健康检查
    sleep 5
    health_check
    
    separator
    log_success "一键安装完成!"
    log_info "您现在可以通过以下地址访问应用:"
    echo "  前端: http://localhost:$FRONTEND_PORT"
    echo "  API: http://localhost:$API_PORT"
    echo "  健康检查: $HEALTH_CHECK_URL"
}

# 显示主菜单
show_main_menu() {
    clear
    echo -e "${PURPLE}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                    🚀 TRON能量租赁系统                        ║
║                     PM2管理控制台                             ║
║                      v1.0.0                                 ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${CYAN}📋 系统管理${NC}"
    echo "  1)  一键安装和配置"
    echo "  2)  检查系统环境"
    echo "  3)  安装PM2"
    echo "  4)  安装项目依赖"
    echo "  5)  构建项目"
    echo ""
    
    echo -e "${GREEN}🎮 服务控制${NC}"
    echo "  6)  启动服务"
    echo "  7)  停止服务"
    echo "  8)  重启服务"
    echo "  9)  重载服务 (零停机)"
    echo "  10) 删除服务"
    echo ""
    
    echo -e "${YELLOW}📊 监控和日志${NC}"
    echo "  11) 服务状态"
    echo "  12) 健康检查"
    echo "  13) 查看日志"
    echo "  14) 性能监控"
    echo ""
    
    echo -e "${BLUE}⚙️  高级功能${NC}"
    echo "  15) 配置开机自启"
    echo "  16) 取消开机自启"
    echo "  17) 清理日志"
    echo "  18) 性能优化"
    echo "  19) 备份和恢复"
    echo "  20) 故障排除"
    echo ""
    
    echo -e "${RED}🚪 退出${NC}"
    echo "  0)  退出程序"
    echo ""
    
    # 显示当前状态
    if command -v pm2 &> /dev/null; then
        echo -e "${CYAN}当前状态:${NC}"
        pm2 list --no-color 2>/dev/null | head -5
        echo ""
    fi
}

# 主程序循环
main() {
    # 检查是否在正确的目录
    if [[ ! -f "package.json" ]]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 检查root用户
    check_root
    
    while true; do
        show_main_menu
        
        read -p "请选择操作 (0-20): " choice
        echo ""
        
        case $choice in
            1)  one_click_install ;;
            2)  check_system ;;
            3)  install_pm2 ;;
            4)  install_dependencies ;;
            5)  build_project ;;
            6)  start_services ;;
            7)  stop_services ;;
            8)  restart_services ;;
            9)  reload_services ;;
            10) delete_services ;;
            11) show_status ;;
            12) health_check ;;
            13) show_logs ;;
            14) show_monitoring ;;
            15) setup_startup ;;
            16) disable_startup ;;
            17) cleanup_logs ;;
            18) performance_tuning ;;
            19) backup_restore ;;
            20) troubleshooting ;;
            0)
                log_success "感谢使用TRON能量租赁系统PM2管理工具!"
                exit 0
                ;;
            *)
                log_error "无效选择，请输入0-20之间的数字"
                ;;
        esac
        
        if [[ $choice != 0 ]] && [[ $choice != 11 ]] && [[ $choice != 13 ]] && [[ $choice != 14 ]]; then
            echo ""
            read -p "按回车键继续..."
        fi
    done
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
