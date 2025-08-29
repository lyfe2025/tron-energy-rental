-- 添加TRX闪兑配置
-- 创建时间: 2025-08-29
-- 描述: 为价格配置系统添加TRX闪兑功能

-- 插入TRX闪兑配置
INSERT INTO price_configs (
    mode_type,
    name,
    description,
    config,
    is_active,
    created_at,
    updated_at
) VALUES (
    'trx_exchange',
    'TRX闪兑服务',
    'USDT自动兑换TRX服务，支持实时汇率和自动兑换地址',
    '{
        "enabled": true,
        "exchange_address": "TM263fmPZfpjjnN2ec9uVEoNgg23456789",
        "min_amount_usdt": 1,
        "exchange_rates": {
            "usdt_to_trx": 2.6502,
            "trx_to_usdt": 0.0334
        },
        "rate_update_interval": 300,
        "notices": [
            "转U自动回TRX，1U起换",
            "回其他地址联系客服",
            "请不要使用交易所转账，丢失自负"
        ],
        "auto_copy_address": true,
        "customer_service_required": true
    }',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 验证插入结果
SELECT 
    id,
    mode_type,
    name,
    description,
    config,
    is_active
FROM price_configs 
WHERE mode_type = 'trx_exchange';