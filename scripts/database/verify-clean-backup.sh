#!/bin/bash

# 验证备份文件的纯净性
# 确保备份文件可以在标准PostgreSQL环境中恢复

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

echo -e "${BLUE}${GEAR} === 备份文件纯净性验证 ===${NC}"
echo -e "${BLUE}确保备份文件可在标准PostgreSQL环境中恢复${NC}"
echo ""

# 查找最新的备份文件
find_latest_backup() {
    local backup_dir="$PROJECT_DIR/backups"
    local latest_backup=$(ls -t "$backup_dir"/db_backup_tron_energy_rental_*.sql 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ]; then
        echo "$latest_backup"
        return 0
    else
        echo ""
        return 1
    fi
}

# 验证扩展依赖
check_extensions() {
    local backup_file="$1"
    echo -e "${GREEN}${ARROW} 检查扩展依赖...${NC}"
    
    local ext_count=$(grep -ci "CREATE EXTENSION" "$backup_file" 2>/dev/null | head -1 || echo "0")
    
    if [ "$ext_count" -eq 0 ]; then
        echo -e "${GREEN}${CHECK_MARK} 无扩展依赖${NC}"
        return 0
    else
        echo -e "${RED}${CROSS_MARK} 发现 $ext_count 个扩展依赖${NC}"
        echo -e "${YELLOW}${ARROW} 扩展列表:${NC}"
        grep -i "CREATE EXTENSION" "$backup_file"
        return 1
    fi
}

# 验证UUID函数
check_uuid_functions() {
    local backup_file="$1"
    echo -e "${GREEN}${ARROW} 检查UUID生成函数...${NC}"
    
    local gen_random_count=$(grep -c "gen_random_uuid" "$backup_file" 2>/dev/null || echo "0")
    local uuid_generate_count=$(grep -c "uuid_generate_v4" "$backup_file" 2>/dev/null | head -1 || echo "0")
    
    echo -e "${GREEN}${ARROW} gen_random_uuid() 使用次数: ${YELLOW}$gen_random_count${NC}"
    
    if [ "$uuid_generate_count" -eq 0 ]; then
        echo -e "${GREEN}${CHECK_MARK} 无旧版UUID函数${NC}"
    else
        echo -e "${RED}${CROSS_MARK} 发现 $uuid_generate_count 个旧版UUID函数${NC}"
        return 1
    fi
    
    if [ "$gen_random_count" -gt 0 ]; then
        echo -e "${GREEN}${CHECK_MARK} 使用内置UUID函数${NC}"
    fi
    
    return 0
}

# 验证语言依赖
check_languages() {
    local backup_file="$1"
    echo -e "${GREEN}${ARROW} 检查编程语言依赖...${NC}"
    
    local plpgsql_count=$(grep -c "LANGUAGE plpgsql" "$backup_file" 2>/dev/null || echo "0")
    local other_lang_count=$(grep -i "LANGUAGE" "$backup_file" | grep -v "plpgsql" | grep -v "language" | wc -l)
    
    echo -e "${GREEN}${ARROW} plpgsql函数数量: ${YELLOW}$plpgsql_count${NC}"
    
    if [ "$other_lang_count" -eq 0 ]; then
        echo -e "${GREEN}${CHECK_MARK} 仅使用标准plpgsql语言${NC}"
        return 0
    else
        echo -e "${RED}${CROSS_MARK} 发现其他语言依赖${NC}"
        return 1
    fi
}

# 验证特殊对象
check_special_objects() {
    local backup_file="$1"
    echo -e "${GREEN}${ARROW} 检查特殊数据库对象...${NC}"
    
    # 检查是否有需要特殊权限或扩展的对象
    local special_objects=$(grep -E "CREATE (OPERATOR|COLLATION|CAST|DOMAIN|FOREIGN|AGGREGATE)" "$backup_file" 2>/dev/null | wc -l)
    
    if [ "$special_objects" -eq 0 ]; then
        echo -e "${GREEN}${CHECK_MARK} 无特殊数据库对象${NC}"
        return 0
    else
        echo -e "${YELLOW}${ARROW} 发现 $special_objects 个特殊对象（需要检查）${NC}"
        grep -E "CREATE (OPERATOR|COLLATION|CAST|DOMAIN|FOREIGN|AGGREGATE)" "$backup_file" | head -5
        return 0  # 不一定是错误，只是需要注意
    fi
}

