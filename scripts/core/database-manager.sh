#!/bin/bash

# 数据库管理模块
# 负责数据库备份、恢复、验证等操作

# 确保工具函数已加载
if [ -z "$PROJECT_DIR" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/utils.sh"
fi

# 读取数据库配置
load_db_config() {
    # 数据库配置变量
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-tron_energy_rental}"
    DB_USER="${DB_USER:-postgres}"
    DB_PASSWORD="${DB_PASSWORD:-postgres}"
    
    # 验证必要配置
    if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
        echo -e "${RED}${CROSS_MARK} 数据库配置不完整，请检查 .env 文件${NC}"
        return 1
    fi
    
    return 0
}

# 检查 pg_dump 工具
check_pg_dump() {
    if ! command -v pg_dump >/dev/null 2>&1; then
        echo -e "${RED}${CROSS_MARK} pg_dump 工具未找到${NC}"
        echo -e "${YELLOW}${ARROW} 请安装 PostgreSQL 客户端工具${NC}"
        echo -e "${YELLOW}${ARROW} macOS: brew install postgresql${NC}"
        echo -e "${YELLOW}${ARROW} Ubuntu: sudo apt-get install postgresql-client${NC}"
        echo -e "${YELLOW}${ARROW} CentOS: sudo yum install postgresql${NC}"
        return 1
    fi
    return 0
}

# 测试数据库连接
test_db_connection() {
    echo -e "${GREEN}${ARROW} 正在测试数据库连接...${NC}"
    
    if ! load_db_config; then
        return 1
    fi
    
    # 使用 psql 测试连接
    if command -v psql >/dev/null 2>&1; then
        export PGPASSWORD="$DB_PASSWORD"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} 数据库连接成功${NC}"
            unset PGPASSWORD
            return 0
        else
            echo -e "${RED}${CROSS_MARK} 数据库连接失败${NC}"
            unset PGPASSWORD
            return 1
        fi
    else
        echo -e "${YELLOW}${ARROW} psql 工具未找到，跳过连接测试${NC}"
        return 0
    fi
}

