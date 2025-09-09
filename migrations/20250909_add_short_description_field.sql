-- 为 telegram_bots 表添加短描述字段，区分介绍和关于
-- 文件: migrations/20250909_add_short_description_field.sql
-- 创建时间: 2025-09-09
-- 目的: 区分Telegram机器人的介绍(description)和关于(short_description)字段

BEGIN;

-- 添加短描述字段（关于）
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS short_description VARCHAR(120) DEFAULT NULL;

-- 添加字段注释
COMMENT ON COLUMN telegram_bots.description IS '机器人介绍信息（详细描述，对应setMyDescription）';
COMMENT ON COLUMN telegram_bots.short_description IS '机器人关于信息（简短描述，对应setMyShortDescription，最多120字符）';

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_telegram_bots_short_description 
ON telegram_bots (short_description);

-- 更新现有视图以包含新字段
DROP VIEW IF EXISTS bots_with_extended_config;

CREATE OR REPLACE VIEW bots_with_extended_config AS
SELECT 
    id,
    bot_name as name,
    bot_username as username,
    CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
    work_mode,
    network_id,
    description,
    short_description,
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
    created_at,
    updated_at
FROM telegram_bots;

-- 为新视图添加注释
COMMENT ON VIEW bots_with_extended_config IS '带有扩展配置的机器人视图，包含介绍、关于、键盘配置、命令配置、菜单按钮等';

COMMIT;
