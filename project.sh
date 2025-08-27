#!/bin/bash

# 项目统一管理脚本
# 支持前后台服务的启动、停止、重启等操作

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
UNDERLINE='\033[4m'
NC='\033[0m' # No Color

# 特殊字符和图标
CHECK_MARK='✓'
CROSS_MARK='✗'
ARROW='➤'
STAR='★'
GEAR='⚙️'
ROCKET='🚀'
STOP='🛑'
REFRESH='🔄'
EYE='👁️'
TRASH='🗑️'
HELP='❓'
EXIT='🚪'

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 加载环境变量
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}错误: 未找到 .env 文件${NC}"
    exit 1
fi

# 配置变量
BACKEND_PORT="${PORT:-3001}"
FRONTEND_PORT="${VITE_PORT:-5173}"
NODE_ENV="${NODE_ENV:-development}"

# 日志文件
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# 检查服务状态
check_service_status() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port)
        echo -e "${GREEN}${CHECK_MARK} $service_name 正在运行 (端口: $port, PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}${CROSS_MARK} $service_name 未运行 (端口: $port)${NC}"
        return 1
    fi
}

# 停止指定端口的服务
stop_service_on_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        local pids=$(lsof -ti :$port)
        echo -e "${GREEN}${STOP} 正在停止 $service_name (端口: $port)...${NC}"
        
        for pid in $pids; do
            echo -e "${GREEN}${ARROW} 停止进程 PID: $pid${NC}"
            kill -TERM $pid 2>/dev/null
            
            # 等待进程结束
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                sleep 0.5
                count=$((count + 1))
            done
            
            # 如果进程仍在运行，强制杀死
            if kill -0 $pid 2>/dev/null; then
                echo -e "${GREEN}${ARROW} 强制停止进程 PID: $pid${NC}"
                kill -KILL $pid 2>/dev/null
            fi
        done
        
        echo -e "${GREEN}${CHECK_MARK} $service_name 已停止${NC}"
    else
        echo -e "${GREEN}${ARROW} $service_name 未在运行${NC}"
    fi
}

# 启动后端服务
start_backend() {
    echo -e "${GREEN}${ROCKET} 正在启动后端服务...${NC}"
    
    if check_service_status $BACKEND_PORT "后端服务"; then
        echo -e "${GREEN}${ARROW} 后端服务已在运行${NC}"
        return 0
    fi
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${GREEN}${ARROW} 正在安装依赖...${NC}"
        pnpm install
    fi
    
    # 启动后端服务
    echo -e "${GREEN}${ARROW} 启动后端服务 (端口: $BACKEND_PORT)${NC}"
    nohup pnpm run dev:api > "$BACKEND_LOG" 2>&1 &
    
    # 等待服务启动
    local count=0
    while [ $count -lt 30 ]; do
        if check_service_status $BACKEND_PORT "后端服务" >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} 后端服务启动成功${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "${RED}${CROSS_MARK} 后端服务启动超时${NC}"
    return 1
}

# 启动前端服务
start_frontend() {
    echo -e "${GREEN}${ROCKET} 正在启动前端服务...${NC}"
    
    if check_service_status $FRONTEND_PORT "前端服务"; then
        echo -e "${GREEN}${ARROW} 前端服务已在运行${NC}"
        return 0
    fi
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo -e "${GREEN}${ARROW} 正在安装依赖...${NC}"
        pnpm install
    fi
    
    # 启动前端服务
    echo -e "${GREEN}${ARROW} 启动前端服务 (端口: $FRONTEND_PORT)${NC}"
    nohup pnpm run dev:frontend > "$FRONTEND_LOG" 2>&1 &
    
    # 等待服务启动
    local count=0
    while [ $count -lt 30 ]; do
        if check_service_status $FRONTEND_PORT "前端服务" >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} 前端服务启动成功${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "${RED}${CROSS_MARK} 前端服务启动超时${NC}"
    return 1
}

