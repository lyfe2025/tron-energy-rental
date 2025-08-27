#!/bin/bash

# 通用工具函数和配置
# 项目管理脚本的公共模块

# 颜色定义
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export PURPLE='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[1;37m'
export BOLD='\033[1m'
export UNDERLINE='\033[4m'
export NC='\033[0m' # No Color

# 特殊字符和图标
export CHECK_MARK='✓'
export CROSS_MARK='✗'
export ARROW='➤'
export STAR='★'
export GEAR='⚙️'
export ROCKET='🚀'
export STOP='🛑'
export REFRESH='🔄'
export EYE='👁️'
export TRASH='🗑️'
export HELP='❓'
export EXIT='🚪'

# 初始化项目环境
init_project_env() {
    # 项目根目录 - 使用调用脚本的目录
    if [ -z "$PROJECT_DIR" ]; then
        export PROJECT_DIR="$(pwd)"
    fi
    cd "$PROJECT_DIR"
    
    # 加载环境变量
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    else
        echo -e "${RED}错误: 未找到 .env 文件${NC}"
        return 1
    fi
    
    # 配置变量
    export BACKEND_PORT="${PORT:-3001}"
    export FRONTEND_PORT="${VITE_PORT:-5173}"
    export NODE_ENV="${NODE_ENV:-development}"
    
    # 目录配置
    export LOG_DIR="$PROJECT_DIR/logs"
    export BACKUP_DIR="$PROJECT_DIR/backups"
    export SCRIPTS_DIR="$PROJECT_DIR/scripts"
    
    # 创建必要目录
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
    
    # 日志文件
    export BACKEND_LOG="$LOG_DIR/backend.log"
    export FRONTEND_LOG="$LOG_DIR/frontend.log"
    
    return 0
}

# 检查服务状态
check_service_status() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        local our_service_count=0
        local total_count=0
        
        # 使用数组处理PID，避免换行符问题
        local pids_array=()
        while IFS= read -r pid; do
            [ -n "$pid" ] && pids_array+=("$pid")
        done < <(lsof -i :$port -t 2>/dev/null)
        
        for pid in "${pids_array[@]}"; do
            total_count=$((total_count + 1))
            local process_info=$(ps -p "$pid" -o args= 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            
            if [ -n "$process_info" ]; then
                # 检查是否是我们的服务进程
                if echo "$process_info" | grep -q -E "(node|npm|pnpm|yarn|tsx|ts-node)" && \
                   (echo "$process_info" | grep -q -E "(dev:api|dev:frontend|server\.ts|vite|express)" || \
                    echo "$process_info" | grep -q "tron-energy-rental"); then
                    our_service_count=$((our_service_count + 1))
                fi
            fi
        done
        
        if [ $our_service_count -gt 0 ]; then
            echo -e "${GREEN}${CHECK_MARK} $service_name 正在运行 (端口: $port, 进程数: $our_service_count/$total_count)${NC}"
            return 0
        else
            echo -e "${YELLOW}${ARROW} 端口 $port 被其他进程占用 (非$service_name)${NC}"
            return 1
        fi
    else
        echo -e "${RED}${CROSS_MARK} $service_name 未运行 (端口: $port)${NC}"
        return 1
    fi
}

