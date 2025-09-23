#!/bin/bash

# UUID扩展移除脚本
# 将项目从uuid-ossp扩展迁移到内置的gen_random_uuid()函数

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# 数据库配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tron_energy_rental}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 图标定义
CHECK_MARK="✓"
CROSS_MARK="✗"
ARROW="➤"
GEAR="⚙️"
WARNING="⚠️"

echo -e "${BLUE}${GEAR} === UUID扩展移除工具 ===${NC}"
echo -e "${BLUE}将项目从uuid-ossp扩展迁移到PostgreSQL内置函数${NC}"
echo ""

# 检查PostgreSQL版本
check_postgresql_version() {
    echo -e "${GREEN}${ARROW} 检查PostgreSQL版本...${NC}"
    
    export PGPASSWORD="$DB_PASSWORD"
    local version=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>/dev/null)
    unset PGPASSWORD
    
    if [[ $version == *"PostgreSQL 13"* ]] || [[ $version == *"PostgreSQL 14"* ]] || [[ $version == *"PostgreSQL 15"* ]] || [[ $version == *"PostgreSQL 16"* ]]; then
        echo -e "${GREEN}${CHECK_MARK} PostgreSQL版本支持gen_random_uuid()${NC}"
        echo -e "${GREEN}${ARROW} 版本信息: $(echo $version | cut -d',' -f1)${NC}"
        return 0
    else
        echo -e "${RED}${CROSS_MARK} PostgreSQL版本过低，需要13+才支持gen_random_uuid()${NC}"
        echo -e "${YELLOW}${ARROW} 当前版本: $(echo $version | cut -d',' -f1)${NC}"
        return 1
    fi
}

# 检查当前扩展使用情况
check_current_extensions() {
    echo -e "\n${GREEN}${ARROW} 检查当前数据库扩展...${NC}"
    
    export PGPASSWORD="$DB_PASSWORD"
    local extensions=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp';" 2>/dev/null)
    unset PGPASSWORD
    
    if [[ $extensions == *"uuid-ossp"* ]]; then
        echo -e "${YELLOW}${ARROW} 检测到uuid-ossp扩展${NC}"
        return 0
    else
        echo -e "${GREEN}${CHECK_MARK} 未发现uuid-ossp扩展${NC}"
        return 1
    fi
}

# 检查使用uuid_generate_v4的字段
check_uuid_fields() {
    echo -e "\n${GREEN}${ARROW} 检查使用uuid_generate_v4()的字段...${NC}"
    
    export PGPASSWORD="$DB_PASSWORD"
    local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE column_default LIKE '%uuid_generate_v4%' AND table_schema = 'public';" 2>/dev/null | tr -d ' ')
    unset PGPASSWORD
    
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}${ARROW} 发现 $count 个字段使用uuid_generate_v4()${NC}"
        
        # 显示具体字段
        export PGPASSWORD="$DB_PASSWORD"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name, column_name FROM information_schema.columns WHERE column_default LIKE '%uuid_generate_v4%' AND table_schema = 'public' ORDER BY table_name, column_name;" 2>/dev/null
        unset PGPASSWORD
        
        return 0
    else
        echo -e "${GREEN}${CHECK_MARK} 所有字段已使用gen_random_uuid()${NC}"
        return 1
    fi
}

# 执行迁移
run_migration() {
    echo -e "\n${GREEN}${GEAR} 开始执行UUID扩展移除迁移...${NC}"
    
    local migration_file="$PROJECT_DIR/migrations/20250923_remove_uuid_ossp_extension.sql"
    
    if [ ! -f "$migration_file" ]; then
        echo -e "${RED}${CROSS_MARK} 迁移文件不存在: $migration_file${NC}"
        return 1
    fi
    
    echo -e "${GREEN}${ARROW} 执行迁移脚本...${NC}"
    
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        echo -e "${GREEN}${CHECK_MARK} 迁移执行成功${NC}"
        unset PGPASSWORD
        return 0
    else
        echo -e "${RED}${CROSS_MARK} 迁移执行失败${NC}"
        unset PGPASSWORD
        return 1
    fi
}

# 移除扩展
remove_extension() {
    echo -e "\n${GREEN}${ARROW} 准备移除uuid-ossp扩展...${NC}"
    
    echo -e "${RED}${WARNING} 重要提醒：${NC}"
    echo -e "${YELLOW}${ARROW} 移除扩展是不可逆操作${NC}"
    echo -e "${YELLOW}${ARROW} 请确保所有UUID字段已迁移到gen_random_uuid()${NC}"
    echo -e "${YELLOW}${ARROW} 建议先在测试环境验证${NC}"
    echo ""
    
    read -p "确认移除uuid-ossp扩展? (输入 'REMOVE' 确认): " confirm
    if [ "$confirm" != "REMOVE" ]; then
        echo -e "${YELLOW}${ARROW} 已取消扩展移除操作${NC}"
        return 0
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DROP EXTENSION IF EXISTS \"uuid-ossp\";" 2>/dev/null; then
        echo -e "${GREEN}${CHECK_MARK} uuid-ossp扩展已成功移除${NC}"
        unset PGPASSWORD
        return 0
    else
        echo -e "${RED}${CROSS_MARK} 扩展移除失败${NC}"
        unset PGPASSWORD
        return 1
    fi
}

