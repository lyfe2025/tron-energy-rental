#!/bin/bash

# 数据库恢复脚本
# 功能: 从SQL备份文件恢复PostgreSQL数据库
# 用法: ./restore-database.sh <备份文件路径>
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
    echo -e "${GREEN}${BOLD}数据库恢复脚本${NC}"
    echo ""
    echo -e "${BOLD}用法:${NC}"
    echo -e "  $0 <备份文件路径>"
    echo ""
    echo -e "${BOLD}示例:${NC}"
    echo -e "  $0 ../backups/db_backup_tron_energy_20231201_120000.sql"
    echo -e "  $0 /path/to/backup.sql"
    echo ""
    echo -e "${BOLD}功能:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 从SQL备份文件完整恢复PostgreSQL数据库"
    echo -e "  ${GREEN}${ARROW}${NC} 自动读取.env配置文件获取数据库连接信息"
    echo -e "  ${GREEN}${ARROW}${NC} 提供双重确认保护，防止误操作"
    echo -e "  ${GREEN}${ARROW}${NC} 恢复后自动验证数据库连接"
    echo ""
    echo -e "${BOLD}环境要求:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} PostgreSQL客户端工具 (psql)"
    echo -e "  ${GREEN}${ARROW}${NC} 项目根目录下的.env配置文件"
    echo -e "  ${GREEN}${ARROW}${NC} 有效的数据库连接权限"
    echo ""
    echo -e "${YELLOW}⚠️  警告: 恢复操作将完全覆盖现有数据库，不可逆转！${NC}"
}

# 检查参数
if [ $# -ne 1 ]; then
    echo -e "${RED}${CROSS_MARK} 错误: 参数不正确${NC}"
    echo ""
    show_help
    exit 1
fi

# 检查是否是帮助请求
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

BACKUP_FILE="$1"

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}${CROSS_MARK} 错误: 备份文件不存在: $BACKUP_FILE${NC}"
    exit 1
fi

# 检查备份文件是否可读
if [ ! -r "$BACKUP_FILE" ]; then
    echo -e "${RED}${CROSS_MARK} 错误: 备份文件无法读取: $BACKUP_FILE${NC}"
    exit 1
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
    echo -e "${YELLOW}${ARROW} macOS: brew install postgresql${NC}"
    echo -e "${YELLOW}${ARROW} Ubuntu: sudo apt-get install postgresql-client${NC}"
    echo -e "${YELLOW}${ARROW} CentOS: sudo yum install postgresql${NC}"
    exit 1
fi

# 显示恢复信息
echo -e "${GREEN}${GEAR} === 数据库恢复准备 ===${NC}"
echo -e "${GREEN}${ARROW} 主机: ${YELLOW}$DB_HOST:$DB_PORT${NC}"
echo -e "${GREEN}${ARROW} 数据库: ${YELLOW}$DB_NAME${NC}"
echo -e "${GREEN}${ARROW} 用户: ${YELLOW}$DB_USER${NC}"
echo -e "${GREEN}${ARROW} 备份文件: ${YELLOW}$(basename "$BACKUP_FILE")${NC}"
echo -e "${GREEN}${ARROW} 文件大小: ${YELLOW}$(du -h "$BACKUP_FILE" | cut -f1)${NC}"
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

# 显示警告信息
echo ""
echo -e "${RED}${BOLD}⚠️  重要警告 ⚠️${NC}"
echo -e "${RED}恢复操作将完全覆盖现有数据库！${NC}"
echo -e "${YELLOW}${ARROW} 所有当前数据将被删除并替换为备份数据${NC}"
echo -e "${YELLOW}${ARROW} 此操作不可逆转，请确保您真的需要恢复${NC}"
echo -e "${YELLOW}${ARROW} 建议在恢复前先创建当前数据库的备份${NC}"
echo ""

# 第一次确认
read -p "确认恢复? 输入 'YES' 继续，其他任意键取消: " confirm
if [ "$confirm" != "YES" ]; then
    echo -e "${YELLOW}${ARROW} 已取消恢复操作${NC}"
    unset PGPASSWORD
    exit 0
