#!/bin/bash

# 服务管理模块
# 负责前后端服务的启动、停止、重启等操作

# 确保工具函数已加载
if [ -z "$PROJECT_DIR" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/utils.sh"
fi

# 启动后端服务
start_backend() {
    echo -e "${GREEN}${ROCKET} 正在启动后端服务...${NC}"
    
    # 检查端口状态
    if lsof -i :$BACKEND_PORT >/dev/null 2>&1; then
        # 端口被占用，检查是否是我们的服务
        local pids=$(lsof -ti :$BACKEND_PORT | tr '\n' ' ')
        local is_our_service=false
        
        for pid in $pids; do
            local process_info=$(ps -p $pid -o args= 2>/dev/null)
            if [ -n "$process_info" ] && echo "$process_info" | grep -q -E "(node|npm|pnpm|yarn|tsx|ts-node)" && \
               (echo "$process_info" | grep -q -E "(dev:api|dev:frontend|server\.ts|vite|express)" || \
                echo "$process_info" | grep -q "tron-energy-rental"); then
                is_our_service=true
                break
            fi
        done
        
        if [ "$is_our_service" = true ]; then
            echo -e "${GREEN}${CHECK_MARK} 后端服务已在运行${NC}"
            return 0
        else
            echo -e "${YELLOW}${ARROW} 端口 $BACKEND_PORT 被其他进程占用${NC}"
            preview_stop_processes $BACKEND_PORT "后端服务"
            echo ""
            read -p "是否停止占用端口的进程并启动后端服务? (y/N): " confirm
            
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                stop_service_on_port $BACKEND_PORT "端口冲突进程"
                sleep 1
            else
                echo -e "${YELLOW}${ARROW} 已取消启动后端服务${NC}"
                return 1
            fi
        fi
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
        if lsof -i :$BACKEND_PORT >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} 后端服务启动成功${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "${RED}${CROSS_MARK} 后端服务启动超时${NC}"
    echo -e "${YELLOW}${ARROW} 查看日志: tail -f $BACKEND_LOG${NC}"
    return 1
}

# 启动前端服务
start_frontend() {
    echo -e "${GREEN}${ROCKET} 正在启动前端服务...${NC}"
    
    # 检查端口状态
    if lsof -i :$FRONTEND_PORT >/dev/null 2>&1; then
        # 端口被占用，检查是否是我们的服务
        local pids=$(lsof -ti :$FRONTEND_PORT | tr '\n' ' ')
        local is_our_service=false
        
        for pid in $pids; do
            local process_info=$(ps -p $pid -o args= 2>/dev/null)
            if [ -n "$process_info" ] && echo "$process_info" | grep -q -E "(node|npm|pnpm|yarn|tsx|ts-node)" && \
               (echo "$process_info" | grep -q -E "(dev:api|dev:frontend|server\.ts|vite|express)" || \
                echo "$process_info" | grep -q "tron-energy-rental"); then
                is_our_service=true
                break
            fi
        done
        
        if [ "$is_our_service" = true ]; then
            echo -e "${GREEN}${CHECK_MARK} 前端服务已在运行${NC}"
            return 0
        else
            echo -e "${YELLOW}${ARROW} 端口 $FRONTEND_PORT 被其他进程占用${NC}"
            preview_stop_processes $FRONTEND_PORT "前端服务"
            echo ""
            read -p "是否停止占用端口的进程并启动前端服务? (y/N): " confirm
            
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                stop_service_on_port $FRONTEND_PORT "端口冲突进程"
                sleep 1
            else
                echo -e "${YELLOW}${ARROW} 已取消启动前端服务${NC}"
                return 1
            fi
        fi
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
        if lsof -i :$FRONTEND_PORT >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} 前端服务启动成功${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "${RED}${CROSS_MARK} 前端服务启动超时${NC}"
    echo -e "${YELLOW}${ARROW} 查看日志: tail -f $FRONTEND_LOG${NC}"
    return 1
}

# 启动所有服务
start_all_services() {
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

# 停止所有服务（安全版本）
stop_all_services() {
    echo -e "\n${GREEN}${STOP} 正在停止所有服务...${NC}"
    
    # 先预览将要停止的进程
    echo -e "\n${GREEN}${GEAR} === 进程检查 ===${NC}"
    preview_stop_processes $BACKEND_PORT "后端服务"
    preview_stop_processes $FRONTEND_PORT "前端服务"
    
    # 检查是否有需要停止的进程
    local has_backend_processes=false
    local has_frontend_processes=false
    
    if lsof -i :$BACKEND_PORT >/dev/null 2>&1; then
        local backend_pids=$(lsof -ti :$BACKEND_PORT | tr '\n' ' ')
        for pid in $backend_pids; do
            local process_info=$(ps -p $pid -o args= 2>/dev/null)
            if [ -n "$process_info" ] && echo "$process_info" | grep -q -E "(node|npm|pnpm|yarn|tsx|ts-node)" && \
               (echo "$process_info" | grep -q -E "(dev:api|dev:frontend|server\.ts|vite|express)" || \
                echo "$process_info" | grep -q "tron-energy-rental"); then
                has_backend_processes=true
                break
            fi
        done
    fi
    
    if lsof -i :$FRONTEND_PORT >/dev/null 2>&1; then
        local frontend_pids=$(lsof -ti :$FRONTEND_PORT | tr '\n' ' ')
        for pid in $frontend_pids; do
            local process_info=$(ps -p $pid -o args= 2>/dev/null)
            if [ -n "$process_info" ] && echo "$process_info" | grep -q -E "(node|npm|pnpm|yarn|tsx|ts-node)" && \
               (echo "$process_info" | grep -q -E "(dev:api|dev:frontend|server\.ts|vite|express)" || \
                echo "$process_info" | grep -q "tron-energy-rental"); then
                has_frontend_processes=true
                break
            fi
        done
    fi
    
    # 如果没有找到项目相关进程，直接返回
    if [ "$has_backend_processes" = false ] && [ "$has_frontend_processes" = false ]; then
        echo -e "\n${GREEN}${CHECK_MARK} 没有发现运行中的项目服务${NC}"
        return 0
    fi
    
    # 询问用户确认
    echo -e "\n${YELLOW}⚠️  将要停止上述标记为 ${GREEN}[项目]${NC} 的进程${NC}"
    echo -e "${YELLOW}${ARROW} 其他进程将被跳过，不会受到影响${NC}"
    echo ""
    read -p "确认停止项目服务? (y/N): " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${YELLOW}${ARROW} 已取消停止操作${NC}"
        return 0
    fi
    
    echo -e "\n${GREEN}${ARROW} 开始安全停止服务...${NC}\n"
    
    if [ "$has_backend_processes" = true ]; then
        echo -e "${YELLOW}${ARROW} 检查并停止后端服务 (端口: $BACKEND_PORT)${NC}"
        stop_service_on_port $BACKEND_PORT "后端服务"
    fi
    
    if [ "$has_frontend_processes" = true ]; then
        echo -e "${YELLOW}${ARROW} 检查并停止前端服务 (端口: $FRONTEND_PORT)${NC}"
        stop_service_on_port $FRONTEND_PORT "前端服务"
    fi
    
    echo -e "\n${GREEN}${CHECK_MARK} 服务停止操作完成${NC}"
}

# 重启所有服务（安全版本）
restart_all_services() {
    echo -e "\n${GREEN}${REFRESH} 正在重启所有服务...${NC}"
    
    echo -e "\n${GREEN}${GEAR} === 重启流程预览 ===${NC}"
    echo -e "${GREEN}${ARROW} 第一步: 安全停止现有服务${NC}"
    echo -e "${GREEN}${ARROW} 第二步: 等待端口完全释放${NC}"
    echo -e "${GREEN}${ARROW} 第三步: 重新启动所有服务${NC}"
    echo ""
    
    echo -e "${YELLOW}${ARROW} 第一步: 停止所有服务${NC}"
    stop_all_services
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}${CROSS_MARK} 停止服务失败，取消重启操作${NC}"
        return 1
    fi
    
    echo -e "\n${YELLOW}${ARROW} 第二步: 等待进程完全释放端口${NC}"
    echo -e "${GREEN}⏳ 等待中...${NC}"
    sleep 3
    
    # 验证端口是否已释放
    local ports_free=true
    if lsof -i :$BACKEND_PORT >/dev/null 2>&1; then
        echo -e "${YELLOW}${ARROW} 后端端口 $BACKEND_PORT 仍被占用${NC}"
        ports_free=false
    fi
    
    if lsof -i :$FRONTEND_PORT >/dev/null 2>&1; then
        echo -e "${YELLOW}${ARROW} 前端端口 $FRONTEND_PORT 仍被占用${NC}"
        ports_free=false
    fi
    
    if [ "$ports_free" = false ]; then
        echo -e "${YELLOW}${ARROW} 等待额外时间让端口完全释放...${NC}"
        sleep 2
    fi
    
    echo -e "\n${YELLOW}${ARROW} 第三步: 重新启动所有服务${NC}"
    start_all_services
}

# 显示服务状态信息
# 此函数会检查并显示所有服务的运行状态，不会因为服务未运行而退出脚本
show_service_status() {
    echo -e "\n${GREEN}${EYE} === 服务状态 ===${NC}"
    
    # 使用 || true 防止因服务未运行而触发 set -e 导致脚本退出
    check_service_status $BACKEND_PORT "后端服务" || true
    check_service_status $FRONTEND_PORT "前端服务" || true
    
    echo -e "\n${GREEN}${GEAR} === 端口信息 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端端口: ${YELLOW}$BACKEND_PORT${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 前端端口: ${YELLOW}$FRONTEND_PORT${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 环境: ${YELLOW}$NODE_ENV${NC}"
    
    # 如果服务正在运行，显示访问地址
    if lsof -i :$BACKEND_PORT >/dev/null 2>&1 || lsof -i :$FRONTEND_PORT >/dev/null 2>&1; then
        show_all_urls || true
    fi
    
    echo -e "\n${GREEN}${GEAR} === 日志文件 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端日志: ${YELLOW}$BACKEND_LOG${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 前端日志: ${YELLOW}$FRONTEND_LOG${NC}"
    
    # 确保函数总是返回成功状态，避免因为子函数的返回值影响脚本执行
    return 0
}
