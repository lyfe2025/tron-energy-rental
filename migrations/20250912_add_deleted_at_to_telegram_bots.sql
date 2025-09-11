-- 为 telegram_bots 表添加软删除字段
-- 文件: migrations/20250912_add_deleted_at_to_telegram_bots.sql
-- 创建时间: 2025-09-12
-- 目的: 支持机器人软删除功能，允许逻辑删除而不是物理删除

BEGIN;

-- 添加 deleted_at 字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 添加字段注释
COMMENT ON COLUMN telegram_bots.deleted_at IS '软删除时间戳，NULL表示未删除，有值表示删除时间';

-- 创建索引以优化软删除相关查询
CREATE INDEX IF NOT EXISTS idx_telegram_bots_deleted_at 
ON telegram_bots (deleted_at);

-- 创建复合索引以优化活跃状态和删除状态的查询
CREATE INDEX IF NOT EXISTS idx_telegram_bots_active_deleted 
ON telegram_bots (is_active, deleted_at);

-- 更新已有的视图以包含软删除字段
DROP VIEW IF EXISTS bots_with_extended_config;

CREATE OR REPLACE VIEW bots_with_extended_config AS
SELECT 
    id,
    bot_name as name,
    bot_username as username,
    CASE 
        WHEN deleted_at IS NOT NULL THEN 'deleted'
        WHEN is_active THEN 'active' 
        ELSE 'inactive' 
    END as status,
    work_mode,
    network_id,
    description,
    welcome_message,
    help_message,
    keyboard_config,
    keyboard_config->'main_menu'->>'is_enabled' AS main_menu_enabled,
    CASE 
        WHEN keyboard_config->'main_menu'->'rows' IS NOT NULL 
        THEN jsonb_array_length(keyboard_config->'main_menu'->'rows') 
        ELSE 0 
    END AS menu_rows_count,
    custom_commands,
    CASE 
        WHEN custom_commands IS NOT NULL 
        THEN jsonb_array_length(custom_commands) 
        ELSE 0 
    END AS custom_commands_count,
    menu_button_enabled,
    menu_button_text,
    menu_type,
    web_app_url,
    menu_commands,
    CASE 
        WHEN menu_commands IS NOT NULL 
        THEN jsonb_array_length(menu_commands) 
        ELSE 0 
    END AS menu_commands_count,
    is_active,
    deleted_at,
    created_at,
    updated_at
FROM telegram_bots;

-- 更新视图注释
COMMENT ON VIEW bots_with_extended_config IS '带有扩展配置的机器人视图，包含键盘配置、命令配置、菜单按钮、软删除状态等';

-- 创建用于查询未删除机器人的视图
CREATE OR REPLACE VIEW active_bots AS
SELECT *
FROM telegram_bots
WHERE deleted_at IS NULL;

-- 添加视图注释
COMMENT ON VIEW active_bots IS '仅显示未被软删除的机器人';

-- 创建用于查询已删除机器人的视图
CREATE OR REPLACE VIEW deleted_bots AS
SELECT *
FROM telegram_bots
WHERE deleted_at IS NOT NULL;

-- 添加视图注释
COMMENT ON VIEW deleted_bots IS '仅显示已被软删除的机器人';

COMMIT;