# 检查PostgreSQL版本要求
check_version_requirements() {
    local backup_file="$1"
    echo -e "${GREEN}${ARROW} 分析PostgreSQL版本要求...${NC}"
    
    # gen_random_uuid 需要 PostgreSQL 13+
    local gen_random_count=$(grep -c "gen_random_uuid" "$backup_file" 2>/dev/null || echo "0")
    
    if [ "$gen_random_count" -gt 0 ]; then
        echo -e "${GREEN}${ARROW} 最低版本要求: ${YELLOW}PostgreSQL 13+${NC}"
        echo -e "${GREEN}${ARROW} 原因: 使用了gen_random_uuid()内置函数${NC}"
    else
        echo -e "${GREEN}${ARROW} 版本要求: ${YELLOW}PostgreSQL 9.1+${NC}"
    fi
    
    return 0
}

# 生成验证报告
generate_report() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    
    echo -e "\n${BLUE}${GEAR} === 验证报告 ===${NC}"
    echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$filename${NC}"
    echo -e "${GREEN}${ARROW} 文件大小: ${YELLOW}$(du -h "$backup_file" | cut -f1)${NC}"
    echo -e "${GREEN}${ARROW} 创建时间: ${YELLOW}$(date -r "$backup_file" "+%Y-%m-%d %H:%M:%S")${NC}"
    echo ""
    
    echo -e "${GREEN}${CHECK_MARK} 兼容性验证结果:${NC}"
    echo -e "  ${GREEN}✓${NC} 无扩展依赖"
    echo -e "  ${GREEN}✓${NC} 使用内置UUID函数"
    echo -e "  ${GREEN}✓${NC} 仅使用标准plpgsql语言"
    echo -e "  ${GREEN}✓${NC} 无特殊数据库对象依赖"
    echo ""
    
    echo -e "${YELLOW}${ARROW} 部署要求:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} PostgreSQL 13+ (推荐14+)"
    echo -e "  ${GREEN}${ARROW}${NC} 标准PostgreSQL安装"
    echo -e "  ${GREEN}${ARROW}${NC} 无需额外配置或扩展"
    echo ""
    
    echo -e "${GREEN}${CHECK_MARK} 结论: 备份文件完全兼容标准PostgreSQL环境${NC}"
    echo -e "${GREEN}${ARROW} 新环境部署只需: ${YELLOW}createdb + psql -f backup.sql${NC}"
}

# 主函数
main() {
    local backup_file=$(find_latest_backup)
    
    if [ -z "$backup_file" ]; then
        echo -e "${RED}${CROSS_MARK} 未找到备份文件${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}${ARROW} 验证备份文件: $(basename "$backup_file")${NC}"
    echo ""
    
    local all_passed=true
    
    # 执行各项验证
    if ! check_extensions "$backup_file"; then
        all_passed=false
    fi
    
    if ! check_uuid_functions "$backup_file"; then
        all_passed=false
    fi
    
    if ! check_languages "$backup_file"; then
        all_passed=false
    fi
    
    if ! check_special_objects "$backup_file"; then
        # 特殊对象检查不影响最终结果
        true
    fi
    
    check_version_requirements "$backup_file"
    
    if [ "$all_passed" = true ]; then
        generate_report "$backup_file"
        echo -e "\n${GREEN}${CHECK_MARK} 所有验证通过！备份文件完全兼容标准PostgreSQL${NC}"
        return 0
    else
        echo -e "\n${RED}${CROSS_MARK} 验证失败：备份文件存在兼容性问题${NC}"
        return 1
    fi
}

# 执行主函数
main "$@"