# 验证迁移结果
verify_migration() {
    echo -e "\n${GREEN}${GEAR} 验证迁移结果...${NC}"
    
    # 检查是否还有uuid_generate_v4的使用
    if check_uuid_fields; then
        echo -e "${RED}${CROSS_MARK} 迁移验证失败：仍有字段使用uuid_generate_v4()${NC}"
        return 1
    fi
    
    # 测试gen_random_uuid()函数
    echo -e "${GREEN}${ARROW} 测试gen_random_uuid()函数...${NC}"
    export PGPASSWORD="$DB_PASSWORD"
    local test_uuid=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT gen_random_uuid();" 2>/dev/null | tr -d ' ')
    unset PGPASSWORD
    
    if [ -n "$test_uuid" ]; then
        echo -e "${GREEN}${CHECK_MARK} gen_random_uuid()函数正常工作${NC}"
        echo -e "${GREEN}${ARROW} 测试UUID: $test_uuid${NC}"
    else
        echo -e "${RED}${CROSS_MARK} gen_random_uuid()函数测试失败${NC}"
        return 1
    fi
    
    # 检查扩展状态
    echo -e "${GREEN}${ARROW} 检查扩展状态...${NC}"
    export PGPASSWORD="$DB_PASSWORD"
    local ext_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'uuid-ossp';" 2>/dev/null | tr -d ' ')
    unset PGPASSWORD
    
    if [ "$ext_count" = "0" ]; then
        echo -e "${GREEN}${CHECK_MARK} uuid-ossp扩展已完全移除${NC}"
    else
        echo -e "${YELLOW}${ARROW} uuid-ossp扩展仍然存在${NC}"
    fi
    
    echo -e "\n${GREEN}${CHECK_MARK} 迁移验证完成${NC}"
    return 0
}

# 显示后续步骤
show_next_steps() {
    echo -e "\n${BLUE}${GEAR} === 迁移完成 ===${NC}"
    echo -e "${GREEN}${CHECK_MARK} UUID扩展依赖已成功移除${NC}"
    echo ""
    echo -e "${YELLOW}${ARROW} 后续步骤：${NC}"
    echo -e "  1. 更新部署脚本，移除uuid-ossp扩展安装要求"
    echo -e "  2. 更新部署文档，说明PostgreSQL 13+版本要求"
    echo -e "  3. 在测试环境验证所有功能正常"
    echo -e "  4. 更新数据库备份脚本"
    echo ""
    echo -e "${YELLOW}${ARROW} 优势：${NC}"
    echo -e "  ✓ 简化部署流程，无需安装额外扩展"
    echo -e "  ✓ 减少部署环境依赖"
    echo -e "  ✓ 使用PostgreSQL内置函数，性能更好"
    echo -e "  ✓ 避免扩展版本兼容性问题"
    echo ""
}

# 主函数
main() {
    echo -e "${GREEN}${ARROW} 开始UUID扩展移除流程...${NC}"
    
    # 检查PostgreSQL版本
    if ! check_postgresql_version; then
        echo -e "${RED}${CROSS_MARK} PostgreSQL版本检查失败${NC}"
        exit 1
    fi
    
    # 检查当前状态
    local has_extension=false
    local has_uuid_fields=false
    
    if check_current_extensions; then
        has_extension=true
    fi
    
    if check_uuid_fields; then
        has_uuid_fields=true
    fi
    
    # 根据状态执行相应操作
    if [ "$has_uuid_fields" = true ]; then
        echo -e "\n${YELLOW}${ARROW} 需要执行字段迁移${NC}"
        if ! run_migration; then
            echo -e "${RED}${CROSS_MARK} 迁移失败${NC}"
            exit 1
        fi
    fi
    
    # 验证迁移结果
    if ! verify_migration; then
        echo -e "${RED}${CROSS_MARK} 迁移验证失败${NC}"
        exit 1
    fi
    
    # 移除扩展（可选）
    if [ "$has_extension" = true ]; then
        echo -e "\n${YELLOW}${ARROW} 检测到uuid-ossp扩展${NC}"
        remove_extension
    fi
    
    # 显示完成信息
    show_next_steps
}

# 执行主函数
main "$@"
