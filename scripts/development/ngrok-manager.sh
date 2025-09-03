#!/bin/bash

# TRON Energy Rental - ngrok 交互式管理脚本
# 提供便捷的 ngrok 管理功能

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 配置变量
DEFAULT_PORT=3001
NGROK_API_URL="http://localhost:4040/api/tunnels"
HEALTH_ENDPOINT="/api/health"

# 打印彩色输出
print_colored() {
    echo -e "${1}${2}${NC}"
}

# 打印标题
print_title() {
    echo
    print_colored $CYAN "=================================="
    print_colored $WHITE "$1"
    print_colored $CYAN "=================================="
    echo
}

# 打印成功信息
print_success() {
    print_colored $GREEN "✅ $1"
}

# 打印错误信息
print_error() {
    print_colored $RED "❌ $1"
}

# 打印警告信息
print_warning() {
    print_colored $YELLOW "⚠️  $1"
}

# 打印信息
print_info() {
    print_colored $BLUE "ℹ️  $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 命令未找到，请先安装"
        return 1
    fi
    return 0
}

# 检查代理设置
check_proxy() {
    print_title "检查代理设置"
    
    local has_proxy=false
    
    if [ ! -z "$HTTP_PROXY" ]; then
        print_warning "发现 HTTP_PROXY: $HTTP_PROXY"
        has_proxy=true
    fi
    
    if [ ! -z "$HTTPS_PROXY" ]; then
        print_warning "发现 HTTPS_PROXY: $HTTPS_PROXY"
        has_proxy=true
    fi
    
    if [ ! -z "$http_proxy" ]; then
        print_warning "发现 http_proxy: $http_proxy"
        has_proxy=true
    fi
    
    if [ ! -z "$https_proxy" ]; then
        print_warning "发现 https_proxy: $https_proxy"
        has_proxy=true
    fi
    
    if [ "$has_proxy" = true ]; then
        print_warning "检测到代理设置，启动 ngrok 时将自动清除这些环境变量"
        echo
        print_info "如果遇到 ERR_NGROK_9009 错误，这就是原因"
    else
        print_success "未发现代理设置"
    fi
    
    echo
    read -p "按回车键继续..."
}

# 检查端口占用
check_port() {
    local port=$1
    local service=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        print_warning "$service 端口 $port 被进程 $pid 占用"
        return 1
    else
        print_success "$service 端口 $port 可用"
        return 0
    fi
}

