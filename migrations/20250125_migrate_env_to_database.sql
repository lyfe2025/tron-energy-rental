-- =====================================================================================
-- 环境变量配置到数据库迁移脚本
-- 创建时间: 2025-01-25
-- 描述: 将现有环境变量配置迁移到数据库表中，实现配置的集中管理
-- =====================================================================================

-- 开始事务
BEGIN;

-- =====================================================================================
-- 1. 插入默认TRON网络配置
-- =====================================================================================

-- 插入主网配置
INSERT INTO tron_networks (
    name, 
    network_type, 
    rpc_url, 
    api_key, 
    chain_id, 
    explorer_url, 
    is_active, 
    is_default, 
    priority, 
    timeout_ms, 
    retry_count, 
    rate_limit_per_second, 
    config, 
    health_check_url, 
    description
) VALUES (
    'TRON主网',
    'mainnet',
    'https://api.trongrid.io',
    NULL, -- 需要手动配置API密钥
    '0x2b6653dc',
    'https://tronscan.org',
    false, -- 默认不激活，需要配置后激活
    false,
    1,
    30000,
    3,
    10,
    '{
        "fullNode": "https://api.trongrid.io",
        "solidityNode": "https://api.trongrid.io",
        "eventServer": "https://api.trongrid.io",
        "features": ["energy_delegation", "bandwidth_delegation", "smart_contracts"]
    }'::jsonb,
    'https://api.trongrid.io/wallet/getnowblock',
    'TRON主网络，用于生产环境'
) ON CONFLICT (name) DO NOTHING;

-- 插入测试网配置（Shasta）
INSERT INTO tron_networks (
    name, 
    network_type, 
    rpc_url, 
    api_key, 
    chain_id, 
    explorer_url, 
    is_active, 
    is_default, 
    priority, 
    timeout_ms, 
    retry_count, 
    rate_limit_per_second, 
    config, 
    health_check_url, 
    description
) VALUES (
    'TRON测试网(Shasta)',
    'testnet',
    'https://api.shasta.trongrid.io',
    NULL, -- 需要手动配置API密钥
    '0x94a9059e',
    'https://shasta.tronscan.org',
    true, -- 默认激活测试网
    true, -- 设为默认网络
    2,
    30000,
    3,
    10,
    '{
        "fullNode": "https://api.shasta.trongrid.io",
        "solidityNode": "https://api.shasta.trongrid.io",
        "eventServer": "https://api.shasta.trongrid.io",
        "features": ["energy_delegation", "bandwidth_delegation", "smart_contracts"]
    }'::jsonb,
    'https://api.shasta.trongrid.io/wallet/getnowblock',
    'TRON测试网络，用于开发和测试环境'
) ON CONFLICT (name) DO NOTHING;

-- =====================================================================================
-- 2. 更新现有机器人配置
-- =====================================================================================

-- 获取默认网络ID
DO $$
DECLARE
    default_network_id INTEGER;
    bot_record RECORD;