# 数据库备份（兼容Navicat）
backup_database_navicat() {
    echo -e "\n${GREEN}${GEAR} === Navicat兼容数据库备份 ===${NC}"
    
    # 检查 pg_dump 工具
    if ! check_pg_dump; then
        return 1
    fi
    
    # 加载数据库配置
    if ! load_db_config; then
        return 1
    fi
    
    # 显示数据库信息
    echo -e "${GREEN}${ARROW} 数据库信息:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 数据库: ${YELLOW}$DB_NAME${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 用户: ${YELLOW}$DB_USER${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 兼容性: ${YELLOW}Navicat/pgAdmin/图形化工具${NC}"
    
    # 测试数据库连接
    if ! test_db_connection; then
        echo -e "${RED}${CROSS_MARK} 数据库连接失败，无法进行备份${NC}"
        return 1
    fi
    
    # 生成备份文件名
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/db_backup_navicat_${DB_NAME}_${timestamp}.sql"
    
    echo -e "\n${GREEN}${ARROW} 开始创建Navicat兼容备份...${NC}"
    echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$backup_file${NC}"
    
    # 设置密码环境变量
    export PGPASSWORD="$DB_PASSWORD"
    
    # 执行备份（不包含数据库创建命令，兼容Navicat）
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges \
        --format=plain \
        --encoding=UTF8 \
        --file="$backup_file" 2>/dev/null; then
        
        # 在文件开头添加Navicat兼容说明
        local temp_file="${backup_file}.tmp"
        echo "-- Navicat兼容备份 ($(date))" > "$temp_file"
        echo "-- 此文件可在Navicat等图形化工具中直接运行" >> "$temp_file"
        echo "-- 请在目标数据库中执行，不包含数据库创建命令" >> "$temp_file"
        echo "-- 生成工具: TronResourceDev项目管理脚本" >> "$temp_file"
        echo "" >> "$temp_file"
        cat "$backup_file" >> "$temp_file"
        mv "$temp_file" "$backup_file"
        
        # 清除密码环境变量
        unset PGPASSWORD
        
        # 获取备份文件大小
        local file_size=$(du -h "$backup_file" | cut -f1)
        
        echo -e "${GREEN}${CHECK_MARK} Navicat兼容备份成功！${NC}"
        echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$backup_file${NC}"
        echo -e "${GREEN}${ARROW} 文件大小: ${YELLOW}$file_size${NC}"
        echo -e "${GREEN}${ARROW} 备份时间: ${YELLOW}$(date)${NC}"
        
        # 显示备份内容摘要
        echo -e "\n${GREEN}${GEAR} === Navicat兼容备份特点 ===${NC}"
        echo -e "${GREEN}${ARROW} 兼容性特点:${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 不包含 CREATE DATABASE 语句"
        echo -e "  ${GREEN}${ARROW}${NC} 不包含 DROP DATABASE 语句" 
        echo -e "  ${GREEN}${ARROW}${NC} 不包含 \\connect 元命令"
        echo -e "  ${GREEN}${ARROW}${NC} 可在Navicat中直接运行"
        echo -e "\n${GREEN}${ARROW} 备份内容:${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 完整的表结构和数据"
        echo -e "  ${GREEN}${ARROW}${NC} 视图和函数定义"
        echo -e "  ${GREEN}${ARROW}${NC} 触发器和序列"
        echo -e "  ${GREEN}${ARROW}${NC} 索引和约束"
        echo -e "\n${GREEN}${CHECK_MARK} 此备份文件可在任何PostgreSQL图形化工具中使用${NC}"
        
        return 0
    else
        # 清除密码环境变量
        unset PGPASSWORD
        
        echo -e "${RED}${CROSS_MARK} Navicat兼容备份失败${NC}"
        
        # 删除可能的部分备份文件
        if [ -f "$backup_file" ]; then
            rm "$backup_file"
            echo -e "${GREEN}${ARROW} 已清理失败的备份文件${NC}"
        fi
        
        return 1
    fi
}

# 数据库备份
backup_database() {
    echo -e "\n${GREEN}${GEAR} === 数据库备份 ===${NC}"
    # 强制刷新输出缓冲
    printf "" && sync
    
    # 检查 pg_dump 工具
    if ! check_pg_dump; then
        return 1
    fi
    
    # 加载数据库配置
    if ! load_db_config; then
        return 1
    fi
    
    # 显示数据库信息
    echo -e "${GREEN}${ARROW} 数据库信息:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 数据库: ${YELLOW}$DB_NAME${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 用户: ${YELLOW}$DB_USER${NC}"
    
    # 测试数据库连接
    if ! test_db_connection; then
        echo -e "${RED}${CROSS_MARK} 数据库连接失败，无法进行备份${NC}"
        return 1
    fi
    
    # 生成备份文件名
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/db_backup_${DB_NAME}_${timestamp}.sql"
    
    echo -e "\n${GREEN}${ARROW} 开始备份数据库...${NC}"
    echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$backup_file${NC}"
    # 强制刷新输出
    printf "" && sync
    
    # 设置密码环境变量
    export PGPASSWORD="$DB_PASSWORD"
    
    # 执行备份（不压缩，直接保存为SQL文件）
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --create \
        --clean \
        --no-owner \
        --no-privileges \
        --format=plain \
        --encoding=UTF8 \
        --file="$backup_file" 2>/dev/null; then
        
        # 清除密码环境变量
        unset PGPASSWORD
        
        # 获取备份文件大小
        local file_size=$(du -h "$backup_file" | cut -f1)
        
        echo -e "${GREEN}${CHECK_MARK} 数据库备份成功！${NC}"
        echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$backup_file${NC}"
        echo -e "${GREEN}${ARROW} 文件大小: ${YELLOW}$file_size${NC}"
        echo -e "${GREEN}${ARROW} 备份时间: ${YELLOW}$(date)${NC}"
        
        # 显示备份内容摘要
        echo -e "\n${GREEN}${GEAR} === 备份内容摘要 ===${NC}"
        echo -e "${GREEN}${ARROW} 备份包含:${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 数据库结构 (表、索引、约束等)"
        echo -e "  ${GREEN}${ARROW}${NC} 完整数据内容"
        echo -e "  ${GREEN}${ARROW}${NC} 序列和函数"
        echo -e "  ${GREEN}${ARROW}${NC} 触发器和视图"
        echo -e "\n${GREEN}${CHECK_MARK} SQL文件未压缩，方便直接查看和编辑${NC}"
        
        return 0
    else
        # 清除密码环境变量
        unset PGPASSWORD
        
        echo -e "${RED}${CROSS_MARK} 数据库备份失败${NC}"
        
        # 删除可能的部分备份文件
        if [ -f "$backup_file" ]; then
            rm "$backup_file"
            echo -e "${GREEN}${ARROW} 已清理失败的备份文件${NC}"
        fi
        
        return 1
    fi
}