# 启动所有服务
start_all() {
    echo -e "\n${GREEN}${ROCKET} 正在启动所有服务...${NC}"
    echo -e "${GREEN}${ARROW} 请稍候...${NC}\n"
    
    start_backend
    if [ $? -eq 0 ]; then
        start_frontend
        if [ $? -eq 0 ]; then
            echo -e "\n${GREEN}${CHECK_MARK} 所有服务启动成功！${NC}"
            show_all_urls
        else
            echo -e "\n${RED}${CROSS_MARK} 前端服务启动失败${NC}"
            return 1
        fi
    else
        echo -e "\n${RED}${CROSS_MARK} 后端服务启动失败${NC}"
        return 1
    fi
}

# 停止所有服务
stop_all() {
    echo -e "\n${GREEN}${STOP} 正在停止所有服务...${NC}"
    echo -e "${GREEN}${ARROW} 请稍候...${NC}\n"
    
    echo -e "${YELLOW}${ARROW} 检查并停止后端服务 (端口: $BACKEND_PORT)${NC}"
    stop_service_on_port $BACKEND_PORT "后端服务"
    
    echo -e "${YELLOW}${ARROW} 检查并停止前端服务 (端口: $FRONTEND_PORT)${NC}"
    stop_service_on_port $FRONTEND_PORT "前端服务"
    
    echo -e "\n${GREEN}${CHECK_MARK} 所有服务已停止${NC}"
}

# 重启所有服务
restart_all() {
    echo -e "\n${GREEN}${REFRESH} 正在重启所有服务...${NC}"
    echo -e "${GREEN}${ARROW} 请稍候...${NC}\n"
    
    echo -e "${YELLOW}${ARROW} 第一步: 停止所有服务${NC}"
    stop_all
    
    echo -e "${YELLOW}${ARROW} 第二步: 等待进程完全释放端口${NC}"
    echo -e "${GREEN}⏳ 等待中...${NC}"
    sleep 2
    
    echo -e "${YELLOW}${ARROW} 第三步: 重新启动所有服务${NC}"
    start_all
}