BEGIN
    -- 获取默认网络ID
    SELECT id INTO default_network_id 
    FROM tron_networks 
    WHERE is_default = true 
    LIMIT 1;
    
    IF default_network_id IS NULL THEN
        RAISE EXCEPTION '未找到默认TRON网络配置';
    END IF;
    
    -- 更新所有现有机器人的网络配置
    UPDATE telegram_bots SET
        network_config = jsonb_build_object(
            'default_network_id', default_network_id,
            'supported_networks', ARRAY[default_network_id],
            'auto_switch_enabled', false,
            'fallback_network_id', default_network_id
        ),
        webhook_config = jsonb_build_object(
            'url', COALESCE(webhook_url, ''),
            'secret_token', '',
            'max_connections', 40,
            'allowed_updates', ARRAY['message', 'callback_query', 'inline_query']
        ),
        message_templates = jsonb_build_object(
            'welcome', '欢迎使用TRON能量租赁服务！',
            'help', '请选择您需要的服务类型',
            'error', '抱歉，服务暂时不可用，请稍后重试',
            'maintenance', '系统维护中，请稍后重试'
        ),
        rate_limits = jsonb_build_object(
            'messages_per_minute', 20,
            'commands_per_hour', 100,
            'api_calls_per_minute', 30
        ),
        security_settings = jsonb_build_object(
            'enable_whitelist', false,
            'allowed_chat_types', ARRAY['private', 'group'],
            'block_forwarded_messages', false,
            'require_user_verification', false
        ),
        health_status = 'unknown',
        description = COALESCE(description, '系统默认机器人'),
        config = jsonb_build_object(
            'language', 'zh-CN',
            'timezone', 'Asia/Shanghai',
            'features', ARRAY['energy_rental', 'balance_query', 'transaction_history']
        )
    WHERE network_config IS NULL;
    
    -- 为每个机器人创建网络关联配置
    FOR bot_record IN SELECT id FROM telegram_bots LOOP
        INSERT INTO bot_network_configs (
            bot_id,
            network_id,
            is_active,
            is_primary,
            priority,
            config,
            api_settings,
            contract_addresses,
            gas_settings,
            monitoring_settings
        ) VALUES (
            bot_record.id,
            default_network_id,
            true,
            true,
            1,
            '{
                "auto_sync": true,
                "cache_enabled": true,
                "batch_size": 100
            }'::jsonb,
            '{
                "timeout_ms": 30000,
                "retry_count": 3,
                "rate_limit": 10
            }'::jsonb,
            '{
                "energy_contract": "",
                "usdt_contract": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
            }'::jsonb,
            '{
                "gas_price": "auto",
                "gas_limit": 1000000,
                "fee_limit": 100000000
            }'::jsonb,
            '{
                "health_check_interval": 300,
                "alert_on_failure": true,
                "max_consecutive_failures": 3
            }'::jsonb
        ) ON CONFLICT (bot_id, network_id) DO NOTHING;
    END LOOP;
END $$;

-- =====================================================================================
-- 3. 更新现有能量池配置
-- =====================================================================================

-- 更新能量池表，关联到默认网络
DO $$
DECLARE
    default_network_id INTEGER;
BEGIN
    -- 获取默认网络ID
    SELECT id INTO default_network_id 
    FROM tron_networks 
    WHERE is_default = true 
    LIMIT 1;
    
    IF default_network_id IS NULL THEN
        RAISE EXCEPTION '未找到默认TRON网络配置';
    END IF;
    
    -- 更新所有现有能量池
    UPDATE energy_pools SET
        network_id = default_network_id,
        account_name = COALESCE(name, 'Unknown'),
        account_alias = name,
        account_group = 'default',
        config = jsonb_build_object(
            'auto_delegate', true,
            'min_delegate_amount', 1000,
            'max_delegate_amount', 1000000,
            'delegate_duration', 3
        ),
        api_settings = jsonb_build_object(
            'timeout_ms', 30000,
            'retry_count', 3,
            'rate_limit', 5
        ),
        monitoring_settings = jsonb_build_object(
            'balance_check_interval', 300,
            'energy_check_interval', 60,
            'alert_threshold', 0.1
        ),
        security_settings = jsonb_build_object(
            'encryption_enabled', true,
            'key_rotation_days', 90,
            'access_log_enabled', true
        ),
        auto_sync_enabled = true,
        sync_interval_minutes = 5,
        sync_status = 'pending',
        health_status = 'unknown',
        tags = ARRAY['migrated', 'default'],
        metadata = jsonb_build_object(
            'migrated_at', NOW(),
            'migration_version', '1.0',
            'original_config', 'env_variables'
        ),
        is_managed = true
    WHERE network_id IS NULL;
END $$;

-- =====================================================================================
-- 4. 创建系统配置历史记录
-- =====================================================================================

-- 记录迁移操作到审计表
INSERT INTO system_config_history (
    entity_type,
    entity_id,
    operation_type,
    changed_fields,
    new_values,
    old_values,
    change_reason,
    changed_by,
    ip_address,
    session_id,
    severity,
    tags,
    metadata
) VALUES (
    'migration',
    'env_to_db_migration',
    'create',
    ARRAY['tron_networks', 'telegram_bots', 'energy_pools', 'bot_network_configs'],
    '{
        "migration_type": "env_to_database",
        "tables_affected": ["tron_networks", "telegram_bots", "energy_pools", "bot_network_configs"],
        "migration_status": "completed"
    }'::jsonb,
    '{
        "source": "environment_variables",
        "config_files": [".env"]
    }'::jsonb,
    '环境变量配置迁移到数据库',
    'system',
    '127.0.0.1',
    'migration_session_' || extract(epoch from now())::text,
    'info',
    ARRAY['migration', 'env_to_db', 'configuration'],
    jsonb_build_object(
        'migration_date', NOW(),
        'migration_version', '1.0.0',
        'affected_records', (
            SELECT jsonb_build_object(
                'tron_networks', (SELECT COUNT(*) FROM tron_networks),
                'telegram_bots', (SELECT COUNT(*) FROM telegram_bots),
                'energy_pools', (SELECT COUNT(*) FROM energy_pools),
                'bot_network_configs', (SELECT COUNT(*) FROM bot_network_configs)
            )
        )
    )
);