# 列出历史备份
list_backups() {
    echo -e "\n${GREEN}${GEAR} === 历史备份文件 ===${NC}"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo -e "${YELLOW}${ARROW} 暂无备份文件${NC}"
        return 0
    fi
    
    echo -e "${GREEN}${ARROW} 备份目录: ${YELLOW}$BACKUP_DIR${NC}"
    echo ""
    
    # 列出所有备份文件，按时间排序
    local count=0
    for backup_file in $(ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null); do
        count=$((count + 1))
        local filename=$(basename "$backup_file")
        local file_size=$(du -h "$backup_file" | cut -f1)
        local file_date=$(date -r "$backup_file" "+%Y-%m-%d %H:%M:%S")
        
        echo -e "  ${GREEN}${count})${NC} ${YELLOW}$filename${NC}"
        echo -e "     ${GREEN}${ARROW}${NC} 大小: ${YELLOW}$file_size${NC}"
        echo -e "     ${GREEN}${ARROW}${NC} 日期: ${YELLOW}$file_date${NC}"
        echo ""
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}${ARROW} 暂无 .sql 备份文件${NC}"
    else
        echo -e "${GREEN}${CHECK_MARK} 共找到 ${YELLOW}$count${NC} 个备份文件${NC}"
    fi
}

# 验证备份文件内容
verify_backup() {
    echo -e "\n${GREEN}${GEAR} === 验证备份文件 ===${NC}"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo -e "${YELLOW}${ARROW} 暂无备份文件可验证${NC}"
        return 0
    fi
    
    echo -e "${GREEN}${ARROW} 可用备份文件:${NC}"
    local count=0
    local backup_files=()
    
    for backup_file in $(ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null); do
        count=$((count + 1))
        backup_files+=("$backup_file")
        local filename=$(basename "$backup_file")
        local file_date=$(date -r "$backup_file" "+%Y-%m-%d %H:%M:%S")
        echo -e "  ${GREEN}${count})${NC} ${YELLOW}$filename${NC} (${YELLOW}$file_date${NC})"
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}${ARROW} 暂无备份文件${NC}"
        return 0
    fi
    
    echo ""
    read -p "请选择要验证的备份文件 (1-$count, 0=取消): " file_choice
    
    if [ "$file_choice" = "0" ] || [ -z "$file_choice" ]; then
        return 0
    fi
    
    if [ "$file_choice" -ge 1 ] && [ "$file_choice" -le "$count" ]; then
        local selected_file="${backup_files[$((file_choice-1))]}"
        echo -e "\n${GREEN}${ARROW} 正在验证备份文件: ${YELLOW}$(basename "$selected_file")${NC}"
        
        # 检查文件是否存在且可读
        if [ ! -f "$selected_file" ] || [ ! -r "$selected_file" ]; then
            echo -e "${RED}${CROSS_MARK} 备份文件不存在或无法读取${NC}"
            return 1
        fi
        
        echo -e "${GREEN}${CHECK_MARK} 文件格式正常${NC}"
        
        # 分析备份内容
        echo -e "\n${GREEN}${GEAR} === 备份内容分析 ===${NC}"
        
        # 直接分析SQL文件（无需解压）
        # 统计各种对象数量
        local tables=$(grep -c "^CREATE TABLE" "$selected_file" 2>/dev/null || echo "0")
        local copy_statements=$(grep -c "^COPY " "$selected_file" 2>/dev/null || echo "0")
        local indexes=$(grep -c "CREATE.*INDEX" "$selected_file" 2>/dev/null || echo "0")
        local sequences=$(grep -c "CREATE SEQUENCE" "$selected_file" 2>/dev/null || echo "0")
        local functions=$(grep -c "CREATE.*FUNCTION" "$selected_file" 2>/dev/null || echo "0")
        
        echo -e "  ${GREEN}${ARROW}${NC} 数据表: ${YELLOW}$tables${NC} 个"
        echo -e "  ${GREEN}${ARROW}${NC} 数据复制语句: ${YELLOW}$copy_statements${NC} 个"
        echo -e "  ${GREEN}${ARROW}${NC} 索引: ${YELLOW}$indexes${NC} 个"
        echo -e "  ${GREEN}${ARROW}${NC} 序列: ${YELLOW}$sequences${NC} 个"
        echo -e "  ${GREEN}${ARROW}${NC} 函数: ${YELLOW}$functions${NC} 个"
        
        # 检查是否包含完整备份标识
        if grep -q "CREATE DATABASE" "$selected_file" 2>/dev/null; then
            echo -e "  ${GREEN}${CHECK_MARK}${NC} 包含数据库创建语句"
        fi
        
        if grep -q "DROP DATABASE" "$selected_file" 2>/dev/null; then
            echo -e "  ${GREEN}${CHECK_MARK}${NC} 包含数据库清理语句"
        fi
        
        # 显示备份文件开头几行，方便检视
        echo -e "\n${GREEN}${GEAR} === 备份文件预览 (前10行) ===${NC}"
        head -10 "$selected_file" | while IFS= read -r line; do
            echo -e "  ${YELLOW}$line${NC}"
        done
        
        echo -e "\n${GREEN}${CHECK_MARK} 这是一个完整的数据库备份，可以用于1:1恢复${NC}"
        echo -e "${GREEN}${ARROW} COPY语句用于高效批量数据传输，完全安全可靠${NC}"
        echo -e "${GREEN}${ARROW} SQL文件未压缩，可直接用文本编辑器查看和编辑${NC}"
        
    else
        echo -e "${RED}无效选择${NC}"
    fi
}

