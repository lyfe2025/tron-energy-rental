#!/bin/bash

# 项目统一管理脚本 - 主入口
# 支持前后台服务的启动、停止、重启、日志管理、数据库备份等操作
# 版本: 2.0 (模块化重构版)

set -e  # 遇到错误立即退出

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"

# 检查scripts目录是否存在
if [ ! -d "$SCRIPTS_DIR" ]; then
    echo "错误: scripts 目录不存在: $SCRIPTS_DIR"
    exit 1
fi

# 加载工具函数模块
if [ -f "$SCRIPTS_DIR/core/utils.sh" ]; then
    source "$SCRIPTS_DIR/core/utils.sh"
else
    echo "错误: 工具函数模块不存在: $SCRIPTS_DIR/core/utils.sh"
    exit 1
fi

# 初始化项目环境
if ! init_project_env; then
    echo "项目环境初始化失败"
    exit 1
fi

# 加载功能模块
load_module "service-manager" || {
    echo "服务管理模块加载失败"
    exit 1
}

load_module "log-manager" || {
    echo "日志管理模块加载失败"
    exit 1
}

load_module "database-manager" || {
    echo "数据库管理模块加载失败"
    exit 1
}

# 显示帮助信息
show_help() {
    echo -e "\n${GREEN}${HELP} === 使用说明 ===${NC}"
    echo -e "${WHITE}此脚本是项目的统一管理入口${NC}"
    echo ""
    echo -e "${BOLD}主要功能:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 一键启动所有服务（前后台）"
    echo -e "  ${GREEN}${ARROW}${NC} 安全停止所有服务（仅项目相关进程）"
    echo -e "  ${GREEN}${ARROW}${NC} 安全重启所有服务（带进程验证）"
    echo -e "  ${GREEN}${ARROW}${NC} 智能服务状态检查"
    echo -e "  ${GREEN}${ARROW}${NC} 管理日志文件（查看、清理、统计）"
    echo -e "  ${GREEN}${ARROW}${NC} 数据库完整备份（结构+数据）"
    echo -e "  ${GREEN}${ARROW}${NC} 数据库恢复和验证"
    echo ""
    echo -e "${BOLD}环境配置:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 后端端口: ${YELLOW}$BACKEND_PORT${NC} (从 .env 读取)"
    echo -e "  ${GREEN}${ARROW}${NC} 前端端口: ${YELLOW}$FRONTEND_PORT${NC} (从 .env 读取)"
    echo -e "  ${GREEN}${ARROW}${NC} 环境: ${YELLOW}$NODE_ENV${NC}"
    echo ""
    echo -e "${BOLD}模块化架构:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 工具函数: ${YELLOW}scripts/utils.sh${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 服务管理: ${YELLOW}scripts/service-manager.sh${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 日志管理: ${YELLOW}scripts/log-manager.sh${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 数据库管理: ${YELLOW}scripts/database-manager.sh${NC}"
    echo ""
    echo -e "${BOLD}独立脚本:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 独立备份: ${YELLOW}scripts/backup-database.sh${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 独立恢复: ${YELLOW}scripts/restore-database.sh${NC}"
    echo ""
    echo -e "${BOLD}日志和备份:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 日志目录: ${YELLOW}$LOG_DIR${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 备份目录: ${YELLOW}$BACKUP_DIR${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 配置来源: ${YELLOW}.env 环境变量${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 备份格式: PostgreSQL SQL 转储文件（未压缩）"
    echo ""
    echo -e "${BOLD}安全特性:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 进程识别: 仅停止项目相关的Node.js进程"
    echo -e "  ${GREEN}${ARROW}${NC} 确认机制: 停止前预览并确认操作"
    echo -e "  ${GREEN}${ARROW}${NC} 跳过保护: 自动跳过非项目进程"
    echo -e "  ${GREEN}${ARROW}${NC} 优雅停止: 先SIGTERM，超时后SIGKILL"
    echo ""
    echo -e "${BOLD}版本信息:${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 版本: ${YELLOW}2.1 (安全增强版)${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 架构: ${YELLOW}模块化设计，安全进程管理${NC}"
}

# 主菜单
show_menu() {
    clear
    echo -e "${GREEN}${BOLD}                    🚀 项目统一管理脚本 v2.1 🚀${NC}"
    echo -e "${GREEN}${BOLD}                      (安全增强版)${NC}"
    echo ""
    echo -e "${BOLD}服务管理:${NC}"
    echo -e "  ${BOLD}1)${NC} 启动所有服务"
    echo -e "  ${BOLD}2)${NC} 停止所有服务"
    echo -e "  ${BOLD}3)${NC} 重启所有服务"
    echo -e "  ${BOLD}4)${NC} 查看服务状态"
    echo ""
    echo -e "${BOLD}系统管理:${NC}"
    echo -e "  ${BOLD}5)${NC} 日志管理"
    echo -e "  ${BOLD}6)${NC} 数据库管理"
    echo ""
    echo -e "${BOLD}其他:${NC}"
    echo -e "  ${BOLD}7)${NC} 帮助信息"
    echo -e "  ${BOLD}0)${NC} 退出"
    echo ""
}

# 主循环
main() {
    # 显示启动信息
    echo -e "${GREEN}${ROCKET} 项目管理脚本 v2.1 已启动${NC}"
    echo -e "${GREEN}${ARROW} 安全进程管理，保护您的系统${NC}"
    
    while true; do
        show_menu
        echo -e "${YELLOW}${ARROW} 请选择操作: ${NC}"
        read -p "   " choice
        
        case $choice in
            1)
                start_all_services || true
                ;;
            2)
                stop_all_services || true
                ;;
            3)
                restart_all_services || true
                ;;
            4)
                show_service_status || true
                ;;
            5)
                manage_logs || true
                ;;
            6)
                manage_database || true
                ;;
            7)
                show_help || true
                ;;
            0)
                echo -e "\n${GREEN}${EXIT} 再见! 感谢使用项目管理脚本${NC}"
                echo -e "${CYAN}${STAR} 祝您开发愉快！${NC}\n"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选择，请重新输入${NC}"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 检查是否为交互式运行
if [ -t 0 ]; then
    # 交互式运行
    main
else
    # 非交互式运行，显示帮助
    show_help
fi
