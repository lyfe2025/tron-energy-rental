#!/bin/bash

# 日志表清理模块
# 负责清理数据库中的各种日志表

# 确保工具函数已加载
if [ -z "$PROJECT_DIR" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/utils.sh"
fi

# 日志表列表
LOG_TABLES=(
    "bot_logs:机器人操作日志"
    "config_change_logs:配置变更日志"
    "login_logs:用户登录日志"
    "operation_logs:系统操作日志"
    "system_monitoring_logs:系统监控日志"
    "task_execution_logs:任务执行日志"
    "telegram_notification_logs:Telegram通知日志"
)

# 读取数据库配置
load_db_config() {
    # 数据库配置变量
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-tron_energy}"
    DB_USER="${DB_USER:-db_tron_admin}"
    DB_PASSWORD="${DB_PASSWORD:-AZDTswBsRbhTpbAm}"
    
    # 验证必要配置
    if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
        echo -e "${RED}${CROSS_MARK} 数据库配置不完整，请检查 .env 文件${NC}"
        return 1
    fi
    
    return 0
}

# 测试数据库连接
test_db_connection() {
    if ! load_db_config; then
        return 1
    fi
    
    # 使用 psql 测试连接
    if command -v psql >/dev/null 2>&1; then
        export PGPASSWORD="$DB_PASSWORD"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            unset PGPASSWORD
            return 0
        else
            unset PGPASSWORD
            return 1
        fi
    else
        echo -e "${YELLOW}${ARROW} psql 工具未找到，跳过连接测试${NC}"
        return 0
    fi
}

# 获取日志表统计信息
get_log_table_stats() {
    if ! load_db_config; then
        return 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    echo -e "\n${GREEN}${GEAR} === 日志表数据统计 ===${NC}"
    echo -e "${GREEN}${ARROW} 数据库: ${YELLOW}$DB_NAME${NC}"
    echo ""
    
    local total_records=0
    local total_size="0 MB"
    
    for table_info in "${LOG_TABLES[@]}"; do
        local table_name="${table_info%%:*}"
        local table_desc="${table_info##*:}"
        
        # 获取记录数量
        local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table_name;" 2>/dev/null | tr -d ' ')
        
        # 获取表大小
        local size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_total_relation_size('$table_name'));" 2>/dev/null | tr -d ' ')
        
        if [ -n "$count" ] && [ "$count" != "" ]; then
            echo -e "  ${GREEN}${ARROW}${NC} ${YELLOW}$table_name${NC} ($table_desc)"
            echo -e "    ${GREEN}├─${NC} 记录数: ${YELLOW}$count${NC}"
            echo -e "    ${GREEN}└─${NC} 大小: ${YELLOW}$size${NC}"
            echo ""
            total_records=$((total_records + count))
        else
            echo -e "  ${YELLOW}${ARROW}${NC} ${YELLOW}$table_name${NC} ($table_desc) - ${RED}无法访问${NC}"
            echo ""
        fi
    done
    
    unset PGPASSWORD
    
    echo -e "${GREEN}${CHECK_MARK} 总记录数: ${YELLOW}$total_records${NC}"
    echo -e "${GREEN}${ARROW} 注意: 这些日志用于审计和故障排查，请谨慎清理${NC}"
}

# 清理单个日志表
clean_single_table() {
    local table_name="$1"
    local table_desc="$2"
    
    if ! load_db_config; then
        return 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    echo -e "${GREEN}${ARROW} 正在清理 ${YELLOW}$table_name${NC} ($table_desc)..."
    
    # 获取清理前的记录数
    local before_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table_name;" 2>/dev/null | tr -d ' ')
    
    # 执行清理
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM $table_name;" >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECK_MARK} $table_name 清理成功，删除了 ${YELLOW}$before_count${NC} 条记录${NC}"
        unset PGPASSWORD
        return 0
    else
        echo -e "${RED}${CROSS_MARK} $table_name 清理失败${NC}"
        unset PGPASSWORD
        return 1
    fi
}

