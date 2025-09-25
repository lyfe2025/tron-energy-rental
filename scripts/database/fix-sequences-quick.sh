#!/bin/bash

# 快速修复数据库序列同步问题
# 功能: 解决 "duplicate key value violates unique constraint" 错误
# 用法: ./fix-sequences-quick.sh
# 作者: 自动生成于项目管理脚本

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

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# 显示帮助信息
show_help() {
    echo -e "${GREEN}${BOLD}数据库序列快速修复脚本${NC}"
    echo ""
    echo -e "${BOLD}用法:${NC}"
    echo -e "  $0"
    echo ""
    echo -e "${BOLD}功能:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 快速修复数据库序列同步问题"
    echo -e "  ${GREEN}${ARROW}${NC} 解决主键约束违反错误"
    echo -e "  ${GREEN}${ARROW}${NC} 无需重新恢复数据库"
    echo ""
    echo -e "${BOLD}适用场景:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 启动项目时出现重复键错误"
    echo -e "  ${GREEN}${ARROW}${NC} 登录时出现 login_logs_pkey 错误"
    echo -e "  ${GREEN}${ARROW}${NC} 机器人日志出现 bot_logs_pkey 错误"
    echo ""
    echo -e "${BOLD}错误示例:${NC}"
    echo -e "  ${RED}duplicate key value violates unique constraint \"login_logs_pkey\"${NC}"
    echo -e "  ${RED}duplicate key value violates unique constraint \"bot_logs_pkey\"${NC}"
    echo ""
    echo -e "${YELLOW}💡 提示: 此脚本安全无害，可随时运行${NC}"
}

# 检查是否是帮助请求
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

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
    echo -e "${YELLOW}${ARROW} 请确保在项目根目录下存在.env配置文件${NC}"
    exit 1
fi

# 数据库配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tron_energy}"
DB_USER="${DB_USER:-db_tron_admin}"
DB_PASSWORD="${DB_PASSWORD:-AZDTswBsRbhTpbAm}"

# 验证必要配置
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo -e "${RED}${CROSS_MARK} 错误: 数据库配置不完整${NC}"
    echo -e "${YELLOW}${ARROW} 请检查.env文件中的DB_NAME和DB_USER配置${NC}"
    exit 1
fi

# 检查PostgreSQL客户端工具
if ! command -v psql >/dev/null 2>&1; then
    echo -e "${RED}${CROSS_MARK} 错误: psql 工具未找到${NC}"
    echo -e "${YELLOW}${ARROW} 请安装 PostgreSQL 客户端工具${NC}"
    exit 1
fi

# 显示修复信息
echo -e "${GREEN}${GEAR} === 数据库序列快速修复 ===${NC}"
echo -e "${GREEN}${ARROW} 主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
echo -e "${GREEN}${ARROW} 数据库: ${YELLOW}$DB_NAME${NC}"
echo -e "${GREEN}${ARROW} 用户: ${YELLOW}$DB_USER${NC}"
echo ""

# 测试数据库连接
echo -e "${GREEN}${ARROW} 测试数据库连接...${NC}"
export PGPASSWORD="$DB_PASSWORD"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}${CHECK_MARK} 数据库连接测试成功${NC}"
else
    echo -e "${RED}${CROSS_MARK} 数据库连接测试失败${NC}"
    unset PGPASSWORD
    echo -e "${YELLOW}${ARROW} 请检查数据库配置和网络连接${NC}"
    exit 1
fi

# 检查序列同步脚本
SEQUENCE_SYNC_SCRIPT="$SCRIPT_DIR/sync-sequences.sql"
if [ ! -f "$SEQUENCE_SYNC_SCRIPT" ]; then
    echo -e "${RED}${CROSS_MARK} 错误: 序列同步脚本未找到: $SEQUENCE_SYNC_SCRIPT${NC}"
    unset PGPASSWORD
    exit 1
fi

# 显示即将执行的操作
echo -e "${GREEN}${ARROW} 即将执行的修复操作:${NC}"
echo -e "  ${GREEN}${ARROW}${NC} 同步所有表的序列值到正确位置"
echo -e "  ${GREEN}${ARROW}${NC} 解决主键约束违反问题"
echo -e "  ${GREEN}${ARROW}${NC} 确保应用程序可以正常插入数据"
echo ""

# 开始修复
echo -e "${GREEN}${ARROW} 开始修复序列同步问题...${NC}"

# 记录开始时间
start_time=$(date +%s)

# 执行序列同步
export PGPASSWORD="$DB_PASSWORD"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEQUENCE_SYNC_SCRIPT" >/dev/null 2>&1; then
    # 清除密码环境变量
    unset PGPASSWORD
    
    # 计算耗时
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo -e "${GREEN}${CHECK_MARK} 序列同步修复成功！${NC}"
    echo -e "${GREEN}${ARROW} 完成时间: ${YELLOW}$(date)${NC}"
    echo -e "${GREEN}${ARROW} 耗时: ${YELLOW}${duration}秒${NC}"
    
    # 验证修复结果
    echo -e "\n${GREEN}${ARROW} 验证修复结果...${NC}"
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECK_MARK} 数据库连接正常，修复验证通过${NC}"
    else
        echo -e "${YELLOW}${ARROW} 数据库修复完成，但连接测试失败，请检查配置${NC}"
    fi
    unset PGPASSWORD
    
    echo -e "\n${GREEN}${CHECK_MARK} 序列同步修复完成！${NC}"
    echo -e "${GREEN}${ARROW} 现在可以重新启动项目，应该不会再出现主键冲突错误${NC}"
    echo -e "${BLUE}${ARROW} 建议执行: ${YELLOW}npm run restart${NC}"
    
else
    # 清除密码环境变量
    unset PGPASSWORD
    
    echo -e "${RED}${CROSS_MARK} 序列同步修复失败${NC}"
    echo -e "${YELLOW}${ARROW} 请检查数据库配置和权限${NC}"
    exit 1
fi

echo -e "\n${GREEN}${CHECK_MARK} 序列快速修复操作完成！${NC}"
