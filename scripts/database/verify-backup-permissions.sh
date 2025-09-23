#!/bin/bash

# 备份权限验证脚本
# 用途: 检查备份文件是否正确清除了权限信息，确保跨环境兼容性
# 作者: 项目管理脚本自动生成

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 特殊字符
CHECK_MARK='✓'
CROSS_MARK='✗'
ARROW='➤'
GEAR='⚙️'
WARNING='⚠️'

# 显示帮助信息
show_help() {
    echo -e "${GREEN}${BOLD}备份权限验证脚本${NC}"
    echo ""
    echo -e "${BOLD}用法:${NC}"
    echo -e "  $0 <备份文件路径>"
    echo ""
    echo -e "${BOLD}功能:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 检查备份文件是否包含权限信息"
    echo -e "  ${GREEN}${ARROW}${NC} 验证备份文件的跨环境兼容性"
    echo -e "  ${GREEN}${ARROW}${NC} 确保序列、表、函数等对象无所有者限制"
    echo ""
    echo -e "${BOLD}检查项目:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} OWNER 语句检查"
    echo -e "  ${GREEN}${ARROW}${NC} GRANT/REVOKE 权限语句检查"
    echo -e "  ${GREEN}${ARROW}${NC} 用户和角色相关语句检查"
    echo -e "  ${GREEN}${ARROW}${NC} 序列权限检查"
    echo ""
}

# 检查参数
if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

backup_file="$1"

# 检查文件是否存在
if [ ! -f "$backup_file" ]; then
    echo -e "${RED}${CROSS_MARK} 错误: 备份文件不存在: $backup_file${NC}"
    exit 1
fi

echo -e "${GREEN}${GEAR} === 备份权限验证 ===${NC}"
echo -e "${GREEN}${ARROW} 检查文件: ${YELLOW}$(basename "$backup_file")${NC}"
echo -e "${GREEN}${ARROW} 文件路径: ${YELLOW}$backup_file${NC}"
echo ""

# 权限验证结果
validation_errors=0
validation_warnings=0

echo -e "${BLUE}${GEAR} === 开始权限检查 ===${NC}"

# 1. 检查 OWNER 语句
echo -e "${GREEN}${ARROW} 检查 OWNER 语句...${NC}"
owner_count=$(grep -c "OWNER TO" "$backup_file" 2>/dev/null | head -1 || echo "0")
if [ "$owner_count" -gt 0 ]; then
    echo -e "${RED}${CROSS_MARK} 发现 $owner_count 个 OWNER 语句${NC}"
    echo -e "${YELLOW}${ARROW} 示例:${NC}"
    grep "OWNER TO" "$backup_file" | head -3 | while read line; do
        echo -e "    ${YELLOW}$line${NC}"
    done
    validation_errors=$((validation_errors + 1))
else
    echo -e "${GREEN}${CHECK_MARK} 无 OWNER 语句，权限清理正确${NC}"
fi

# 2. 检查 GRANT 语句
echo -e "${GREEN}${ARROW} 检查 GRANT 权限语句...${NC}"
grant_count=$(grep -c "^GRANT " "$backup_file" 2>/dev/null | head -1 || echo "0")
if [ "$grant_count" -gt 0 ]; then
    echo -e "${YELLOW}${WARNING} 发现 $grant_count 个 GRANT 语句${NC}"
    echo -e "${YELLOW}${ARROW} 示例:${NC}"
    grep "^GRANT " "$backup_file" | head -3 | while read line; do
        echo -e "    ${YELLOW}$line${NC}"
    done
    validation_warnings=$((validation_warnings + 1))
else
    echo -e "${GREEN}${CHECK_MARK} 无 GRANT 语句${NC}"
fi

# 3. 检查 REVOKE 语句
echo -e "${GREEN}${ARROW} 检查 REVOKE 权限语句...${NC}"
revoke_count=$(grep -c "^REVOKE " "$backup_file" 2>/dev/null | head -1 || echo "0")
if [ "$revoke_count" -gt 0 ]; then
    echo -e "${YELLOW}${WARNING} 发现 $revoke_count 个 REVOKE 语句${NC}"
    validation_warnings=$((validation_warnings + 1))
else
    echo -e "${GREEN}${CHECK_MARK} 无 REVOKE 语句${NC}"
fi