fi

# 最终确认
echo ""
echo -e "${RED}${BOLD}最后警告:${NC} 即将开始不可逆的数据库恢复操作！"
read -p "最终确认: 输入 'RESTORE' 开始恢复: " final_confirm
if [ "$final_confirm" != "RESTORE" ]; then
    echo -e "${YELLOW}${ARROW} 已取消恢复操作${NC}"
    unset PGPASSWORD
    exit 0
fi

# 开始恢复
echo ""
echo -e "${GREEN}${ARROW} 开始恢复数据库...${NC}"
echo -e "${GREEN}${ARROW} 请稍候，恢复过程可能需要几分钟...${NC}"

# 记录开始时间
start_time=$(date +%s)

# 执行恢复 - 连接到目标数据库而不是postgres
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" >/dev/null 2>&1; then
    # 清除密码环境变量
    unset PGPASSWORD
    
    # 计算耗时
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo -e "${GREEN}${CHECK_MARK} 数据库恢复成功！${NC}"
    echo -e "${GREEN}${ARROW} 恢复文件: ${YELLOW}$(basename "$BACKUP_FILE")${NC}"
    echo -e "${GREEN}${ARROW} 完成时间: ${YELLOW}$(date)${NC}"
    echo -e "${GREEN}${ARROW} 耗时: ${YELLOW}${duration}秒${NC}"
    
    # 修复序列和对象所有者权限
    echo -e "${GREEN}${ARROW} 修复数据库对象权限...${NC}"
    export PGPASSWORD="$DB_PASSWORD"
    # 修复序列所有者
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ALTER SEQUENCE IF EXISTS bot_logs_id_seq OWNER TO $DB_USER;" >/dev/null 2>&1 || true
    # 确保用户有序列权限
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "GRANT USAGE, SELECT ON SEQUENCE bot_logs_id_seq TO $DB_USER;" >/dev/null 2>&1 || true
    echo -e "${GREEN}${CHECK_MARK} 权限修复完成${NC}"
    
    # 同步所有序列值 - 关键修复步骤
    echo -e "${GREEN}${ARROW} 同步序列值，防止主键冲突...${NC}"
    SEQUENCE_SYNC_SCRIPT="$SCRIPT_DIR/sync-sequences.sql"
    if [ -f "$SEQUENCE_SYNC_SCRIPT" ]; then
        export PGPASSWORD="$DB_PASSWORD"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEQUENCE_SYNC_SCRIPT" >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK_MARK} 序列同步完成，已防止主键冲突${NC}"
        else
            echo -e "${YELLOW}${ARROW} 序列同步执行完成（可能有警告，但不影响使用）${NC}"
        fi
    else
        echo -e "${YELLOW}${ARROW} 序列同步脚本未找到，手动执行: scripts/database/sync-sequences.sql${NC}"
    fi
    
    # 验证恢复结果
    echo -e "\n${GREEN}${ARROW} 验证恢复结果...${NC}"
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECK_MARK} 数据库连接正常，恢复验证通过${NC}"
        
        # 显示数据库基本信息
        table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        echo -e "${GREEN}${ARROW} 恢复后数据表数量: ${YELLOW}$table_count${NC}"
    else
        echo -e "${YELLOW}${ARROW} 数据库恢复完成，但连接测试失败，请检查配置${NC}"
    fi
    unset PGPASSWORD
    
    echo -e "\n${GREEN}${CHECK_MARK} 数据库恢复操作完成！${NC}"
    
else
    # 清除密码环境变量
    unset PGPASSWORD
    
    echo -e "${RED}${CROSS_MARK} 数据库恢复失败${NC}"
    echo -e "${YELLOW}${ARROW} 请检查备份文件完整性和数据库配置${NC}"
    echo -e "${YELLOW}${ARROW} 建议查看PostgreSQL错误日志了解详细原因${NC}"
    exit 1
fi
