-- 为 telegram_bots 表添加键盘配置字段
-- 文件: migrations/20250127_add_keyboard_config_to_bots.sql

-- 添加键盘配置字段
ALTER TABLE telegram_bots 
ADD COLUMN IF NOT EXISTS keyboard_config JSONB DEFAULT NULL;

-- 为键盘配置字段添加注释
COMMENT ON COLUMN telegram_bots.keyboard_config IS '机器人键盘配置(JSON格式)，包含主菜单、内联键盘、回复键盘等配置';

-- 创建默认键盘配置的辅助函数
CREATE OR REPLACE FUNCTION get_default_keyboard_config() 
RETURNS JSONB AS $$
BEGIN
    RETURN '{
        "main_menu": {
            "type": "inline",
            "title": "主菜单",
            "description": "机器人主菜单键盘",
            "is_enabled": true,
            "rows": [
                {
                    "is_enabled": true,
                    "buttons": [
                        {
                            "text": "⚡ 能量闪租",
                            "callback_data": "energy_flash",
                            "is_enabled": true,
                            "price_config_dependency": "energy_flash"
                        },
                        {
                            "text": "🔥 笔数套餐", 
                            "callback_data": "transaction_package",
                            "is_enabled": true,
                            "price_config_dependency": "transaction_package"
                        }
                    ]
                },
                {
                    "is_enabled": true,
                    "buttons": [
                        {
                            "text": "🔄 TRX闪兑",
                            "callback_data": "trx_exchange",
                            "is_enabled": true,
                            "price_config_dependency": "trx_exchange"
                        }
                    ]
                },
                {
                    "is_enabled": true,
                    "buttons": [
                        {
                            "text": "📋 我的订单",
                            "callback_data": "my_orders",
                            "is_enabled": true
                        },
                        {
                            "text": "❓ 帮助支持",
                            "callback_data": "help_support", 
                            "is_enabled": true
                        }
                    ]
                }
            ]
        },
        "inline_keyboards": {},
        "reply_keyboards": {},
        "quick_actions": []
    }'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- 为现有的机器人添加默认键盘配置
UPDATE telegram_bots 
SET keyboard_config = get_default_keyboard_config()
WHERE keyboard_config IS NULL;

-- 创建键盘配置验证函数
CREATE OR REPLACE FUNCTION validate_keyboard_config(config JSONB) 
RETURNS BOOLEAN AS $$
BEGIN
    -- 检查必要字段是否存在
    IF config IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 检查main_menu是否存在
    IF NOT (config ? 'main_menu') THEN
        RETURN FALSE;
    END IF;
    
    -- 检查main_menu的基本结构
    IF NOT (config->'main_menu' ? 'type' AND 
            config->'main_menu' ? 'is_enabled' AND 
            config->'main_menu' ? 'rows') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 添加约束确保键盘配置格式正确
ALTER TABLE telegram_bots 
ADD CONSTRAINT check_keyboard_config_format 
CHECK (keyboard_config IS NULL OR validate_keyboard_config(keyboard_config));

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_telegram_bots_keyboard_config_gin 
ON telegram_bots USING gin (keyboard_config);

-- 添加视图以便于查询带键盘配置的机器人
CREATE OR REPLACE VIEW bots_with_keyboard_config AS
SELECT 
    id,
    name,
    username,
    status,
    work_mode,
    network_id,
    keyboard_config,
    keyboard_config->'main_menu'->>'is_enabled' AS main_menu_enabled,
    jsonb_array_length(keyboard_config->'main_menu'->'rows') AS menu_rows_count,
    created_at,
    updated_at
FROM telegram_bots
WHERE keyboard_config IS NOT NULL;

-- 为键盘配置相关查询创建注释
COMMENT ON VIEW bots_with_keyboard_config IS '带有键盘配置的机器人视图，便于管理和查询';
COMMENT ON FUNCTION get_default_keyboard_config() IS '获取默认的机器人键盘配置';
COMMENT ON FUNCTION validate_keyboard_config(JSONB) IS '验证键盘配置JSON结构是否正确';