# 预览将要停止的进程
preview_stop_processes() {
    local port=$1
    local service_name=$2
    
    if ! lsof -i :$port >/dev/null 2>&1; then
        echo -e "${GREEN}${ARROW} 端口 $port 未被占用${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}${ARROW} 端口 $port 上的进程:${NC}"
    
    local our_service_found=false
    local process_count=0
    
    # 使用数组处理PID，避免换行符和变量范围问题
    local pids_array=()
    while IFS= read -r pid; do
        [ -n "$pid" ] && pids_array+=("$pid")
    done < <(lsof -i :$port -t 2>/dev/null)
    
    for pid in "${pids_array[@]}"; do
        # 直接测试 ps 命令
        if ps -p "$pid" >/dev/null 2>&1; then
            local command=$(ps -p "$pid" -o command= 2>/dev/null)
            
            # 如果 command= 不工作，尝试 args=
            if [ -z "$command" ]; then
                command=$(ps -p "$pid" -o args= 2>/dev/null)
            fi
            
            # 清理空白字符
            command=$(echo "$command" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            
            if [ -n "$command" ]; then
                process_count=$((process_count + 1))
                local status_icon="${RED}[其他]${NC}"
                
                # 检查是否是我们的服务进程
                if echo "$command" | grep -q -E "(node|npm|pnpm|yarn|tsx|ts-node)" && \
                   (echo "$command" | grep -q -E "(dev:api|dev:frontend|server\.ts|vite|express)" || \
                    echo "$command" | grep -q "tron-energy-rental"); then
                    status_icon="${GREEN}[项目]${NC}"
                    our_service_found=true
                fi
                
                echo -e "  $status_icon PID: $pid - ${command:0:80}..."
            fi
        fi
    done
    
    if [ "$our_service_found" = "false" ]; then
        echo -e "${YELLOW}${ARROW} 端口 $port 未发现项目相关进程${NC}"
    fi
    
    return 0
}

# 停止指定端口的服务（安全版本）
stop_service_on_port() {
    local port=$1
    local service_name=$2
    
    if ! lsof -i :$port >/dev/null 2>&1; then
        echo -e "${GREEN}${ARROW} $service_name 未在运行${NC}"
        return 0
    fi
    
    echo -e "${GREEN}${STOP} 正在停止 $service_name (端口: $port)...${NC}"
    
    # 获取端口相关的进程信息
    local port_processes=$(lsof -i :$port -t 2>/dev/null | tr '\n' ' ')
    local stopped_count=0
    
    for pid in $port_processes; do
        # 获取进程的详细信息
        local command=$(ps -p $pid -o args= 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        if [ -z "$command" ]; then
            continue
        fi
        
        # 检查是否是我们的服务进程
        local is_our_service=false
        
        # 检查是否是 Node.js 相关进程（前后端都是Node.js）
        if echo "$command" | grep -q -E "(node|npm|pnpm|yarn|tsx|ts-node)"; then
            # 进一步检查是否包含我们项目的特征
            if echo "$command" | grep -q -E "(dev:api|dev:frontend|server\.ts|vite|express)"; then
                is_our_service=true
            # 检查进程是否在我们的项目目录下运行
            elif echo "$command" | grep -q "tron-energy-rental"; then
                is_our_service=true
            fi
        fi
        
        # 如果确认是我们的服务，则停止它
        if [ "$is_our_service" = true ]; then
            echo -e "${GREEN}${ARROW} 停止进程 PID: $pid${NC}"
            echo -e "${GREEN}${ARROW} 进程命令: ${YELLOW}$(echo "$command" | cut -c1-60)...${NC}"
            
            # 优雅停止
            kill -TERM $pid 2>/dev/null
            
            # 等待进程结束
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                sleep 0.5
                count=$((count + 1))
            done
            
            # 如果进程仍在运行，强制杀死
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}${ARROW} 进程未响应优雅停止，强制停止 PID: $pid${NC}"
                kill -KILL $pid 2>/dev/null
                sleep 0.5
            fi
            
            # 验证是否成功停止
            if ! kill -0 $pid 2>/dev/null; then
                stopped_count=$((stopped_count + 1))
                echo -e "${GREEN}${CHECK_MARK} 进程 $pid 已停止${NC}"
            else
                echo -e "${RED}${CROSS_MARK} 无法停止进程 $pid${NC}"
            fi
        else
            echo -e "${YELLOW}${ARROW} 跳过非项目进程 PID: $pid (${command:0:40}...)${NC}"
        fi
    done
    
    # 最终检查端口状态
    if ! lsof -i :$port >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECK_MARK} $service_name 已完全停止${NC}"
    elif [ $stopped_count -gt 0 ]; then
        echo -e "${YELLOW}${ARROW} $service_name 部分停止，端口 $port 可能仍被其他进程占用${NC}"
        # 显示仍在运行的进程信息
        local remaining_pids=$(lsof -ti :$port 2>/dev/null)
        for remaining_pid in $remaining_pids; do
            local remaining_info="PID: $remaining_pid - $(ps -p $remaining_pid -o args= 2>/dev/null)"
            if [ -n "$remaining_info" ]; then
                echo -e "${YELLOW}${ARROW} 剩余进程: $remaining_info${NC}"
            fi
        done
    else
        echo -e "${YELLOW}${ARROW} 端口 $port 被非项目进程占用，已跳过停止操作${NC}"
    fi
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

# 显示所有服务访问地址
show_all_urls() {
    local address=$(get_access_address)
    local protocol="http"
    
    # 检查是否为HTTPS
    if [ "$NODE_ENV" = "production" ] || [ -n "$SSL_CERT" ]; then
        protocol="https"
    fi
    
    echo -e "\n${GREEN}${STAR} === 服务访问地址 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 前端应用: ${YELLOW}${protocol}://localhost:${FRONTEND_PORT}${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端API: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/api${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 健康检查: ${YELLOW}${protocol}://localhost:${BACKEND_PORT}/health${NC}"
    
    # 如果不是localhost，显示网络访问地址
    if [ "$address" != "localhost" ]; then
        echo -e "\n${BLUE}${STAR} 网络访问地址:${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 前端应用: ${YELLOW}${protocol}://${address}:${FRONTEND_PORT}${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 后端API: ${YELLOW}${protocol}://${address}:${BACKEND_PORT}/api${NC}"
    fi
    
    echo -e "\n${GREEN}${ARROW}${NC} 提示: 前端应用是用户界面，后端API提供数据服务"
}

# 加载模块函数
load_module() {
    local module_name="$1"
    local module_path="$SCRIPTS_DIR/core/$module_name.sh"
    
    if [ -f "$module_path" ]; then
        source "$module_path"
        return 0
    else
        echo -e "${RED}${CROSS_MARK} 错误: 模块文件不存在: $module_path${NC}"
        return 1
    fi
}

# 确保已初始化
if [ -z "$PROJECT_DIR" ]; then
    init_project_env
fi