# 4. 检查用户角色相关语句
echo -e "${GREEN}${ARROW} 检查用户角色语句...${NC}"
role_count=$(grep -c -E "(CREATE ROLE|DROP ROLE|ALTER ROLE)" "$backup_file" 2>/dev/null | head -1 || echo "0")
if [ "$role_count" -gt 0 ]; then
    echo -e "${YELLOW}${WARNING} 发现 $role_count 个角色相关语句${NC}"
    validation_warnings=$((validation_warnings + 1))
else
    echo -e "${GREEN}${CHECK_MARK} 无角色相关语句${NC}"
fi

# 5. 检查序列权限
echo -e "${GREEN}${ARROW} 检查序列相关权限...${NC}"
sequence_owner_count=$(grep -c "SEQUENCE.*OWNER TO" "$backup_file" 2>/dev/null | head -1 || echo "0")
if [ "$sequence_owner_count" -gt 0 ]; then
    echo -e "${RED}${CROSS_MARK} 发现 $sequence_owner_count 个序列所有者语句${NC}"
    validation_errors=$((validation_errors + 1))
else
    echo -e "${GREEN}${CHECK_MARK} 序列无所有者限制${NC}"
fi

# 6. 统计备份内容
echo -e "\n${BLUE}${GEAR} === 备份内容统计 ===${NC}"
tables=$(grep -c "^CREATE TABLE" "$backup_file" 2>/dev/null || echo "0")
sequences=$(grep -c "CREATE SEQUENCE" "$backup_file" 2>/dev/null || echo "0")
indexes=$(grep -c "CREATE.*INDEX" "$backup_file" 2>/dev/null || echo "0")
functions=$(grep -c "CREATE.*FUNCTION" "$backup_file" 2>/dev/null || echo "0")

echo -e "${GREEN}${ARROW} 数据表: ${YELLOW}$tables${NC} 个"
echo -e "${GREEN}${ARROW} 序列: ${YELLOW}$sequences${NC} 个"
echo -e "${GREEN}${ARROW} 索引: ${YELLOW}$indexes${NC} 个"
echo -e "${GREEN}${ARROW} 函数: ${YELLOW}$functions${NC} 个"

# 7. 验证结果总结
echo -e "\n${BLUE}${GEAR} === 验证结果 ===${NC}"

if [ "$validation_errors" -eq 0 ]; then
    echo -e "${GREEN}${CHECK_MARK} 权限验证通过！${NC}"
    echo -e "${GREEN}${ARROW} 备份文件已正确清除所有权限信息${NC}"
    echo -e "${GREEN}${ARROW} 可以安全地在任何环境中导入${NC}"
    echo -e "${GREEN}${ARROW} 导入后目标用户将自动获得所有权限${NC}"
else
    echo -e "${RED}${CROSS_MARK} 权限验证失败！${NC}"
    echo -e "${RED}${ARROW} 发现 $validation_errors 个权限问题${NC}"
    echo -e "${YELLOW}${ARROW} 建议重新创建备份，确保使用 --no-owner --no-privileges 参数${NC}"
fi

if [ "$validation_warnings" -gt 0 ]; then
    echo -e "${YELLOW}${WARNING} 发现 $validation_warnings 个权限警告${NC}"
    echo -e "${YELLOW}${ARROW} 这些问题通常不影响导入，但建议检查${NC}"
fi

# 8. 兼容性建议
echo -e "\n${BLUE}${GEAR} === 兼容性建议 ===${NC}"
echo -e "${GREEN}${ARROW} 推荐的pg_dump参数:${NC}"
echo -e "  ${YELLOW}--no-owner${NC}      移除所有者信息"
echo -e "  ${YELLOW}--no-privileges${NC}  移除权限信息"
echo -e "  ${YELLOW}--create${NC}         包含CREATE DATABASE"
echo -e "  ${YELLOW}--clean${NC}          包含清理语句"

echo -e "\n${GREEN}${ARROW} 导入后需要的操作:${NC}"
echo -e "  ${YELLOW}1.${NC} 为目标用户授予数据库所有权"
echo -e "  ${YELLOW}2.${NC} 授予所有表、序列、函数的权限"
echo -e "  ${YELLOW}3.${NC} 设置默认权限（可选）"

# 退出状态
if [ "$validation_errors" -gt 0 ]; then
    exit 1
else
    exit 0
fi
