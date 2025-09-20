#!/bin/bash

# =================================================================================================
# TRON能量租赁系统 - 健康检查脚本
# =================================================================================================

# 配置
API_URL="http://127.0.0.1:3001"
LOG_FILE="/www/wwwroot/tron-energy-rental/logs/health-check.log"
MAX_LOG_SIZE=10485760  # 10MB

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log_with_timestamp() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# 控制台输出函数
console_log() {
    local level=$1
    local message=$2
    local color=$3
    
    if [ "$QUIET" != "true" ]; then
        echo -e "${color}[$level]${NC} $message"
    fi
    
    log_with_timestamp "$level" "$message"
}

# 检查日志文件大小并轮转
rotate_log_if_needed() {
    if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt $MAX_LOG_SIZE ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        console_log "INFO" "日志文件已轮转" "$BLUE"
    fi
}

# 检查PM2进程状态
check_pm2_status() {
    console_log "INFO" "检查PM2进程状态..." "$BLUE"
    
    if ! command -v pm2 &> /dev/null; then
        console_log "ERROR" "PM2未安装" "$RED"
        return 1
    fi
    
    local pm2_status=$(pm2 jlist 2>/dev/null)
    if [ $? -ne 0 ]; then
        console_log "ERROR" "PM2状态获取失败" "$RED"
        return 1
    fi
    
    # 检查应用是否在线
    local online_count=$(echo "$pm2_status" | jq '[.[] | select(.pm2_env.status == "online")] | length' 2>/dev/null || echo 0)
    local total_count=$(echo "$pm2_status" | jq 'length' 2>/dev/null || echo 0)
    
    if [ "$online_count" -eq 0 ]; then
        console_log "ERROR" "没有PM2进程在线" "$RED"
        return 1
    elif [ "$online_count" -lt "$total_count" ]; then
        console_log "WARNING" "部分PM2进程离线 ($online_count/$total_count)" "$YELLOW"
        return 2
    else
        console_log "SUCCESS" "所有PM2进程正常运行 ($online_count/$total_count)" "$GREEN"
        return 0
    fi
}

# 检查API健康状态
check_api_health() {
    console_log "INFO" "检查API健康状态..." "$BLUE"
    
    local health_url="${API_URL}/api/health"
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$health_url" --max-time 10 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        console_log "SUCCESS" "API健康检查通过" "$GREEN"
        return 0
    elif [ "$response" = "000" ]; then
        console_log "ERROR" "API无响应或连接超时" "$RED"
        return 1
    else
        console_log "ERROR" "API健康检查失败，HTTP状态码: $response" "$RED"
        return 1
    fi
}

# 检查数据库连接
check_database() {
    console_log "INFO" "检查数据库连接..." "$BLUE"
    
    # 读取环境变量
    if [ -f "/www/wwwroot/tron-energy-rental/.env.production" ]; then
        source /www/wwwroot/tron-energy-rental/.env.production
    fi
    
    # 检查PostgreSQL连接
    if command -v psql &> /dev/null; then
        local db_check=$(psql "${DATABASE_URL:-postgresql://tron_user:password@localhost:5432/tron_energy_rental}" -c "SELECT 1;" 2>/dev/null)
        if [ $? -eq 0 ]; then
            console_log "SUCCESS" "数据库连接正常" "$GREEN"
            return 0
        else
            console_log "ERROR" "数据库连接失败" "$RED"
            return 1
        fi
    else
        console_log "WARNING" "psql命令未找到，跳过数据库检查" "$YELLOW"
        return 2
    fi
}

# 检查Redis连接
check_redis() {
    console_log "INFO" "检查Redis连接..." "$BLUE"
    
    if command -v redis-cli &> /dev/null; then
        local redis_response=$(redis-cli ping 2>/dev/null)
        if [ "$redis_response" = "PONG" ]; then
            console_log "SUCCESS" "Redis连接正常" "$GREEN"
            return 0
        else
            console_log "ERROR" "Redis连接失败" "$RED"
            return 1
        fi
    else
        console_log "WARNING" "redis-cli命令未找到，跳过Redis检查" "$YELLOW"
        return 2
    fi
}

# 检查磁盘空间
check_disk_space() {
    console_log "INFO" "检查磁盘空间..." "$BLUE"
    
    local disk_usage=$(df /www/wwwroot/tron-energy-rental | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 90 ]; then
        console_log "ERROR" "磁盘空间不足: ${disk_usage}%" "$RED"
        return 1
    elif [ "$disk_usage" -gt 80 ]; then
        console_log "WARNING" "磁盘空间紧张: ${disk_usage}%" "$YELLOW"
        return 2
    else
        console_log "SUCCESS" "磁盘空间充足: ${disk_usage}%" "$GREEN"
        return 0
    fi
}

# 检查内存使用
check_memory() {
    console_log "INFO" "检查内存使用..." "$BLUE"
    
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -gt 90 ]; then
        console_log "ERROR" "内存使用过高: ${memory_usage}%" "$RED"
        return 1
    elif [ "$memory_usage" -gt 80 ]; then
        console_log "WARNING" "内存使用较高: ${memory_usage}%" "$YELLOW"
        return 2
    else
        console_log "SUCCESS" "内存使用正常: ${memory_usage}%" "$GREEN"
        return 0
    fi
}

