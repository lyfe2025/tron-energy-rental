#!/bin/bash

# 日志管理模块
# 负责查看、清理日志文件

# 确保工具函数已加载
if [ -z "$PROJECT_DIR" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/utils.sh"
fi

# 显示日志菜单
show_logs_menu() {
    echo -e "\n${GREEN}${GEAR} === 选择要查看的日志 ===${NC}"
    echo -e "  ${GREEN}${ARROW}${NC} 1) 后端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 2) 前端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 3) 实时后端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 4) 实时前端日志"
    echo -e "  ${GREEN}${ARROW}${NC} 0) 返回主菜单"
    echo ""
    read -p "  请选择: " log_choice
    
    case $log_choice in
        1)
            show_backend_log
            ;;
        2)
            show_frontend_log
            ;;
        3)
            show_backend_log_live
            ;;
        4)
            show_frontend_log_live
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            ;;
    esac
}

# 显示后端日志
show_backend_log() {
    if [ -f "$BACKEND_LOG" ]; then
        echo -e "\n${BLUE}=== 后端日志 ===${NC}"
        cat "$BACKEND_LOG"
    else
        echo -e "${YELLOW}后端日志文件不存在${NC}"
    fi
}

# 显示前端日志
show_frontend_log() {
    if [ -f "$FRONTEND_LOG" ]; then
        echo -e "\n${BLUE}=== 前端日志 ===${NC}"
        cat "$FRONTEND_LOG"
    else
        echo -e "${YELLOW}前端日志文件不存在${NC}"
    fi
}

# 实时显示后端日志
show_backend_log_live() {
    if [ -f "$BACKEND_LOG" ]; then
        echo -e "\n${BLUE}=== 实时后端日志 (按 Ctrl+C 退出) ===${NC}"
        tail -f "$BACKEND_LOG"
    else
        echo -e "${YELLOW}后端日志文件不存在${NC}"
    fi
}

# 实时显示前端日志
show_frontend_log_live() {
    if [ -f "$FRONTEND_LOG" ]; then
        echo -e "\n${BLUE}=== 实时前端日志 (按 Ctrl+C 退出) ===${NC}"
        tail -f "$FRONTEND_LOG"
    else
        echo -e "${YELLOW}前端日志文件不存在${NC}"
    fi
}

# 清理日志文件
clean_logs() {
    echo -e "\n${GREEN}${TRASH} 正在清理日志文件...${NC}"
    
    local cleaned_count=0
    
    if [ -f "$BACKEND_LOG" ]; then
        rm "$BACKEND_LOG"
        echo -e "${GREEN}${CHECK_MARK} 后端日志已清理${NC}"
        cleaned_count=$((cleaned_count + 1))
    fi
    
    if [ -f "$FRONTEND_LOG" ]; then
        rm "$FRONTEND_LOG"
        echo -e "${GREEN}${CHECK_MARK} 前端日志已清理${NC}"
        cleaned_count=$((cleaned_count + 1))
    fi
    
    # 清理其他可能的日志文件
    if [ -d "$LOG_DIR" ]; then
        local other_logs=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null | wc -l)
        if [ "$other_logs" -gt 0 ]; then
            find "$LOG_DIR" -name "*.log" -type f -delete 2>/dev/null
            echo -e "${GREEN}${CHECK_MARK} 清理了 $other_logs 个其他日志文件${NC}"
            cleaned_count=$((cleaned_count + other_logs))
        fi
    fi
    
    if [ $cleaned_count -eq 0 ]; then
        echo -e "${YELLOW}${ARROW} 没有找到需要清理的日志文件${NC}"
    else
        echo -e "\n${GREEN}${CHECK_MARK} 日志清理完成，共清理 $cleaned_count 个文件${NC}"
    fi
}

# 显示日志统计信息
show_log_stats() {
    echo -e "\n${GREEN}${GEAR} === 日志文件统计 ===${NC}"
    
    if [ -f "$BACKEND_LOG" ]; then
        local backend_size=$(du -h "$BACKEND_LOG" | cut -f1)
        local backend_lines=$(wc -l < "$BACKEND_LOG" 2>/dev/null || echo "0")
        echo -e "  ${GREEN}${ARROW}${NC} 后端日志: ${YELLOW}$backend_size${NC} (${YELLOW}$backend_lines${NC} 行)"
    else
        echo -e "  ${GREEN}${ARROW}${NC} 后端日志: ${YELLOW}不存在${NC}"
    fi
    
    if [ -f "$FRONTEND_LOG" ]; then
        local frontend_size=$(du -h "$FRONTEND_LOG" | cut -f1)
        local frontend_lines=$(wc -l < "$FRONTEND_LOG" 2>/dev/null || echo "0")
        echo -e "  ${GREEN}${ARROW}${NC} 前端日志: ${YELLOW}$frontend_size${NC} (${YELLOW}$frontend_lines${NC} 行)"
    else
        echo -e "  ${GREEN}${ARROW}${NC} 前端日志: ${YELLOW}不存在${NC}"
    fi
    
    # 统计所有日志文件
    if [ -d "$LOG_DIR" ]; then
        local total_logs=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null | wc -l)
        if [ "$total_logs" -gt 0 ]; then
            local total_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
            echo -e "  ${GREEN}${ARROW}${NC} 日志目录总大小: ${YELLOW}$total_size${NC}"
            echo -e "  ${GREEN}${ARROW}${NC} 日志文件总数: ${YELLOW}$total_logs${NC}"
        fi
    fi
}

# 日志管理主函数
manage_logs() {
    while true; do
        echo -e "\n${GREEN}${GEAR} === 日志管理 ===${NC}"
        echo -e "  ${GREEN}${ARROW}${NC} 1) 查看日志"
        echo -e "  ${GREEN}${ARROW}${NC} 2) 清理日志"
        echo -e "  ${GREEN}${ARROW}${NC} 3) 日志统计"
        echo -e "  ${GREEN}${ARROW}${NC} 0) 返回主菜单"
        echo ""
        read -p "  请选择: " choice
        
        case $choice in
            1)
                show_logs_menu
                ;;
            2)
                clean_logs
                ;;
            3)
                show_log_stats
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}无效选择${NC}"
                ;;
        esac
        
        if [ "$choice" != "0" ]; then
            echo ""
            read -p "按回车键继续..."
        fi
    done
}
