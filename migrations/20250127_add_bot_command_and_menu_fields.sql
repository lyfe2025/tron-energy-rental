-- 为 telegram_bots 表添加命令配置和菜单按钮字段
-- 文件: migrations/20250127_add_bot_command_and_menu_fields.sql
-- 创建时间: 2025-01-27
-- 目的: 支持机器人命令配置、菜单按钮、自定义命令等功能

BEGIN;

-- 添加自定义命令字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS custom_commands JSONB DEFAULT NULL;

-- 添加菜单按钮启用状态字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS menu_button_enabled BOOLEAN DEFAULT FALSE;

-- 添加菜单按钮文本字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS menu_button_text VARCHAR(50) DEFAULT '菜单';

-- 添加菜单类型字段（commands 或 web_app）
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS menu_type VARCHAR(20) DEFAULT 'commands';

-- 添加Web App URL字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS web_app_url VARCHAR(500) DEFAULT NULL;

-- 添加菜单命令字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS menu_commands JSONB DEFAULT NULL;

-- 添加网络ID字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS network_id UUID DEFAULT NULL;

-- 添加字段注释
COMMENT ON COLUMN telegram_bots.custom_commands IS '自定义命令配置(JSON格式)，包含命令名、响应消息、启用状态等';
COMMENT ON COLUMN telegram_bots.menu_button_enabled IS '是否启用菜单按钮';
COMMENT ON COLUMN telegram_bots.menu_button_text IS '菜单按钮显示文本';
COMMENT ON COLUMN telegram_bots.menu_type IS '菜单类型：commands(命令列表) 或 web_app(Web应用)';
COMMENT ON COLUMN telegram_bots.web_app_url IS 'Web App应用的URL地址';
COMMENT ON COLUMN telegram_bots.menu_commands IS '菜单命令列表(JSON格式)，包含命令名和描述';
COMMENT ON COLUMN telegram_bots.network_id IS '关联的网络配置ID';

-- 创建获取默认自定义命令的函数
CREATE OR REPLACE FUNCTION get_default_custom_commands() 
RETURNS JSONB AS $$
BEGIN
    RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- 创建获取默认菜单命令的函数
CREATE OR REPLACE FUNCTION get_default_menu_commands() 
RETURNS JSONB AS $$
BEGIN
    RETURN '[
        {
            "command": "start",
            "description": "开始使用机器人"
        },
        {
            "command": "help",
            "description": "获取帮助信息"
        }
    ]'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- 创建自定义命令验证函数
CREATE OR REPLACE FUNCTION validate_custom_commands(commands JSONB) 
RETURNS BOOLEAN AS $$
BEGIN
    -- 如果为空或null，允许
    IF commands IS NULL OR commands = 'null'::jsonb THEN
        RETURN TRUE;
    END IF;
    
    -- 必须是数组
    IF jsonb_typeof(commands) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- 检查数组中每个命令的结构
    -- 每个命令必须有 command, response_message, is_enabled 字段
    DECLARE
        cmd JSONB;
    BEGIN
        FOR cmd IN SELECT jsonb_array_elements(commands)
        LOOP
            IF NOT (cmd ? 'command' AND cmd ? 'response_message' AND cmd ? 'is_enabled') THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 创建菜单命令验证函数
CREATE OR REPLACE FUNCTION validate_menu_commands(commands JSONB) 
RETURNS BOOLEAN AS $$
BEGIN
    -- 如果为空或null，允许
    IF commands IS NULL OR commands = 'null'::jsonb THEN
        RETURN TRUE;
    END IF;
    
    -- 必须是数组
    IF jsonb_typeof(commands) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- 检查数组中每个命令的结构
    -- 每个命令必须有 command, description 字段
    DECLARE
        cmd JSONB;
    BEGIN
        FOR cmd IN SELECT jsonb_array_elements(commands)
        LOOP
            IF NOT (cmd ? 'command' AND cmd ? 'description') THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 添加约束确保字段值的有效性
ALTER TABLE telegram_bots 
ADD CONSTRAINT check_menu_type_valid 
CHECK (menu_type IN ('commands', 'web_app'));

ALTER TABLE telegram_bots 
ADD CONSTRAINT check_custom_commands_format 
CHECK (custom_commands IS NULL OR validate_custom_commands(custom_commands));

ALTER TABLE telegram_bots 
ADD CONSTRAINT check_menu_commands_format 
CHECK (menu_commands IS NULL OR validate_menu_commands(menu_commands));

-- Web App URL约束：如果菜单类型是web_app且启用了菜单按钮，则必须提供URL
ALTER TABLE telegram_bots 
ADD CONSTRAINT check_web_app_url_required 
CHECK (
    NOT (menu_button_enabled = TRUE AND menu_type = 'web_app') 
    OR web_app_url IS NOT NULL
);

-- 为现有的机器人设置默认菜单命令
UPDATE telegram_bots 
SET menu_commands = get_default_menu_commands()
WHERE menu_commands IS NULL;

-- 为现有的机器人设置默认自定义命令
UPDATE telegram_bots 
SET custom_commands = get_default_custom_commands()
WHERE custom_commands IS NULL;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_telegram_bots_custom_commands_gin 
ON telegram_bots USING gin (custom_commands);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_menu_commands_gin 
ON telegram_bots USING gin (menu_commands);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_menu_button_enabled 
ON telegram_bots (menu_button_enabled);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_menu_type 
ON telegram_bots (menu_type);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_network_id 
ON telegram_bots (network_id);

-- 更新机器人视图以包含新字段
DROP VIEW IF EXISTS bots_with_keyboard_config;

CREATE OR REPLACE VIEW bots_with_extended_config AS
SELECT 
    id,
    bot_name as name,
    bot_username as username,
    CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
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
    created_at,
    updated_at
FROM telegram_bots;

-- 为新视图和函数添加注释
COMMENT ON VIEW bots_with_extended_config IS '带有扩展配置的机器人视图，包含键盘配置、命令配置、菜单按钮等';
COMMENT ON FUNCTION get_default_custom_commands() IS '获取默认的自定义命令配置';
COMMENT ON FUNCTION get_default_menu_commands() IS '获取默认的菜单命令配置';
COMMENT ON FUNCTION validate_custom_commands(JSONB) IS '验证自定义命令JSON结构是否正确';
COMMENT ON FUNCTION validate_menu_commands(JSONB) IS '验证菜单命令JSON结构是否正确';

COMMIT;