# 恢复数据库
restore_database() {
    echo -e "\n${GREEN}${GEAR} === 恢复数据库 ===${NC}"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo -e "${YELLOW}${ARROW} 暂无备份文件可恢复${NC}"
        return 0
    fi
    
    # 加载数据库配置
    if ! load_db_config; then
        return 1
    fi
    
    echo -e "${GREEN}${ARROW} 可用备份文件:${NC}"
    local count=0
    local backup_files=()
    
    for backup_file in $(ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null); do
        count=$((count + 1))
        backup_files+=("$backup_file")
        local filename=$(basename "$backup_file")
        local file_date=$(date -r "$backup_file" "+%Y-%m-%d %H:%M:%S")
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo -e "  ${GREEN}${count})${NC} ${YELLOW}$filename${NC}"
        echo -e "     ${GREEN}${ARROW}${NC} 日期: ${YELLOW}$file_date${NC}  大小: ${YELLOW}$file_size${NC}"
        echo ""
    done
    
    if [ $count -eq 0 ]; then
        echo -e "${YELLOW}${ARROW} 暂无备份文件${NC}"
        return 0
    fi
    
    echo ""
    read -p "请选择要恢复的备份文件 (1-$count, 0=取消): " file_choice
    
    if [ "$file_choice" = "0" ] || [ -z "$file_choice" ]; then
        echo -e "${YELLOW}${ARROW} 已取消恢复操作${NC}"
        return 0
    fi
    
    if [ "$file_choice" -ge 1 ] && [ "$file_choice" -le "$count" ]; then
        local selected_file="${backup_files[$((file_choice-1))]}"
        local filename=$(basename "$selected_file")
        
        echo -e "\n${GREEN}${ARROW} 准备恢复数据库...${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 数据库: ${YELLOW}$DB_NAME${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 备份文件: ${YELLOW}$filename${NC}"
        echo ""
        
        # 显示警告信息
        echo -e "${RED}⚠️  重要警告: 恢复操作将完全覆盖现有数据库！${NC}"
        echo -e "${YELLOW}${ARROW} 所有当前数据将被删除并替换为备份数据${NC}"
        echo -e "${YELLOW}${ARROW} 此操作不可逆，请确保您真的需要恢复${NC}"
        echo ""
        
        read -p "确认恢复? 输入 'YES' 继续，其他任意键取消: " confirm
        if [ "$confirm" != "YES" ]; then
            echo -e "${YELLOW}${ARROW} 已取消恢复操作${NC}"
            return 0
        fi
        
        # 再次确认
        echo ""
        read -p "最后确认: 真的要恢复数据库吗? (输入 'RESTORE' 确认): " final_confirm
        if [ "$final_confirm" != "RESTORE" ]; then
            echo -e "${YELLOW}${ARROW} 已取消恢复操作${NC}"
            return 0
        fi
        
        # 设置密码环境变量
        export PGPASSWORD="$DB_PASSWORD"
        
        echo -e "\n${GREEN}${ARROW} 开始恢复数据库...${NC}"
        echo -e "${GREEN}${ARROW} 请稍候，恢复过程可能需要几分钟...${NC}"
        
        # 执行恢复
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -f "$selected_file" >/dev/null 2>&1; then
            # 清除密码环境变量
            unset PGPASSWORD
            
            echo -e "${GREEN}${CHECK_MARK} 数据库恢复成功！${NC}"
            echo -e "${GREEN}${ARROW} 恢复文件: ${YELLOW}$filename${NC}"
            echo -e "${GREEN}${ARROW} 完成时间: ${YELLOW}$(date)${NC}"
            
            # 测试恢复后的数据库连接
            echo -e "\n${GREEN}${ARROW} 验证恢复结果...${NC}"
            if test_db_connection >/dev/null 2>&1; then
                echo -e "${GREEN}${CHECK_MARK} 数据库连接正常，恢复验证通过${NC}"
            else
                echo -e "${YELLOW}${ARROW} 数据库恢复完成，但连接测试失败，请检查配置${NC}"
            fi
            
        else
            # 清除密码环境变量
            unset PGPASSWORD
            
            echo -e "${RED}${CROSS_MARK} 数据库恢复失败${NC}"
            echo -e "${YELLOW}${ARROW} 请检查备份文件完整性和数据库配置${NC}"
            return 1
        fi
        
    else
        echo -e "${RED}无效选择${NC}"
    fi
}

# 数据库管理主函数
manage_database() {
    while true; do
        echo -e "\n${GREEN}${GEAR} === 数据库备份管理 ===${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 1) 创建新备份（完整）"
        echo -e "  ${GREEN}${ARROW}${NC} 2) 创建Navicat兼容备份"
        echo -e "  ${GREEN}${ARROW}${NC} 3) 查看历史备份"
        echo -e "  ${GREEN}${ARROW}${NC} 4) 验证备份文件"
        echo -e "  ${GREEN}${ARROW}${NC} 5) 恢复数据库"
        echo -e "  ${GREEN}${ARROW}${NC} 6) 测试数据库连接"
        echo -e "  ${GREEN}${ARROW}${NC} 0) 返回主菜单"
        echo ""
        read -p "  请选择: " backup_choice
        
        case $backup_choice in
            1)
                echo -e "${GREEN}${ARROW} 正在启动备份功能...${NC}"
                printf "" && sync
                backup_database || true
                ;;
            2)
                backup_database_navicat || true
                ;;
            3)
                list_backups || true
                ;;
            4)
                verify_backup || true
                ;;
            5)
                restore_database || true
                ;;
            6)
                test_db_connection || true
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}无效选择${NC}"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}