# 检查环境状态
check_environment() {
    print_title "环境状态检查"
    
    # 检查必要命令
    print_info "检查必要命令..."
    check_command "ngrok" || return 1
    check_command "curl" || return 1
    check_command "jq" || return 1
    print_success "所有必要命令已安装"
    echo
    
    # 检查端口
    print_info "检查端口占用..."
    check_port $DEFAULT_PORT "应用服务"
    check_port 4040 "ngrok 管理"
    echo
    
    # 检查本地服务
    print_info "检查本地服务状态..."
    if curl -s http://localhost:$DEFAULT_PORT$HEALTH_ENDPOINT > /dev/null 2>&1; then
        print_success "本地服务运行正常 (端口 $DEFAULT_PORT)"
        local health_response=$(curl -s http://localhost:$DEFAULT_PORT$HEALTH_ENDPOINT)
        print_info "健康检查响应: $health_response"
    else
        print_error "本地服务未运行或无响应"
        print_info "请先运行: npm run restart 或 pnpm run restart"
    fi
    
    echo
    read -p "按回车键继续..."
}

# 启动 ngrok
start_ngrok() {
    print_title "启动 ngrok"
    
    # 检查是否已经运行
    if curl -s $NGROK_API_URL > /dev/null 2>&1; then
        print_warning "ngrok 已经在运行"
        echo
        show_ngrok_status
        echo
        print_info "如果需要重启 ngrok，请使用重启选项"
        read -p "按回车键继续..."
        return 0
    fi
    
    # 检查本地服务
    if ! curl -s http://localhost:$DEFAULT_PORT$HEALTH_ENDPOINT > /dev/null 2>&1; then
        print_error "本地服务未运行，请先启动本地服务"
        echo
        print_info "启动命令: npm run restart 或 pnpm run restart"
        return 1
    fi
    
    print_info "正在启动 ngrok (端口 $DEFAULT_PORT)..."
    print_info "自动清除代理环境变量以避免 ERR_NGROK_9009 错误"
    
    # 使用 nohup 在后台启动 ngrok，清除代理环境变量
    nohup env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http $DEFAULT_PORT > /dev/null 2>&1 &
    
    print_info "等待 ngrok 启动..."
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        sleep 2
        if curl -s $NGROK_API_URL > /dev/null 2>&1; then
            print_success "ngrok 启动成功！"
            echo
            show_ngrok_status
            return 0
        fi
        print_info "等待中... ($attempt/$max_attempts)"
        ((attempt++))
    done
    
    print_error "ngrok 启动超时，请检查是否有错误"
    return 1
}

# 停止 ngrok
stop_ngrok() {
    print_title "停止 ngrok"
    
    local ngrok_pids=$(pgrep ngrok)
    if [ ! -z "$ngrok_pids" ]; then
        print_info "正在停止 ngrok 进程..."
        killall ngrok 2>/dev/null
        sleep 2
        
        # 确认是否停止
        if pgrep ngrok > /dev/null; then
            print_warning "强制停止 ngrok 进程..."
            killall -9 ngrok 2>/dev/null
        fi
        
        print_success "ngrok 已停止"
    else
        print_info "没有运行中的 ngrok 进程"
    fi
    
    echo
    read -p "按回车键继续..."
}

# 重启 ngrok
restart_ngrok() {
    print_title "重启 ngrok"
    
    # 检查本地服务是否运行
    if ! curl -s http://localhost:$DEFAULT_PORT$HEALTH_ENDPOINT > /dev/null 2>&1; then
        print_error "本地服务未运行，请先启动本地服务"
        echo
        print_info "启动命令: npm run restart 或 pnpm run restart"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    print_info "正在重启 ngrok..."
    
    # 停止现有的 ngrok
    local ngrok_pids=$(pgrep ngrok)
    if [ ! -z "$ngrok_pids" ]; then
        print_info "停止现有的 ngrok 进程..."
        killall ngrok 2>/dev/null
        sleep 2
        
        # 确认是否停止
        if pgrep ngrok > /dev/null; then
            print_warning "强制停止 ngrok 进程..."
            killall -9 ngrok 2>/dev/null
        fi
        print_success "旧的 ngrok 进程已停止"
    else
        print_info "没有发现运行中的 ngrok 进程"
    fi
    
    # 等待端口释放
    sleep 1
    
    # 启动新的 ngrok
    print_info "启动新的 ngrok (端口 $DEFAULT_PORT)..."
    print_info "自动清除代理环境变量以避免 ERR_NGROK_9009 错误"
    
    # 使用 nohup 在后台启动 ngrok，清除代理环境变量
    nohup env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy ngrok http $DEFAULT_PORT > /dev/null 2>&1 &
    
    print_info "等待 ngrok 启动..."
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        sleep 2
        if curl -s $NGROK_API_URL > /dev/null 2>&1; then
            print_success "ngrok 重启成功！"
            echo
            show_ngrok_status
            echo
            read -p "按回车键继续..."
            return 0
        fi
        print_info "等待中... ($attempt/$max_attempts)"
        ((attempt++))
    done
    
    print_error "ngrok 重启超时，请检查是否有错误"
    echo
    read -p "按回车键继续..."
    return 1
}

# 显示 ngrok 状态
show_ngrok_status() {
    print_title "ngrok 状态"
    
    if ! curl -s $NGROK_API_URL > /dev/null 2>&1; then
        print_error "ngrok 未运行"
        return 1
    fi
    
    local tunnel_info=$(curl -s $NGROK_API_URL | jq -r '.tunnels[0]')
    if [ "$tunnel_info" = "null" ]; then
        print_error "未找到 ngrok 隧道信息"
        return 1
    fi
    
    local public_url=$(echo $tunnel_info | jq -r '.public_url')
    local local_addr=$(echo $tunnel_info | jq -r '.config.addr')
    local name=$(echo $tunnel_info | jq -r '.name')
    
    print_success "ngrok 运行状态: 正常"
    print_info "隧道名称: $name"
    print_info "本地地址: $local_addr"
    print_info "公网地址: $public_url"
    print_info "管理界面: http://localhost:4040"
    
    echo
    return 0
}

# 测试连接
test_connections() {
    print_title "测试连接"
    
    # 测试本地连接
    print_info "测试本地连接..."
    if curl -s http://localhost:$DEFAULT_PORT$HEALTH_ENDPOINT > /dev/null 2>&1; then
        local local_response=$(curl -s http://localhost:$DEFAULT_PORT$HEALTH_ENDPOINT)
        print_success "本地连接正常"
        print_info "响应: $local_response"
    else
        print_error "本地连接失败"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    echo
    
    # 测试 ngrok 连接
    print_info "测试 ngrok 公网连接..."
    if ! curl -s $NGROK_API_URL > /dev/null 2>&1; then
        print_error "ngrok 未运行，请先启动 ngrok"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    local public_url=$(curl -s $NGROK_API_URL | jq -r '.tunnels[0].public_url')
    if [ "$public_url" = "null" ] || [ -z "$public_url" ]; then
        print_error "无法获取 ngrok 公网地址"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    if curl -s "$public_url$HEALTH_ENDPOINT" > /dev/null 2>&1; then
        local public_response=$(curl -s "$public_url$HEALTH_ENDPOINT")
        print_success "公网连接正常"
        print_info "公网地址: $public_url"
        print_info "响应: $public_response"
    else
        print_error "公网连接失败"
        print_warning "可能原因: ngrok 还在初始化或网络问题"
    fi
    
    echo
    read -p "按回车键继续..."
}

# 获取 ngrok URL
get_ngrok_url() {
    print_title "获取 ngrok URL"
    
    if ! curl -s $NGROK_API_URL > /dev/null 2>&1; then
        print_error "ngrok 未运行"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    local public_url=$(curl -s $NGROK_API_URL | jq -r '.tunnels[0].public_url')
    if [ "$public_url" = "null" ] || [ -z "$public_url" ]; then
        print_error "无法获取 ngrok 公网地址"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    print_success "ngrok 公网地址: $public_url"
    echo
    print_info "可用于以下用途:"
    echo "  • Telegram Webhook: $public_url/api/telegram/webhook"
    echo "  • API 测试: $public_url/api/"
    echo "  • 前端访问: $public_url"
    echo "  • 健康检查: $public_url$HEALTH_ENDPOINT"
    
    echo
    print_info "是否要复制到剪贴板? (需要 pbcopy 命令)"
    read -p "复制到剪贴板? (y/n): " copy_choice
    if [ "$copy_choice" = "y" ] || [ "$copy_choice" = "Y" ]; then
        if command -v pbcopy &> /dev/null; then
            echo "$public_url" | pbcopy
            print_success "已复制到剪贴板"
        else
            print_warning "pbcopy 命令未找到，请手动复制"
        fi
    fi
    
    echo
    read -p "按回车键继续..."
}

# 设置 Telegram Webhook
setup_telegram_webhook() {
    print_title "设置 Telegram Webhook"
    
    # 获取 ngrok URL
    if ! curl -s $NGROK_API_URL > /dev/null 2>&1; then
        print_error "ngrok 未运行，请先启动 ngrok"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    local public_url=$(curl -s $NGROK_API_URL | jq -r '.tunnels[0].public_url')
    if [ "$public_url" = "null" ] || [ -z "$public_url" ]; then
        print_error "无法获取 ngrok 公网地址"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    print_info "当前 ngrok 地址: $public_url"
    echo
    
    # 获取 Bot Token
    read -p "请输入 Telegram Bot Token: " bot_token
    if [ -z "$bot_token" ]; then
        print_error "Bot Token 不能为空"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    # 构建 webhook URL
    local webhook_url="$public_url/api/telegram/webhook"
    
    print_info "正在设置 Webhook..."
    print_info "Webhook URL: $webhook_url"
    
    # 设置 webhook
    local response=$(curl -s -X POST "https://api.telegram.org/bot$bot_token/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$webhook_url\"}")
    
    local success=$(echo $response | jq -r '.ok')
    if [ "$success" = "true" ]; then
        print_success "Telegram Webhook 设置成功"
        local description=$(echo $response | jq -r '.description')
        print_info "响应: $description"
    else
        print_error "Telegram Webhook 设置失败"
        local description=$(echo $response | jq -r '.description')
        print_error "错误: $description"
    fi
    
    echo
    print_info "验证 Webhook 状态..."
    local webhook_info=$(curl -s "https://api.telegram.org/bot$bot_token/getWebhookInfo")
    local webhook_url_set=$(echo $webhook_info | jq -r '.result.url')
    
    if [ "$webhook_url_set" = "$webhook_url" ]; then
        print_success "Webhook 验证成功"
        print_info "当前 Webhook URL: $webhook_url_set"
    else
        print_warning "Webhook 验证异常"
        print_info "预期: $webhook_url"
        print_info "实际: $webhook_url_set"
    fi
    
    echo
    read -p "按回车键继续..."
}

# 查看 ngrok 管理界面
open_ngrok_dashboard() {
    print_title "ngrok 管理界面"
    
    if ! curl -s $NGROK_API_URL > /dev/null 2>&1; then
        print_error "ngrok 未运行"
        echo
        read -p "按回车键继续..."
        return 1
    fi
    
    print_info "ngrok 管理界面: http://localhost:4040"
    print_info "在此界面可以查看:"
    echo "  • 实时请求日志"
    echo "  • 隧道状态"
    echo "  • 流量统计"
    echo "  • 请求重放"
    
    echo
    print_info "是否要在浏览器中打开? (需要 open 命令)"
    read -p "打开管理界面? (y/n): " open_choice
    if [ "$open_choice" = "y" ] || [ "$open_choice" = "Y" ]; then
        if command -v open &> /dev/null; then
            open "http://localhost:4040"
            print_success "已在浏览器中打开"
        else
            print_warning "open 命令未找到，请手动在浏览器中访问 http://localhost:4040"
        fi
    fi
    
    echo
    read -p "按回车键继续..."
}

# 故障排除
troubleshoot() {
    print_title "故障排除"
    
    print_info "常见问题诊断..."
    echo
    
    # 1. 检查代理设置
    print_colored $CYAN "1. 检查代理设置"
    check_proxy
    
    # 2. 检查 ngrok 进程
    print_colored $CYAN "2. 检查 ngrok 进程"
    local ngrok_pids=$(pgrep ngrok)
    if [ ! -z "$ngrok_pids" ]; then
        print_success "ngrok 进程运行中 (PID: $ngrok_pids)"
    else
        print_warning "没有运行中的 ngrok 进程"
    fi
    echo
    
    # 3. 检查端口
    print_colored $CYAN "3. 检查端口占用"
    check_port $DEFAULT_PORT "应用服务"
    check_port 4040 "ngrok 管理"
    echo
    
    # 4. 检查 ngrok 配置
    print_colored $CYAN "4. 检查 ngrok 配置"
    if ngrok version > /dev/null 2>&1; then
        local ngrok_version=$(ngrok version)
        print_success "ngrok 版本: $ngrok_version"
    else
        print_error "ngrok 命令不可用"
    fi
    echo
    
    # 5. 测试网络连接
    print_colored $CYAN "5. 测试网络连接"
    if ping -c 1 google.com > /dev/null 2>&1; then
        print_success "网络连接正常"
    else
        print_warning "网络连接可能有问题"
    fi
    echo
    
    print_info "如果问题仍然存在，请检查:"
    echo "  • 本地服务是否正常启动"
    echo "  • 防火墙设置"
    echo "  • ngrok 账户状态和 authtoken"
    echo "  • 网络代理设置"
    
    echo
    read -p "按回车键继续..."
}

# 显示主菜单
show_menu() {
    clear
    print_colored $PURPLE "╔══════════════════════════════════════════════════════╗"
    print_colored $PURPLE "║              TRON Energy Rental                      ║"
    print_colored $PURPLE "║              ngrok 管理工具                          ║"
    print_colored $PURPLE "╚══════════════════════════════════════════════════════╝"
    echo
    
    print_colored $WHITE "请选择操作:"
    echo
    print_colored $GREEN "  1) 检查环境状态"
    print_colored $GREEN "  2) 检查代理设置"
    print_colored $GREEN "  3) 启动 ngrok"
    print_colored $GREEN "  4) 停止 ngrok"
    print_colored $YELLOW "  5) 重启 ngrok"
    print_colored $GREEN "  6) 查看 ngrok 状态"
    print_colored $GREEN "  7) 测试连接"
    print_colored $GREEN "  8) 获取 ngrok URL"
    print_colored $GREEN "  9) 设置 Telegram Webhook"
    print_colored $GREEN " 10) 打开 ngrok 管理界面"
    print_colored $GREEN " 11) 故障排除"
    print_colored $RED   " 12) 退出"
    echo
}

# 主循环
main() {
    while true; do
        show_menu
        read -p "请输入选项 (1-12): " choice
        
        case $choice in
            1)
                check_environment
                ;;
            2)
                check_proxy
                ;;
            3)
                start_ngrok
                ;;
            4)
                stop_ngrok
                ;;
            5)
                restart_ngrok
                ;;
            6)
                show_ngrok_status
                echo
                read -p "按回车键继续..."
                ;;
            7)
                test_connections
                ;;
            8)
                get_ngrok_url
                ;;
            9)
                setup_telegram_webhook
                ;;
            10)
                open_ngrok_dashboard
                ;;
            11)
                troubleshoot
                ;;
            12)
                print_colored $CYAN "感谢使用 ngrok 管理工具！"
                exit 0
                ;;
            *)
                print_error "无效选项，请输入 1-12"
                sleep 2
                ;;
        esac
    done
}

# 启动脚本
main "$@"
