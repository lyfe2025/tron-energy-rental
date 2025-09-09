-- 为价格配置表添加内嵌键盘配置字段
-- 文件: migrations/20250127_add_inline_keyboard_to_price_configs.sql

-- 添加内嵌键盘配置字段
ALTER TABLE price_configs 
ADD COLUMN IF NOT EXISTS inline_keyboard_config JSONB DEFAULT NULL;

-- 为内嵌键盘配置字段添加注释
COMMENT ON COLUMN price_configs.inline_keyboard_config IS '内嵌键盘配置(JSON格式)，用于生成Telegram Bot的内嵌键盘选项';

-- 创建内嵌键盘配置验证函数
CREATE OR REPLACE FUNCTION validate_inline_keyboard_config(config JSONB) 
RETURNS BOOLEAN AS $$
BEGIN
    -- 允许NULL值
    IF config IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- 检查基本结构
    IF NOT (config ? 'enabled') THEN
        RETURN FALSE;
    END IF;
    
    -- 如果启用了内嵌键盘，检查必要字段
    IF (config->>'enabled')::boolean = TRUE THEN
        -- 检查是否有keyboard_type字段
        IF NOT (config ? 'keyboard_type') THEN
            RETURN FALSE;
        END IF;
        
        -- 检查是否有buttons数组
        IF NOT (config ? 'buttons') OR NOT (jsonb_typeof(config->'buttons') = 'array') THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 添加约束确保内嵌键盘配置格式正确
ALTER TABLE price_configs 
ADD CONSTRAINT check_inline_keyboard_config_format 
CHECK (inline_keyboard_config IS NULL OR validate_inline_keyboard_config(inline_keyboard_config));

-- 创建GIN索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_price_configs_inline_keyboard_gin 
ON price_configs USING gin (inline_keyboard_config);

-- 为不同模式类型创建默认的内嵌键盘配置
-- 笔数套餐的默认配置
UPDATE price_configs 
SET inline_keyboard_config = '{
    "enabled": true,
    "keyboard_type": "transaction_count_selection",
    "title": "🔥 笔数套餐服务",
    "description": "请选择您需要的交易笔数，按钮显示在此文本下方：",
    "buttons_per_row": 1,
    "buttons": [
        {
            "text": "1笔 - 100 TRX",
            "callback_data": "transaction_package_1",
            "transaction_count": 1,
            "price": 100,
            "description": "单笔交易，适合临时使用"
        },
        {
            "text": "5笔 - 450 TRX", 
            "callback_data": "transaction_package_5",
            "transaction_count": 5,
            "price": 450,
            "description": "5笔套餐，节省50 TRX"
        },
        {
            "text": "10笔 - 850 TRX",
            "callback_data": "transaction_package_10", 
            "transaction_count": 10,
            "price": 850,
            "description": "10笔套餐，节省150 TRX"
        },
        {
            "text": "20笔 - 1600 TRX",
            "callback_data": "transaction_package_20",
            "transaction_count": 20, 
            "price": 1600,
            "description": "20笔套餐，节省400 TRX"
        },
        {
            "text": "50笔 - 3750 TRX",
            "callback_data": "transaction_package_50",
            "transaction_count": 50,
            "price": 3750,
            "description": "50笔套餐，节省1250 TRX"
        }
    ],
    "next_message": "请输入能量接收地址",
    "validation": {
        "address_required": true,
        "min_transaction_count": 1,
        "max_transaction_count": 50
    }
}'::jsonb
WHERE mode_type = 'transaction_package' AND inline_keyboard_config IS NULL;