# 清理指定时间范围的日志
clean_logs_by_date() {
    echo -e "\n${GREEN}${GEAR} === 按时间范围清理日志 ===${NC}"
    echo -e "${GREEN}${ARROW} 请选择清理策略:${NC}"
    echo -e "  ${GREEN}1)${NC} 清理7天前的日志"
    echo -e "  ${GREEN}2)${NC} 清理30天前的日志"
    echo -e "  ${GREEN}3)${NC} 清理90天前的日志"
    echo -e "  ${GREEN}4)${NC} 自定义时间范围"
    echo -e "  ${GREEN}0)${NC} 返回"
    echo ""
    
    read -p "请选择 (0-4): " date_choice
    
    local days=""
    case $date_choice in
        1)
            days=7
            ;;
        2)
            days=30
            ;;
        3)
            days=90
            ;;
        4)
            echo ""
            read -p "请输入要保留的天数 (例如: 30): " days
            if ! [[ "$days" =~ ^[0-9]+$ ]] || [ "$days" -lt 1 ]; then
                echo -e "${RED}无效的天数${NC}"
                return 1
            fi
            ;;
        0)
            return 0
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            return 1
            ;;
    esac
    
    echo -e "\n${GREEN}${ARROW} 将清理 ${YELLOW}$days${NC} 天前的日志数据${NC}"
    echo -e "${YELLOW}${ARROW} 这将保留最近 $days 天的日志，删除更早的记录${NC}"
    echo ""
    
    read -p "确认执行? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${YELLOW}${ARROW} 已取消操作${NC}"
        return 0
    fi
    
    if ! load_db_config; then
        return 1
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    
    local total_deleted=0
    
    for table_info in "${LOG_TABLES[@]}"; do
        local table_name="${table_info%%:*}"
        local table_desc="${table_info##*:}"
        
        echo -e "${GREEN}${ARROW} 正在清理 ${YELLOW}$table_name${NC}..."
        
        # 检查表是否有created_at字段
        local has_created_at=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='$table_name' AND column_name='created_at';" 2>/dev/null | tr -d ' ')
        
        if [ "$has_created_at" = "1" ]; then
            # 获取将要删除的记录数
            local delete_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table_name WHERE created_at < NOW() - INTERVAL '$days days';" 2>/dev/null | tr -d ' ')
            
            if [ -n "$delete_count" ] && [ "$delete_count" -gt 0 ]; then
                # 执行删除
                if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM $table_name WHERE created_at < NOW() - INTERVAL '$days days';" >/dev/null 2>&1; then
                    echo -e "${GREEN}${CHECK_MARK} $table_name: 删除了 ${YELLOW}$delete_count${NC} 条记录${NC}"
                    total_deleted=$((total_deleted + delete_count))
                else
                    echo -e "${RED}${CROSS_MARK} $table_name: 清理失败${NC}"
                fi
            else
                echo -e "${YELLOW}${ARROW} $table_name: 没有需要清理的记录${NC}"
            fi
        else
            echo -e "${YELLOW}${ARROW} $table_name: 没有created_at字段，跳过${NC}"
        fi
    done
    
    unset PGPASSWORD
    
    echo -e "\n${GREEN}${CHECK_MARK} 按时间清理完成，总共删除了 ${YELLOW}$total_deleted${NC} 条记录${NC}"
}