# 获取访问地址
get_access_address() {
    # 优先使用环境变量中的配置
    if [ -n "$HOST_ADDRESS" ]; then
        echo "$HOST_ADDRESS"
        return
    fi
    
    # 检查是否为本地开发环境
    if [ "$NODE_ENV" = "development" ] || [ "$NODE_ENV" = "local" ]; then
        echo "localhost"
        return
    fi
    
    # 生产环境尝试获取本机IP
    local ip
    if command -v ifconfig >/dev/null 2>&1; then
        # macOS/Linux
        ip=$(ifconfig | grep -E "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    elif command -v ip >/dev/null 2>&1; then
        # Linux with ip command
        ip=$(ip route get 1.1.1.1 | awk '{print $7}' | head -1)
    else
        ip="localhost"
    fi
    
    # 如果没有获取到IP，使用localhost
    if [ -z "$ip" ] || [ "$ip" = "localhost" ]; then
        echo "localhost"
    else
        echo "$ip"
    fi
}

# 显示后端访问地址
show_backend_url() {
    local address=$(get_access_address)
    local protocol="http"
    
    # 检查是否为HTTPS（从环境变量判断）
    if [ "$NODE_ENV" = "production" ] || [ -n "$SSL_CERT" ]; then
        protocol="https"
    fi
    
    echo -e "\n${GREEN}=== 后端API服务 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} API接口: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/api${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 健康检查: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/health${NC} (直接访问)"
    echo -e "  ${GREEN}${ARROW}${NC} 健康检查: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/api/health${NC} (API路径)"
    if [ "$address" != "localhost" ]; then
        echo -e "  ${GREEN}${ARROW}${NC} 网络API: ${YELLOW}${protocol}://${address}:${BACKEND_PORT}/api${NC}"
    fi
    echo -e "  ${GREEN}${ARROW}${NC} 注意: 直接访问根路径会返回API错误，请使用具体接口路径"
}

# 显示前端访问地址
show_frontend_url() {
    local address=$(get_access_address)
    local protocol="http"
    
    # 检查是否为HTTPS（从环境变量判断）
    if [ "$NODE_ENV" = "production" ] || [ -n "$SSL_CERT" ]; then
        protocol="https"
    fi
    
    echo -e "\n${GREEN}=== 前端应用服务 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 用户界面: ${YELLOW}${protocol}://localhost:${FRONTEND_PORT}${NC}"
    if [ "$address" != "localhost" ]; then
        echo -e "  ${GREEN}${ARROW}${NC} 网络访问: ${YELLOW}${protocol}://${address}:${FRONTEND_PORT}${NC}"
    fi
    echo -e "  ${GREEN}${ARROW}${NC} 说明: 这是Vue.js前端应用，提供完整的用户界面"
}

# 显示所有服务访问地址（简洁版）
show_all_urls() {
    local address=$(get_access_address)
    local protocol="http"
    
    # 检查是否为HTTPS（从环境变量判断）
    if [ "$NODE_ENV" = "production" ] || [ -n "$SSL_CERT" ]; then
        protocol="https"
    fi
    
    echo -e "\n${GREEN}${STAR} === 服务访问地址 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 前端应用: ${YELLOW}${protocol}://localhost:${FRONTEND_PORT}${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端API: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/api${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 健康检查: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/health${NC} (直接访问)"
    echo -e "  ${GREEN}${ARROW}${NC} 健康检查: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/api/health${NC} (API路径)"
    
    # 如果不是localhost，显示网络访问地址
    if [ "$address" != "localhost" ]; then
        echo -e "\n${BLUE}${STAR} 网络访问地址:${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 前端应用: ${YELLOW}${protocol}://${address}:${FRONTEND_PORT}${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 后端API: ${YELLOW}${protocol}://${address}:${BACKEND_PORT}/api${NC}"
    fi
    
    echo -e "\n${GREEN}${ARROW}${NC} 提示: 前端应用是用户界面，后端API提供数据服务"
}

# 显示服务状态
show_status() {
    echo -e "\n${GREEN}${EYE} === 服务状态 ===${NC}"
    check_service_status $BACKEND_PORT "后端服务"
    check_service_status $FRONTEND_PORT "前端服务"
    
    echo -e "\n${GREEN}${GEAR} === 端口信息 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端端口: ${YELLOW}$BACKEND_PORT${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 前端端口: ${YELLOW}$FRONTEND_PORT${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 环境: ${YELLOW}$NODE_ENV${NC}"
    
    # 如果服务正在运行，显示访问地址
    if lsof -i :$BACKEND_PORT >/dev/null 2>&1; then
        show_backend_url
    fi
    
    if lsof -i :$FRONTEND_PORT >/dev/null 2>&1; then
        show_frontend_url
    fi
    
    echo -e "\n${GREEN}${GEAR} === 日志文件 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端日志: ${YELLOW}$BACKEND_LOG${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 前端日志: ${YELLOW}$FRONTEND_LOG${NC}"
}

# 显示日志
show_logs() {
    echo -e "\n${GREEN}${GEAR} === 选择要查看的日志 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 1) 后端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 2) 前端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 3) 实时后端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 4) 实时前端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 0) 返回主菜单"
    echo ""
    read -p "  请选择: " log_choice
    
    case $log_choice in
        1)
            if [ -f "$BACKEND_LOG" ]; then
                echo -e "\n${BLUE}=== 后端日志 ===${NC}"
                cat "$BACKEND_LOG"
            else
                echo -e "${YELLOW}后端日志文件不存在${NC}"
            fi
            ;;
        2)
            if [ -f "$FRONTEND_LOG" ]; then
                echo -e "\n${BLUE}=== 前端日志 ===${NC}"
                cat "$FRONTEND_LOG"
            else
                echo -e "${YELLOW}前端日志文件不存在${NC}"
            fi
            ;;
        3)
            if [ -f "$BACKEND_LOG" ]; then
                echo -e "\n${BLUE}=== 实时后端日志 (按 Ctrl+C 退出) ===${NC}"
                tail -f "$BACKEND_LOG"
            else
                echo -e "${YELLOW}后端日志文件不存在${NC}"
            fi
            ;;
        4)
            if [ -f "$FRONTEND_LOG" ]; then
                echo -e "\n${BLUE}=== 实时前端日志 (按 Ctrl+C 退出) ===${NC}"
                tail -f "$FRONTEND_LOG"
            else
                echo -e "${YELLOW}前端日志文件不存在${NC}"
            fi
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            ;;
    esac
}