-- =====================================================================================
-- 5. 创建配置验证函数
-- =====================================================================================

-- 验证迁移结果的函数
CREATE OR REPLACE FUNCTION validate_migration_result()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- 检查TRON网络配置
    RETURN QUERY
    SELECT 
        'tron_networks_count'::TEXT,
        CASE WHEN COUNT(*) >= 2 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('网络配置数量: ' || COUNT(*))::TEXT
    FROM tron_networks;
    
    -- 检查默认网络
    RETURN QUERY
    SELECT 
        'default_network_exists'::TEXT,
        CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('默认网络数量: ' || COUNT(*))::TEXT
    FROM tron_networks WHERE is_default = true;
    
    -- 检查机器人网络配置
    RETURN QUERY
    SELECT 
        'bots_network_config'::TEXT,
        CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM telegram_bots) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('已配置网络的机器人数量: ' || COUNT(*) || '/' || (SELECT COUNT(*) FROM telegram_bots))::TEXT
    FROM telegram_bots WHERE network_config IS NOT NULL;
    
    -- 检查能量池网络关联
    RETURN QUERY
    SELECT 
        'energy_pools_network'::TEXT,
        CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM energy_pools) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('已关联网络的能量池数量: ' || COUNT(*) || '/' || (SELECT COUNT(*) FROM energy_pools))::TEXT
    FROM energy_pools WHERE network_id IS NOT NULL;
    
    -- 检查机器人网络关联配置
    RETURN QUERY
    SELECT 
        'bot_network_configs'::TEXT,
        CASE WHEN COUNT(*) >= (SELECT COUNT(*) FROM telegram_bots) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        ('机器人网络关联配置数量: ' || COUNT(*))::TEXT
    FROM bot_network_configs;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- 6. 创建配置管理辅助函数
-- =====================================================================================

-- 获取机器人的网络配置
CREATE OR REPLACE FUNCTION get_bot_network_config(bot_id_param INTEGER)
RETURNS TABLE (
    network_name TEXT,
    network_type TEXT,
    rpc_url TEXT,
    is_active BOOLEAN,
    is_primary BOOLEAN,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.name,
        tn.network_type,
        tn.rpc_url,
        bnc.is_active,
        bnc.is_primary,
        bnc.config
    FROM bot_network_configs bnc
    JOIN tron_networks tn ON bnc.network_id = tn.id
    WHERE bnc.bot_id = bot_id_param
    ORDER BY bnc.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- 获取能量池的网络信息
CREATE OR REPLACE FUNCTION get_energy_pool_network_info(pool_id_param INTEGER)
RETURNS TABLE (
    pool_name TEXT,
    network_name TEXT,
    network_type TEXT,
    rpc_url TEXT,
    account_address TEXT,
    balance_trx DECIMAL,
    balance_energy BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.name,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        ep.tron_address,
        ep.balance_trx,
        ep.balance_energy
    FROM energy_pools ep
    JOIN tron_networks tn ON ep.network_id = tn.id
    WHERE ep.id = pool_id_param;
END;
$$ LANGUAGE plpgsql;

-- 提交事务
COMMIT;

-- =====================================================================================
-- 迁移完成提示
-- =====================================================================================

-- 显示迁移结果
SELECT 
    '🎉 环境变量配置迁移完成！' as message,
    NOW() as completed_at;

-- 显示验证结果
SELECT * FROM validate_migration_result();

-- 显示下一步操作提示
SELECT 
    '📋 下一步操作提示：' as title,
    '1. 更新 .env 文件中的 TRON_API_KEY' as step_1,
    '2. 配置机器人的 webhook_url 和 secret_token' as step_2,
    '3. 验证能量池的私钥加密存储' as step_3,
    '4. 测试网络连接和API调用' as step_4,
    '5. 启用生产环境的主网配置' as step_5;

-- =====================================================================================
-- 脚本结束
-- =====================================================================================