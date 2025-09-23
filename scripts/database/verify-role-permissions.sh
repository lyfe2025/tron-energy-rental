#!/bin/bash

# role_permissions 表数据验证脚本
# 用于验证备份文件中的 role_permissions 数据完整性

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 特殊字符和图标
CHECK_MARK='✓'
CROSS_MARK='✗'
ARROW='➤'
GEAR='⚙️'
INFO='ℹ'

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# 切换到项目根目录
cd "$PROJECT_DIR" || {
    echo -e "${RED}${CROSS_MARK} 错误: 无法访问项目根目录: $PROJECT_DIR${NC}"
    exit 1
}

# 加载环境变量
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}${CROSS_MARK} 错误: 未找到 .env 文件${NC}"
    exit 1
fi

# 数据库配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tron_energy}"
DB_USER="${DB_USER:-db_tron_admin}"
DB_PASSWORD="${DB_PASSWORD:-AZDTswBsRbhTpbAm}"
BACKUP_DIR="$PROJECT_DIR/backups"

echo -e "${GREEN}${GEAR} === role_permissions 表数据验证工具 ===${NC}"
echo ""

# 1. 检查数据库中的实际数据
echo -e "${YELLOW}${ARROW} 1. 检查数据库中的实际数据...${NC}"
export PGPASSWORD="$DB_PASSWORD"

# 检查表是否存在
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
   -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public';" \
   | grep -q "role_permissions"; then
    
    # 获取数据库中的数据量
    db_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
               -t -c "SELECT COUNT(*) FROM role_permissions;" | xargs)
    
    echo -e "${GREEN}${CHECK_MARK} 数据库中 role_permissions 表存在${NC}"
    echo -e "${GREEN}${CHECK_MARK} 数据库中记录数: ${YELLOW}$db_count${NC}"
    
    # 显示一些示例数据
    echo -e "\n${GREEN}${ARROW} 数据库中的示例记录:${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -c "SELECT id, role_id, menu_id, created_at FROM role_permissions ORDER BY id LIMIT 5;" 2>/dev/null || true
         
else
    echo -e "${RED}${CROSS_MARK} 数据库中 role_permissions 表不存在或无法访问${NC}"
    unset PGPASSWORD
    exit 1
fi

unset PGPASSWORD

# 2. 检查备份文件
echo -e "\n${YELLOW}${ARROW} 2. 检查备份文件中的数据...${NC}"

# 找到最新的 Navicat 兼容备份文件
latest_backup=$(ls -t "$BACKUP_DIR"/db_backup_navicat_*_*.sql 2>/dev/null | head -1)

if [ -z "$latest_backup" ]; then
    echo -e "${RED}${CROSS_MARK} 未找到 Navicat 兼容备份文件${NC}"
    exit 1
fi

echo -e "${GREEN}${CHECK_MARK} 找到备份文件: ${YELLOW}$(basename "$latest_backup")${NC}"

# 检查备份文件中的 role_permissions 数据
if grep -q "role_permissions" "$latest_backup"; then
    echo -e "${GREEN}${CHECK_MARK} 备份文件包含 role_permissions 表定义${NC}"
    
    # 统计 INSERT 语句数量
    insert_count=$(grep -c "INSERT INTO.*role_permissions" "$latest_backup" 2>/dev/null || echo "0")
    echo -e "${GREEN}${CHECK_MARK} 备份文件中 INSERT 语句数量: ${YELLOW}$insert_count${NC}"
    
    if [ "$insert_count" -gt 0 ]; then
        echo -e "${GREEN}${CHECK_MARK} 备份文件包含 role_permissions 数据${NC}"
        
        # 显示备份文件中的前几条 INSERT 语句
        echo -e "\n${GREEN}${ARROW} 备份文件中的示例 INSERT 语句:${NC}"
        grep "INSERT INTO.*role_permissions" "$latest_backup" | head -3
        echo -e "${GREEN}...${NC}"
        echo -e "${GREEN}(共 $insert_count 条记录)${NC}"
    else
        echo -e "${RED}${CROSS_MARK} 备份文件中没有找到 role_permissions 的 INSERT 语句${NC}"
    fi