# 检查CPU负载
check_cpu_load() {
    console_log "INFO" "检查CPU负载..." "$BLUE"
    
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "$cpu_load $cpu_cores" | awk '{printf "%.0f", ($1/$2)*100}')
    
    if [ "$load_percentage" -gt 90 ]; then
        console_log "ERROR" "CPU负载过高: ${load_percentage}%" "$RED"
        return 1
    elif [ "$load_percentage" -gt 70 ]; then
        console_log "WARNING" "CPU负载较高: ${load_percentage}%" "$YELLOW"
        return 2
    else
        console_log "SUCCESS" "CPU负载正常: ${load_percentage}%" "$GREEN"
        return 0
    fi
}

# 自动修复函数
auto_repair() {
    console_log "INFO" "尝试自动修复..." "$BLUE"
    
    # 重启PM2进程
    if command -v pm2 &> /dev/null; then
        console_log "INFO" "重启PM2进程..." "$BLUE"
        cd /www/wwwroot/tron-energy-rental
        pm2 restart ecosystem.config.js 2>/dev/null || pm2 start ecosystem.config.js --env production
        sleep 5
        console_log "INFO" "PM2进程重启完成" "$BLUE"
    fi
    
    # 清理日志文件
    console_log "INFO" "清理过期日志..." "$BLUE"
    find /www/wwwroot/tron-energy-rental/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    console_log "INFO" "日志清理完成" "$BLUE"
}

# 发送通知（如果配置了Telegram机器人）
send_notification() {
    local level=$1
    local message=$2
    
    # 这里可以添加Telegram、邮件或其他通知方式
    # 示例：发送到webhook
    # curl -s -X POST "YOUR_WEBHOOK_URL" -d "level=$level&message=$message" >/dev/null 2>&1 || true
    
    console_log "INFO" "通知已发送: [$level] $message" "$BLUE"
}

# 生成状态报告
generate_status_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > /tmp/health_report.json << EOF
{
    "timestamp": "$timestamp",
    "checks": {
        "pm2": $pm2_status,
        "api": $api_status,
        "database": $db_status,
        "redis": $redis_status,
        "disk": $disk_status,
        "memory": $memory_status,
        "cpu": $cpu_status
    },
    "overall_status": "$overall_status"
}
EOF
    
    if [ "$SAVE_REPORT" = "true" ]; then
        cp /tmp/health_report.json "/www/wwwroot/tron-energy-rental/logs/health_report_$(date +%Y%m%d_%H%M%S).json"
    fi
}

# 主检查函数
main_check() {
    rotate_log_if_needed
    
    console_log "INFO" "开始健康检查..." "$BLUE"
    
    # 执行各项检查
    check_pm2_status
    pm2_status=$?
    
    check_api_health
    api_status=$?
    
    check_database
    db_status=$?
    
    check_redis
    redis_status=$?
    
    check_disk_space
    disk_status=$?
    
    check_memory
    memory_status=$?
    
    check_cpu_load
    cpu_status=$?
    
    # 计算总体状态
    local error_count=0
    local warning_count=0
    
    for status in $pm2_status $api_status $db_status $redis_status $disk_status $memory_status $cpu_status; do
        if [ $status -eq 1 ]; then
            ((error_count++))
        elif [ $status -eq 2 ]; then
            ((warning_count++))
        fi
    done
    
    # 确定整体状态
    if [ $error_count -gt 0 ]; then
        overall_status="ERROR"
        console_log "ERROR" "健康检查发现 $error_count 个错误和 $warning_count 个警告" "$RED"
        
        if [ "$AUTO_REPAIR" = "true" ]; then
            auto_repair
            send_notification "ERROR" "系统出现问题，已尝试自动修复"
        else
            send_notification "ERROR" "系统出现 $error_count 个错误"
        fi
        
        exit 1
    elif [ $warning_count -gt 0 ]; then
        overall_status="WARNING"
        console_log "WARNING" "健康检查发现 $warning_count 个警告" "$YELLOW"
        send_notification "WARNING" "系统有 $warning_count 个警告需要关注"
        exit 2
    else
        overall_status="OK"
        console_log "SUCCESS" "所有健康检查通过" "$GREEN"
        exit 0
    fi
}

# 显示帮助
show_help() {
    echo "TRON能量租赁系统 - 健康检查脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -q, --quiet        静默模式，不输出到控制台"
    echo "  -r, --repair       启用自动修复"
    echo "  -s, --save-report  保存详细报告"
    echo "  -h, --help         显示帮助信息"
    echo ""
    echo "退出代码:"
    echo "  0 - 所有检查通过"
    echo "  1 - 发现错误"
    echo "  2 - 发现警告"
    echo ""
    echo "示例:"
    echo "  $0                 # 标准健康检查"
    echo "  $0 -q -r           # 静默模式，启用自动修复"
    echo "  $0 -s              # 保存详细报告"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -q|--quiet)
            QUIET="true"
            shift
            ;;
        -r|--repair)
            AUTO_REPAIR="true"
            shift
            ;;
        -s|--save-report)
            SAVE_REPORT="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行主检查
main_check

# 生成状态报告
generate_status_report
