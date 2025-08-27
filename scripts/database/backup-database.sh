#!/bin/bash

# 数据库备份脚本
# 功能: 创建PostgreSQL数据库的完整备份
# 用法: ./backup-database.sh [备份目录]
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
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 默认备份目录
DEFAULT_BACKUP_DIR="$PROJECT_DIR/backups"

# 显示帮助信息
show_help() {
    echo -e "${GREEN}${BOLD}数据库备份脚本${NC}"
    echo ""
    echo -e "${BOLD}用法:${NC}"
    echo -e "  $0 [备份目录]"
    echo ""
    echo -e "${BOLD}示例:${NC}"
    echo -e "  $0                    # 使用默认备份目录: $DEFAULT_BACKUP_DIR"
    echo -e "  $0 /path/to/backups   # 使用指定备份目录"
    echo ""
    echo -e "${BOLD}功能:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 创建PostgreSQL数据库的完整备份"
    echo -e "  ${GREEN}${ARROW}${NC} 包含数据库结构、数据、索引、序列等"
    echo -e "  ${GREEN}${ARROW}${NC} 自动读取.env配置文件获取数据库连接信息"
    echo -e "  ${GREEN}${ARROW}${NC} 生成带时间戳的备份文件名"
    echo -e "  ${GREEN}${ARROW}${NC} 备份前自动测试数据库连接"
    echo ""
    echo -e "${BOLD}备份内容:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 数据库结构 (表、索引、约束等)"
    echo -e "  ${GREEN}${ARROW}${NC} 完整数据内容 (通过COPY语句)"
    echo -e "  ${GREEN}${ARROW}${NC} 序列和函数"
    echo -e "  ${GREEN}${ARROW}${NC} 触发器和视图"
    echo ""
    echo -e "${BOLD}环境要求:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} PostgreSQL客户端工具 (pg_dump)"
    echo -e "  ${GREEN}${ARROW}${NC} 项目根目录下的.env配置文件"
    echo -e "  ${GREEN}${ARROW}${NC} 有效的数据库连接权限"
    echo ""
    echo -e "${BOLD}备份文件格式:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 文件名: db_backup_数据库名_时间戳.sql"
    echo -e "  ${GREEN}${ARROW}${NC} 格式: PostgreSQL SQL转储文件（未压缩）"
}

# 检查是否是帮助请求
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 设置备份目录
BACKUP_DIR="${1:-$DEFAULT_BACKUP_DIR}"

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
DB_NAME="${DB_NAME:-tron_energy_rental}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# 验证必要配置
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo -e "${RED}${CROSS_MARK} 错误: 数据库配置不完整${NC}"
    echo -e "${YELLOW}${ARROW} 请检查.env文件中的DB_NAME和DB_USER配置${NC}"
    exit 1
fi

# 检查PostgreSQL客户端工具
if ! command -v pg_dump >/dev/null 2>&1; then
    echo -e "${RED}${CROSS_MARK} 错误: pg_dump 工具未找到${NC}"
    echo -e "${YELLOW}${ARROW} 请安装 PostgreSQL 客户端工具${NC}"
    echo -e "${YELLOW}${ARROW} macOS: brew install postgresql${NC}"
    echo -e "${YELLOW}${ARROW} Ubuntu: sudo apt-get install postgresql-client${NC}"
    echo -e "${YELLOW}${ARROW} CentOS: sudo yum install postgresql${NC}"
    exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR" || {
    echo -e "${RED}${CROSS_MARK} 错误: 无法创建备份目录: $BACKUP_DIR${NC}"
    exit 1
}

# 显示备份信息
echo -e "${GREEN}${GEAR} === 数据库备份准备 ===${NC}"
echo -e "${GREEN}${ARROW} 主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
echo -e "${GREEN}${ARROW} 数据库: ${YELLOW}$DB_NAME${NC}"
echo -e "${GREEN}${ARROW} 用户: ${YELLOW}$DB_USER${NC}"
echo -e "${GREEN}${ARROW} 备份目录: ${YELLOW}$BACKUP_DIR${NC}"
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

# 生成备份文件名
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_file="$BACKUP_DIR/db_backup_${DB_NAME}_${timestamp}.sql"

echo -e "\n${GREEN}${ARROW} 开始备份数据库...${NC}"
echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$backup_file${NC}"

# 记录开始时间
start_time=$(date +%s)

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
    
    # 计算耗时
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    # 获取备份文件大小
    file_size=$(du -h "$backup_file" | cut -f1)
    
    echo -e "${GREEN}${CHECK_MARK} 数据库备份成功！${NC}"
    echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$backup_file${NC}"
    echo -e "${GREEN}${ARROW} 文件大小: ${YELLOW}$file_size${NC}"
    echo -e "${GREEN}${ARROW} 备份时间: ${YELLOW}$(date)${NC}"
    echo -e "${GREEN}${ARROW} 耗时: ${YELLOW}${duration}秒${NC}"
    
    # 显示备份内容摘要
    echo -e "\n${GREEN}${GEAR} === 备份内容摘要 ===${NC}"
    
    # 统计备份内容
    local tables=$(grep -c "^CREATE TABLE" "$backup_file" 2>/dev/null || echo "0")
    local copy_statements=$(grep -c "^COPY " "$backup_file" 2>/dev/null || echo "0")
    local indexes=$(grep -c "CREATE.*INDEX" "$backup_file" 2>/dev/null || echo "0")
    local sequences=$(grep -c "CREATE SEQUENCE" "$backup_file" 2>/dev/null || echo "0")
    
    echo -e "${GREEN}${ARROW} 备份包含:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 数据表: ${YELLOW}$tables${NC} 个"
    echo -e "  ${GREEN}${ARROW}${NC} 数据复制语句: ${YELLOW}$copy_statements${NC} 个"
    echo -e "  ${GREEN}${ARROW}${NC} 索引: ${YELLOW}$indexes${NC} 个"
    echo -e "  ${GREEN}${ARROW}${NC} 序列: ${YELLOW}$sequences${NC} 个"
    echo -e "  ${GREEN}${ARROW}${NC} 数据库结构 (表、索引、约束等)"
    echo -e "  ${GREEN}${ARROW}${NC} 完整数据内容"
    echo -e "  ${GREEN}${ARROW}${NC} 序列和函数"
    echo -e "  ${GREEN}${ARROW}${NC} 触发器和视图"
    echo -e "\n${GREEN}${CHECK_MARK} SQL文件未压缩，方便直接查看和编辑${NC}"
    
    # 显示使用建议
    echo -e "\n${BLUE}${GEAR} === 使用建议 ===${NC}"
    echo -e "${GREEN}${ARROW} 查看备份: ${YELLOW}cat $backup_file | head -20${NC}"
    echo -e "${GREEN}${ARROW} 恢复数据: ${YELLOW}./scripts/restore-database.sh $backup_file${NC}"
    echo -e "${GREEN}${ARROW} 验证备份: ${YELLOW}grep -c '^COPY ' $backup_file${NC}"
    
else
    # 清除密码环境变量
    unset PGPASSWORD
    
    echo -e "${RED}${CROSS_MARK} 数据库备份失败${NC}"
    
    # 删除可能的部分备份文件
    if [ -f "$backup_file" ]; then
        rm "$backup_file"
        echo -e "${GREEN}${ARROW} 已清理失败的备份文件${NC}"
    fi
    
    echo -e "${YELLOW}${ARROW} 请检查数据库配置和连接权限${NC}"
    exit 1
fi

echo -e "\n${GREEN}${CHECK_MARK} 数据库备份操作完成！${NC}"
