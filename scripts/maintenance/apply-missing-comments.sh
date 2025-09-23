#!/bin/bash

# 应用缺失的中文注释迁移脚本
# 为所有数据库表字段补充完整的中文注释

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

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."
    
    if ! psql -h localhost -U postgres -d tron_energy_rental -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "无法连接到数据库，请检查数据库服务是否运行"
        exit 1
    fi
    
    log_success "数据库连接正常"
}

# 应用迁移文件
apply_migration() {
    local migration_file="migrations/008_supplement_missing_chinese_comments.sql"
    
    if [ ! -f "$migration_file" ]; then
        log_error "迁移文件不存在: $migration_file"
        exit 1
    fi
    
    log_info "应用迁移文件: $migration_file"
    
    # 备份当前数据库
    log_info "创建数据库备份..."
    local backup_file="backups/db_backup_before_comments_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups
    pg_dump -h localhost -U db_tron_admin -d tron_energy > "$backup_file"
    log_success "数据库备份已创建: $backup_file"
    
    # 应用迁移
    log_info "执行迁移脚本..."
    if psql -h localhost -U db_tron_admin -d tron_energy -f "$migration_file"; then
        log_success "迁移文件应用成功"
    else
        log_error "迁移文件应用失败"
        log_warning "正在恢复数据库备份..."
        psql -h localhost -U db_tron_admin -d tron_energy < "$backup_file"
        log_error "数据库已恢复到备份状态"
        exit 1
    fi
}

# 验证注释是否添加成功
verify_comments() {
    log_info "验证中文注释是否添加成功..."
    
    # 检查主要表的注释
    local tables=("agents" "agent_pricing" "admin_roles" "admins" "admin_permissions" "audit_logs" "energy_consumption_logs" "system_pricing_config" "agent_bot_assignments" "pricing_modes" "pricing_strategies" "pricing_templates" "bot_pricing_configs" "pricing_history" "user_level_changes" "telegram_bots")
    
    for table in "${tables[@]}"; do
        log_info "检查表 $table 的注释..."
        
        # 检查表注释
        local table_comment=$(psql -h localhost -U postgres -d tron_energy_rental -t -c "SELECT obj_description('$table'::regclass);" 2>/dev/null | xargs)
        
        if [ -n "$table_comment" ]; then
            log_success "表 $table 注释: $table_comment"
        else
            log_warning "表 $table 缺少表级注释"
        fi
        
        # 检查字段注释数量
        local column_count=$(psql -h localhost -U postgres -d tron_energy_rental -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '$table' AND table_schema = 'public';" | xargs)
        local comment_count=$(psql -h localhost -U postgres -d tron_energy_rental -t -c "SELECT COUNT(*) FROM information_schema.columns c JOIN pg_catalog.pg_statio_all_tables st ON c.table_name = st.relname WHERE c.table_name = '$table' AND c.table_schema = 'public' AND c.column_name IS NOT NULL;" | xargs)
        
        log_info "表 $table: $column_count 个字段，$comment_count 个有注释"
    done
}

# 显示统计信息
show_statistics() {
    log_info "显示数据库注释统计信息..."
    
    psql -h localhost -U postgres -d tron_energy_rental -c "
    SELECT 
        '数据库表字段中文注释统计' AS summary,
        COUNT(DISTINCT table_name) AS total_tables,
        COUNT(*) AS total_columns_with_comments
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name
    WHERE c.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.column_name NOT LIKE '%_id' 
        AND c.column_name NOT IN ('id', 'created_at', 'updated_at')
        AND c.column_comment IS NOT NULL;
    "
}

# 主函数
main() {
    log_info "开始应用缺失的中文注释迁移..."
    
    # 检查数据库连接
    check_database_connection
    
    # 应用迁移
    apply_migration
    
    # 验证注释
    verify_comments
    
    # 显示统计信息
    show_statistics
    
    log_success "中文注释补充完成！"
}

# 脚本入口
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h    显示帮助信息"
    echo ""
    echo "功能:"
    echo "  为所有缺失中文注释的数据库表字段添加完整的中文注释"
    echo ""
    echo "注意事项:"
    echo "  - 执行前会自动创建数据库备份"
    echo "  - 需要PostgreSQL数据库服务运行"
    echo "  - 需要postgres用户权限"
    exit 0
fi

# 执行主函数
main "$@"