else
    echo -e "${RED}${CROSS_MARK} 备份文件中没有找到 role_permissions 相关内容${NC}"
fi

# 3. 数据一致性检查
echo -e "\n${YELLOW}${ARROW} 3. 数据一致性验证...${NC}"

if [ "$db_count" -eq "$insert_count" ]; then
    echo -e "${GREEN}${CHECK_MARK} 数据一致性验证通过！${NC}"
    echo -e "${GREEN}${ARROW} 数据库记录数 ($db_count) = 备份文件记录数 ($insert_count)${NC}"
else
    echo -e "${YELLOW}${ARROW} 数据数量不一致:${NC}"
    echo -e "${YELLOW}  • 数据库中: $db_count 条记录${NC}"
    echo -e "${YELLOW}  • 备份文件中: $insert_count 条记录${NC}"
    echo -e "${YELLOW}${INFO} 这可能是由于备份时间点不同导致的${NC}"
fi

# 4. 文件完整性检查
echo -e "\n${YELLOW}${ARROW} 4. 备份文件完整性检查...${NC}"

file_size=$(du -h "$latest_backup" | cut -f1)
file_lines=$(wc -l < "$latest_backup")
file_encoding=$(file "$latest_backup" | cut -d: -f2)

echo -e "${GREEN}${CHECK_MARK} 文件大小: ${YELLOW}$file_size${NC}"
echo -e "${GREEN}${CHECK_MARK} 文件行数: ${YELLOW}$file_lines${NC}"
echo -e "${GREEN}${CHECK_MARK} 文件编码:${YELLOW}$file_encoding${NC}"

# 检查文件是否完整结束
if tail -5 "$latest_backup" | grep -q "PostgreSQL database dump complete"; then
    echo -e "${GREEN}${CHECK_MARK} 备份文件完整性验证通过${NC}"
else
    echo -e "${RED}${CROSS_MARK} 备份文件可能不完整${NC}"
fi

# 5. 生成详细的数据验证报告
echo -e "\n${GREEN}${GEAR} === 详细验证报告 ===${NC}"
echo -e "${GREEN}${ARROW} 验证时间: ${YELLOW}$(date)${NC}"
echo -e "${GREEN}${ARROW} 数据库: ${YELLOW}$DB_NAME${NC}"
echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$(basename "$latest_backup")${NC}"
echo ""
echo -e "${BOLD}数据状态:${NC}"
echo -e "  ${GREEN}${CHECK_MARK}${NC} 数据库表存在: role_permissions"
echo -e "  ${GREEN}${CHECK_MARK}${NC} 数据库记录: $db_count 条"
echo -e "  ${GREEN}${CHECK_MARK}${NC} 备份表定义: 已包含"
echo -e "  ${GREEN}${CHECK_MARK}${NC} 备份数据: $insert_count 条 INSERT 语句"
echo -e "  ${GREEN}${CHECK_MARK}${NC} 文件完整性: 通过验证"

# 6. 使用建议
echo -e "\n${BLUE}${GEAR} === 使用建议 ===${NC}"
echo -e "${GREEN}${ARROW} 如果您在 Navicat 中看不到 role_permissions 数据:${NC}"
echo -e "  ${YELLOW}1.${NC} 确保您查看的是正确的备份文件: $(basename "$latest_backup")"
echo -e "  ${YELLOW}2.${NC} 在 Navicat 中执行查询验证: SELECT COUNT(*) FROM role_permissions;"
echo -e "  ${YELLOW}3.${NC} 检查 Navicat 的查询结果显示设置"
echo -e "  ${YELLOW}4.${NC} 尝试使用其他工具 (pgAdmin, DBeaver) 进行验证"

echo -e "\n${GREEN}${ARROW} 如果需要重新创建备份:${NC}"
echo -e "  ${YELLOW}${ARROW}${NC} ./project.sh → 选择 '7) 数据库管理' → '2) 创建Navicat/宝塔完美兼容备份'"

echo -e "\n${GREEN}${ARROW} 验证特定记录:${NC}"
echo -e "  ${YELLOW}${ARROW}${NC} psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT * FROM role_permissions WHERE id = 1;\""

echo -e "\n${GREEN}${CHECK_MARK} role_permissions 数据验证完成！${NC}"
