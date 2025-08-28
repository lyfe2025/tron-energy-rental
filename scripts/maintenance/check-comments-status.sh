#!/bin/bash

# 检查数据库注释状态脚本
# 显示所有表的注释覆盖率和详细信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_header() {
    echo -e "${CYAN}$1${NC}"
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

# 显示总体统计信息
show_overall_statistics() {
    log_header "\n=== 数据库注释总体统计 ==="
    
    psql -h localhost -U postgres -d tron_energy_rental -c "
    SELECT 
        '总体统计' AS summary,
        COUNT(DISTINCT t.table_name) AS total_tables,
        COUNT(c.column_name) AS total_columns,
        COUNT(CASE WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN 1 END) AS columns_with_comments,
        ROUND(
            COUNT(CASE WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN 1 END)::numeric / 
            COUNT(c.column_name)::numeric * 100, 2
        ) AS comment_coverage_percent
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public';
    "
}

# 显示每个表的详细注释状态
show_table_details() {
    log_header "\n=== 各表注释详细状态 ==="
    
    psql -h localhost -U postgres -d tron_energy_rental -c "
    SELECT 
        t.table_name AS table_name,
        COUNT(c.column_name) AS total_columns,
        COUNT(CASE WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN 1 END) AS columns_with_comments,
        ROUND(
            COUNT(CASE WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN 1 END)::numeric / 
            COUNT(c.column_name)::numeric * 100, 2
        ) AS comment_coverage_percent,
        CASE 
            WHEN COUNT(CASE WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN 1 END) = COUNT(c.column_name) THEN '${GREEN}完整${NC}'
            WHEN COUNT(CASE WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN 1 END) > COUNT(c.column_name) * 0.5 THEN '${YELLOW}部分${NC}'
            ELSE '${RED}缺失${NC}'
        END AS status
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
    GROUP BY t.table_name
    ORDER BY comment_coverage_percent ASC, table_name;
    "
}

# 显示缺少注释的表
show_tables_without_comments() {
    log_header "\n=== 缺少注释的表 ==="
    
    local tables=$(psql -h localhost -U postgres -d tron_energy_rental -t -c "
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
        AND col_description(c.table_name::regclass, c.ordinal_position) IS NULL
        AND c.column_name NOT IN ('id', 'created_at', 'updated_at')
    GROUP BY t.table_name
    HAVING COUNT(CASE WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN 1 END) = 0
    ORDER BY t.table_name;
    " | xargs)
    
    if [ -n "$tables" ]; then
        for table in $tables; do
            log_warning "表 $table 缺少注释"
        done
    else
        log_success "所有表都有注释"
    fi
}

# 显示特定表的字段注释状态
show_table_column_comments() {
    local table_name="$1"
    
    if [ -z "$table_name" ]; then
        log_error "请指定表名"
        return 1
    fi
    
    log_header "\n=== 表 $table_name 的字段注释状态 ==="
    
    psql -h localhost -U postgres -d tron_energy_rental -c "
    SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        CASE 
            WHEN col_description(c.table_name::regclass, c.ordinal_position) IS NOT NULL THEN '${GREEN}有注释${NC}'
            ELSE '${RED}无注释${NC}'
        END AS comment_status,
        col_description(c.table_name::regclass, c.ordinal_position) AS column_comment
    FROM information_schema.columns c
    WHERE c.table_name = '$table_name' 
        AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
    "
}

# 显示表级注释状态
show_table_comments() {
    log_header "\n=== 表级注释状态 ==="
    
    psql -h localhost -U postgres -d tron_energy_rental -c "
    SELECT 
        t.table_name,
        CASE 
            WHEN obj_description(t.table_name::regclass) IS NOT NULL THEN '${GREEN}有注释${NC}'
            ELSE '${RED}无注释${NC}'
        END AS table_comment_status,
        obj_description(t.table_name::regclass) AS table_comment
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
    "
}

# 显示建议
show_recommendations() {
    log_header "\n=== 建议和下一步操作 ==="
    
    echo "1. 如果发现缺少注释的表，可以运行以下命令补充注释："
    echo "   ./scripts/maintenance/apply-missing-comments.sh"
    echo ""
    echo "2. 要查看特定表的详细注释状态，可以运行："
    echo "   $0 --table table_name"
    echo ""
    echo "3. 定期检查注释状态，确保新增表及时添加注释"
}

# 主函数
main() {
    log_info "开始检查数据库注释状态..."
    
    # 检查数据库连接
    check_database_connection
    
    # 显示总体统计
    show_overall_statistics
    
    # 显示各表详细状态
    show_table_details
    
    # 显示缺少注释的表
    show_tables_without_comments
    
    # 显示表级注释状态
    show_table_comments
    
    # 显示建议
    show_recommendations
    
    log_success "注释状态检查完成！"
}

# 处理命令行参数
if [ "$1" = "--table" ] && [ -n "$2" ]; then
    check_database_connection
    show_table_column_comments "$2"
    exit 0
fi

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --table TABLE_NAME    显示指定表的字段注释状态"
    echo "  --help, -h           显示帮助信息"
    echo ""
    echo "功能:"
    echo "  检查数据库所有表的注释状态，显示注释覆盖率和详细信息"
    echo ""
    echo "示例:"
    echo "  $0                    # 检查所有表的注释状态"
    echo "  $0 --table users     # 检查users表的字段注释状态"
    exit 0
fi

# 执行主函数
main "$@"