# 清理日志
clean_logs() {
    echo -e "\n${GREEN}${TRASH} 正在清理日志文件...${NC}"
    
    if [ -f "$BACKEND_LOG" ]; then
        rm "$BACKEND_LOG"
        echo -e "${GREEN}${CHECK_MARK} 后端日志已清理${NC}"
    fi
    
    if [ -f "$FRONTEND_LOG" ]; then
        rm "$FRONTEND_LOG"
        echo -e "${GREEN}${CHECK_MARK} 前端日志已清理${NC}"
    fi
    
    echo -e "\n${GREEN}${CHECK_MARK} 日志清理完成${NC}"
}

# 显示帮助信息
show_help() {
    echo -e "\n${GREEN}${HELP} === 使用说明 ===${NC}"
    echo -e "${WHITE}此脚本用于管理项目的前后台服务${NC}"
    echo ""
    echo -e "${BOLD}主要功能:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 一键启动所有服务（前后台）"
    echo -e "  ${GREEN}${ARROW}${NC} 一键停止所有服务（前后台）"
    echo -e "  ${GREEN}${ARROW}${NC} 一键重启所有服务（前后台）"
    echo -e "  ${GREEN}${ARROW}${NC} 查看服务状态和日志"
    echo -e "  ${GREEN}${ARROW}${NC} 清理日志文件"
    echo ""
    echo -e "${BOLD}环境配置:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端端口: ${YELLOW}$BACKEND_PORT${NC} (从 .env 读取)"
    echo -e "  ${GREEN}${ARROW}${NC} 前端端口: ${YELLOW}$FRONTEND_PORT${NC} (从 .env 读取)"
    echo -e "  ${GREEN}${ARROW}${NC} 环境: ${YELLOW}$NODE_ENV${NC}"
    echo ""
    echo -e "${BOLD}日志文件:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端: ${YELLOW}$BACKEND_LOG${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 前端: ${YELLOW}$FRONTEND_LOG${NC}"
}

# 主菜单
show_menu() {
    clear
    echo -e "${GREEN}${BOLD}                    🚀 项目统一管理脚本 🚀${NC}"
    echo ""
    echo -e "${BOLD}1)${NC} 启动所有服务"
    echo -e "${BOLD}2)${NC} 停止所有服务"
    echo -e "${BOLD}3)${NC} 重启所有服务"
    echo -e "${BOLD}4)${NC} 查看服务状态"
    echo -e "${BOLD}5)${NC} 查看日志"
    echo -e "${BOLD}6)${NC} 清理日志"
    echo -e "${BOLD}7)${NC} 帮助信息"
    echo -e "${BOLD}0)${NC} 退出"
    echo ""
}

# 主循环
main() {
    while true; do
        show_menu
        echo -e "${YELLOW}${ARROW} 请选择操作: ${NC}"
        read -p "   " choice
        
        case $choice in
            1)
                start_all
                ;;
            2)
                stop_all
                ;;
            3)
                restart_all
                ;;
            4)
                show_status
                ;;
            5)
                show_logs
                ;;
            6)
                clean_logs
                ;;
            7)
                show_help
                ;;
            0)
                echo -e "\n${GREEN}${EXIT} 再见! 感谢使用项目管理脚本${NC}"
                echo -e "${CYAN}${STAR} 祝您开发愉快！${NC}\n"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选择，请重新输入${NC}"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 检查是否为交互式运行
if [ -t 0 ]; then
    # 交互式运行
    main
else
    # 非交互式运行，显示帮助
    show_help
fi