# 清理所有日志表
clean_all_log_tables() {
    echo -e "\n${GREEN}${GEAR} === 清理所有日志表 ===${NC}"
    
    # 显示当前统计
    get_log_table_stats
    
    echo -e "\n${RED}⚠️  重要警告: 此操作将清空所有日志表！${NC}"
    echo -e "${YELLOW}${ARROW} 所有日志数据将被永久删除${NC}"
    echo -e "${YELLOW}${ARROW} 此操作不可逆，请确保您真的需要清理${NC}"
    echo -e "${YELLOW}${ARROW} 建议先创建数据库备份${NC}"
    echo ""
    
    read -p "确认清理所有日志表? 输入 'YES' 继续，其他任意键取消: " confirm
    if [ "$confirm" != "YES" ]; then
        echo -e "${YELLOW}${ARROW} 已取消清理操作${NC}"
        return 0
    fi
    
    # 再次确认
    echo ""
    read -p "最后确认: 真的要清空所有日志表吗? (输入 'CLEAR' 确认): " final_confirm
    if [ "$final_confirm" != "CLEAR" ]; then
        echo -e "${YELLOW}${ARROW} 已取消清理操作${NC}"
        return 0
    fi
    
    # 测试数据库连接
    echo -e "\n${GREEN}${ARROW} 正在连接数据库...${NC}"
    if ! test_db_connection; then
        echo -e "${RED}${CROSS_MARK} 数据库连接失败${NC}"
        return 1
    fi
    
    echo -e "${GREEN}${ARROW} 开始清理日志表...${NC}"
    
    local success_count=0
    local total_count=${#LOG_TABLES[@]}
    
    for table_info in "${LOG_TABLES[@]}"; do
        local table_name="${table_info%%:*}"
        local table_desc="${table_info##*:}"
        
        if clean_single_table "$table_name" "$table_desc"; then
            success_count=$((success_count + 1))
        fi
    done
    
    echo -e "\n${GREEN}${CHECK_MARK} 日志表清理完成${NC}"
    echo -e "${GREEN}${ARROW} 成功清理: ${YELLOW}$success_count${NC} / ${YELLOW}$total_count${NC} 个表${NC}"
    
    if [ $success_count -eq $total_count ]; then
        echo -e "${GREEN}${CHECK_MARK} 所有日志表已成功清理${NC}"
    else
        echo -e "${YELLOW}${ARROW} 部分表清理失败，请检查数据库连接和权限${NC}"
    fi
}

# 选择性清理日志表
clean_selective_tables() {
    echo -e "\n${GREEN}${GEAR} === 选择性清理日志表 ===${NC}"
    echo -e "${GREEN}${ARROW} 请选择要清理的日志表:${NC}"
    echo ""
    
    # 显示所有表供选择
    local index=1
    for table_info in "${LOG_TABLES[@]}"; do
        local table_name="${table_info%%:*}"
        local table_desc="${table_info##*:}"
        echo -e "  ${GREEN}$index)${NC} ${YELLOW}$table_name${NC} ($table_desc)"
        index=$((index + 1))
    done
    
    echo -e "  ${GREEN}$index)${NC} 清理所有表"
    echo -e "  ${GREEN}0)${NC} 返回"
    echo ""
    
    read -p "请选择 (0-$index): " table_choice
    
    if [ "$table_choice" = "0" ]; then
        return 0
    elif [ "$table_choice" = "$index" ]; then
        clean_all_log_tables
        return
    elif [ "$table_choice" -ge 1 ] && [ "$table_choice" -lt "$index" ]; then
        local selected_table_info="${LOG_TABLES[$((table_choice-1))]}"
        local table_name="${selected_table_info%%:*}"
        local table_desc="${selected_table_info##*:}"
        
        echo -e "\n${GREEN}${ARROW} 准备清理表: ${YELLOW}$table_name${NC} ($table_desc)"
        
        # 显示该表的统计信息
        if ! load_db_config; then
            return 1
        fi
        
        export PGPASSWORD="$DB_PASSWORD"
        local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table_name;" 2>/dev/null | tr -d ' ')
        unset PGPASSWORD
        
        echo -e "${GREEN}${ARROW} 当前记录数: ${YELLOW}$count${NC}"
        echo ""
        
        read -p "确认清理此表? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            if clean_single_table "$table_name" "$table_desc"; then
                echo -e "${GREEN}${CHECK_MARK} 表 $table_name 清理成功${NC}"
            else
                echo -e "${RED}${CROSS_MARK} 表 $table_name 清理失败${NC}"
            fi
        else
            echo -e "${YELLOW}${ARROW} 已取消清理操作${NC}"
        fi
    else
        echo -e "${RED}无效选择${NC}"
    fi
}

# 日志表清理主函数
manage_log_table_cleanup() {
    while true; do
        echo -e "\n${GREEN}${GEAR} === 数据库日志表清理 ===${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 1) 查看日志表统计"
        echo -e "  ${GREEN}${ARROW}${NC} 2) 选择性清理表"
        echo -e "  ${GREEN}${ARROW}${NC} 3) 按时间范围清理"
        echo -e "  ${GREEN}${ARROW}${NC} 4) 清理所有日志表"
        echo -e "  ${GREEN}${ARROW}${NC} 5) 测试数据库连接"
        echo -e "  ${GREEN}${ARROW}${NC} 0) 返回主菜单"
        echo ""
        read -p "  请选择: " choice
        
        case $choice in
            1)
                get_log_table_stats || true
                ;;
            2)
                clean_selective_tables || true
                ;;
            3)
                clean_logs_by_date || true
                ;;
            4)
                clean_all_log_tables || true
                ;;
            5)
                echo -e "\n${GREEN}${ARROW} 正在测试数据库连接...${NC}"
                if test_db_connection; then
                    echo -e "${GREEN}${CHECK_MARK} 数据库连接正常${NC}"
                else
                    echo -e "${RED}${CROSS_MARK} 数据库连接失败${NC}"
                fi
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}无效选择${NC}"
                ;;
        esac
        
        if [ "$choice" != "0" ]; then
            echo ""
            read -p "按回车键继续..."
        fi
    done
}