-- VIP套餐的默认配置
UPDATE price_configs 
SET inline_keyboard_config = '{
    "enabled": true,
    "keyboard_type": "vip_package_selection",
    "title": "💎 VIP套餐服务",
    "description": "请选择适合您的VIP套餐，按钮显示在此文本下方：",
    "buttons_per_row": 1,
    "buttons": [
        {
            "text": "💎 VIP 基础版 - 30天",
            "callback_data": "vip_package_basic",
            "package_type": "basic",
            "duration_days": 30,
            "price": 1000,
            "features": ["优先处理", "基础折扣", "专属客服"]
        },
        {
            "text": "👑 VIP 高级版 - 30天",
            "callback_data": "vip_package_premium", 
            "package_type": "premium",
            "duration_days": 30,
            "price": 2000,
            "features": ["优先处理", "高级折扣", "专属客服", "免费技术支持"]
        },
        {
            "text": "🌟 VIP 至尊版 - 30天",
            "callback_data": "vip_package_supreme",
            "package_type": "supreme", 
            "duration_days": 30,
            "price": 3500,
            "features": ["最高优先级", "最大折扣", "专属客服", "免费技术支持", "定制服务"]
        }
    ],
    "next_message": "请输入能量接收地址",
    "validation": {
        "address_required": true
    }
}'::jsonb
WHERE mode_type = 'vip_package' AND inline_keyboard_config IS NULL;

-- 能量闪租的默认配置（可选择能量数量）
UPDATE price_configs 
SET inline_keyboard_config = '{
    "enabled": false,
    "keyboard_type": "energy_amount_selection",
    "title": "选择能量数量",
    "description": "请选择您需要的能量数量",
    "buttons": [],
    "next_message": "请输入能量接收地址",
    "validation": {
        "address_required": true
    }
}'::jsonb
WHERE mode_type = 'energy_flash' AND inline_keyboard_config IS NULL;

-- TRX闪兑的默认配置（可选择兑换方向）
UPDATE price_configs 
SET inline_keyboard_config = '{
    "enabled": true,
    "keyboard_type": "exchange_direction_selection",
    "title": "🔄 TRX闪兑服务",
    "description": "请选择您要进行的兑换类型，按钮显示在此文本下方：",
    "buttons_per_row": 1,
    "buttons": [
        {
            "text": "💱 USDT → TRX",
            "callback_data": "trx_exchange_usdt_to_trx",
            "exchange_type": "usdt_to_trx",
            "description": "将USDT兑换为TRX"
        },
        {
            "text": "💱 TRX → USDT", 
            "callback_data": "trx_exchange_trx_to_usdt",
            "exchange_type": "trx_to_usdt",
            "description": "将TRX兑换为USDT"
        }
    ],
    "next_message": "请输入兑换数量",
    "validation": {
        "amount_required": true,
        "min_amount": 10
    }
}'::jsonb
WHERE mode_type = 'trx_exchange' AND inline_keyboard_config IS NULL;

-- 创建视图以便于查询带内嵌键盘配置的价格配置
CREATE OR REPLACE VIEW price_configs_with_inline_keyboard AS
SELECT 
    id,
    mode_type,
    name,
    description,
    config,
    inline_keyboard_config,
    inline_keyboard_config->>'enabled' AS inline_keyboard_enabled,
    inline_keyboard_config->>'keyboard_type' AS keyboard_type,
    jsonb_array_length(inline_keyboard_config->'buttons') AS button_count,
    is_active,
    created_by,
    created_at,
    updated_at
FROM price_configs
WHERE inline_keyboard_config IS NOT NULL;

-- 为相关对象添加注释
COMMENT ON VIEW price_configs_with_inline_keyboard IS '带有内嵌键盘配置的价格配置视图，便于管理和查询';
COMMENT ON FUNCTION validate_inline_keyboard_config(JSONB) IS '验证内嵌键盘配置JSON结构是否正确';

-- 创建辅助函数：获取指定模式类型的内嵌键盘配置
CREATE OR REPLACE FUNCTION get_inline_keyboard_config(p_mode_type VARCHAR(50)) 
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT inline_keyboard_config INTO result
    FROM price_configs 
    WHERE mode_type = p_mode_type AND is_active = TRUE
    LIMIT 1;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_inline_keyboard_config(VARCHAR) IS '获取指定模式类型的内嵌键盘配置';
