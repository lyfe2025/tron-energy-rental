-- 合并bot_network_configs表到telegram_bots表
-- 将网络配置作为JSONB数组存储在telegram_bots表中
-- 创建时间: 2025-01-25
-- 作者: 表结构优化项目

-- 开始事务
BEGIN;

-- 1. 为telegram_bots表添加网络配置数组字段
ALTER TABLE telegram_bots 
    ADD COLUMN IF NOT EXISTS network_configurations JSONB DEFAULT '[]';

-- 添加字段注释
COMMENT ON COLUMN telegram_bots.network_configurations IS '机器人网络配置数组，包含所有网络的配置信息';

-- 2. 迁移bot_network_configs数据到telegram_bots表
-- 将每个机器人的网络配置聚合为JSONB数组
UPDATE telegram_bots 
SET network_configurations = (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', bnc.id,
                'network_id', bnc.network_id,
                'network_name', tn.name,
                'network_type', tn.network_type,
                'rpc_url', tn.rpc_url,
                'is_active', bnc.is_active,
                'is_primary', bnc.is_primary,
                'priority', bnc.priority,
                'config', bnc.config,
                'api_settings', bnc.api_settings,
                'contract_addresses', bnc.contract_addresses,
                'gas_settings', bnc.gas_settings,
                'monitoring_settings', bnc.monitoring_settings,
                'last_sync_at', bnc.last_sync_at,
                'sync_status', bnc.sync_status,
                'error_count', bnc.error_count,
                'last_error', bnc.last_error,
                'last_error_at', bnc.last_error_at,
                'created_at', bnc.created_at,
                'updated_at', bnc.updated_at
            ) ORDER BY bnc.priority DESC, bnc.is_primary DESC
        ),
        '[]'::jsonb
    )
    FROM bot_network_configs bnc
    LEFT JOIN tron_networks tn ON bnc.network_id = tn.id
    WHERE bnc.bot_id = telegram_bots.id
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_telegram_bots_network_configurations 
    ON telegram_bots USING GIN (network_configurations);

-- 4. 创建函数：获取机器人的主要网络配置
CREATE OR REPLACE FUNCTION get_bot_primary_network_v2(p_bot_id UUID)
RETURNS TABLE (
    bot_id UUID,
    network_id UUID,
    network_name VARCHAR,
    network_type VARCHAR,
    rpc_url VARCHAR,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_bot_id,
        (network_config->>'network_id')::UUID,
        network_config->>'network_name',
        network_config->>'network_type',
        network_config->>'rpc_url',
        network_config->'config'
    FROM telegram_bots tb,
         jsonb_array_elements(tb.network_configurations) AS network_config
    WHERE tb.id = p_bot_id 
        AND (network_config->>'is_active')::boolean = true
        AND (network_config->>'is_primary')::boolean = true;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建函数：获取机器人的所有网络配置
CREATE OR REPLACE FUNCTION get_bot_network_configs_v2(p_bot_id UUID)
RETURNS TABLE (
    config_id UUID,
    bot_id UUID,
    network_id UUID,
    network_name VARCHAR,
    network_type VARCHAR,
    rpc_url VARCHAR,
    is_active BOOLEAN,
    is_primary BOOLEAN,
    priority INTEGER,
    config JSONB,
    sync_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (network_config->>'id')::UUID,
        p_bot_id,
        (network_config->>'network_id')::UUID,
        network_config->>'network_name',
        network_config->>'network_type',
        network_config->>'rpc_url',
        (network_config->>'is_active')::boolean,
        (network_config->>'is_primary')::boolean,
        (network_config->>'priority')::integer,
        network_config->'config',
        network_config->>'sync_status'
    FROM telegram_bots tb,
         jsonb_array_elements(tb.network_configurations) AS network_config
    WHERE tb.id = p_bot_id
    ORDER BY (network_config->>'priority')::integer DESC, 
             (network_config->>'is_primary')::boolean DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建函数：添加网络配置到机器人
CREATE OR REPLACE FUNCTION add_bot_network_config_v2(
    p_bot_id UUID,
    p_network_id UUID,
    p_is_active BOOLEAN DEFAULT true,
    p_is_primary BOOLEAN DEFAULT false,
    p_priority INTEGER DEFAULT 0,
    p_config JSONB DEFAULT '{}',
    p_api_settings JSONB DEFAULT '{}',
    p_contract_addresses JSONB DEFAULT '{}',
    p_gas_settings JSONB DEFAULT '{}',
    p_monitoring_settings JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
    v_network_name VARCHAR;
    v_network_type VARCHAR;
    v_rpc_url VARCHAR;
    v_new_config JSONB;
BEGIN
    -- 生成新的配置ID
    v_config_id := gen_random_uuid();
    
    -- 获取网络信息
    SELECT name, network_type, rpc_url 
    INTO v_network_name, v_network_type, v_rpc_url
    FROM tron_networks 
    WHERE id = p_network_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '网络不存在或未激活: %', p_network_id;
    END IF;
    
    -- 构建新的网络配置
    v_new_config := jsonb_build_object(
        'id', v_config_id,
        'network_id', p_network_id,
        'network_name', v_network_name,
        'network_type', v_network_type,
        'rpc_url', v_rpc_url,
        'is_active', p_is_active,
        'is_primary', p_is_primary,
        'priority', p_priority,
        'config', p_config,
        'api_settings', p_api_settings,
        'contract_addresses', p_contract_addresses,
        'gas_settings', p_gas_settings,
        'monitoring_settings', p_monitoring_settings,
        'last_sync_at', NULL,
        'sync_status', 'pending',
        'error_count', 0,
        'last_error', NULL,
        'last_error_at', NULL,
        'created_at', NOW(),
        'updated_at', NOW()
    );
    
    -- 如果设置为主要网络，先取消其他主要网络
    IF p_is_primary THEN
        UPDATE telegram_bots 
        SET network_configurations = (
            SELECT jsonb_agg(
                CASE 
                    WHEN (config->>'network_id')::UUID = p_network_id 
                    THEN jsonb_set(config, '{is_primary}', 'false')
                    ELSE config
                END
            )
            FROM jsonb_array_elements(network_configurations) AS config
        )
        WHERE id = p_bot_id;
    END IF;
    
    -- 添加新的网络配置
    UPDATE telegram_bots 
    SET network_configurations = 
        COALESCE(network_configurations, '[]'::jsonb) || v_new_config::jsonb,
        updated_at = NOW()
    WHERE id = p_bot_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建函数：更新网络配置
CREATE OR REPLACE FUNCTION update_bot_network_config_v2(
    p_bot_id UUID,
    p_config_id UUID,
    p_is_active BOOLEAN DEFAULT NULL,
    p_is_primary BOOLEAN DEFAULT NULL,
    p_priority INTEGER DEFAULT NULL,
    p_config JSONB DEFAULT NULL,
    p_api_settings JSONB DEFAULT NULL,
    p_contract_addresses JSONB DEFAULT NULL,
    p_gas_settings JSONB DEFAULT NULL,
    p_monitoring_settings JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_found BOOLEAN := false;
BEGIN
    -- 如果设置为主要网络，先取消其他主要网络
    IF p_is_primary THEN
        UPDATE telegram_bots 
        SET network_configurations = (
            SELECT jsonb_agg(
                CASE 
                    WHEN (config->>'id')::UUID != p_config_id 
                    THEN jsonb_set(config, '{is_primary}', 'false')
                    ELSE config
                END
            )
            FROM jsonb_array_elements(network_configurations) AS config
        )
        WHERE id = p_bot_id;
    END IF;
    
    -- 更新指定的网络配置
    UPDATE telegram_bots 
    SET network_configurations = (
        SELECT jsonb_agg(
            CASE 
                WHEN (config->>'id')::UUID = p_config_id THEN
                    config ||
                    jsonb_strip_nulls(jsonb_build_object(
                        'is_active', p_is_active,
                        'is_primary', p_is_primary,
                        'priority', p_priority,
                        'config', p_config,
                        'api_settings', p_api_settings,
                        'contract_addresses', p_contract_addresses,
                        'gas_settings', p_gas_settings,
                        'monitoring_settings', p_monitoring_settings,
                        'updated_at', NOW()
                    ))
                ELSE config
            END
        )
        FROM jsonb_array_elements(network_configurations) AS config
    ),
    updated_at = NOW()
    WHERE id = p_bot_id
    AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(network_configurations) AS config
        WHERE (config->>'id')::UUID = p_config_id
    );
    
    GET DIAGNOSTICS v_found = ROW_COUNT;
    RETURN v_found > 0;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建函数：删除网络配置
CREATE OR REPLACE FUNCTION remove_bot_network_config_v2(
    p_bot_id UUID,
    p_config_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_found BOOLEAN := false;
BEGIN
    UPDATE telegram_bots 
    SET network_configurations = (
        SELECT COALESCE(jsonb_agg(config), '[]'::jsonb)
        FROM jsonb_array_elements(network_configurations) AS config
        WHERE (config->>'id')::UUID != p_config_id
    ),
    updated_at = NOW()
    WHERE id = p_bot_id
    AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(network_configurations) AS config
        WHERE (config->>'id')::UUID = p_config_id
    );
    
    GET DIAGNOSTICS v_found = ROW_COUNT;
    RETURN v_found > 0;
END;
$$ LANGUAGE plpgsql;

-- 提交事务
COMMIT;

-- 验证迁移结果
SELECT 
    'telegram_bots' as table_name,
    COUNT(*) as total_bots,
    COUNT(CASE WHEN jsonb_array_length(network_configurations) > 0 THEN 1 END) as bots_with_networks,
    SUM(jsonb_array_length(network_configurations)) as total_network_configs
FROM telegram_bots;

-- 显示迁移后的数据样例
SELECT 
    tb.id,
    tb.bot_name,
    jsonb_array_length(tb.network_configurations) as network_count,
    tb.network_configurations
FROM telegram_bots tb
WHERE jsonb_array_length(tb.network_configurations) > 0
LIMIT 3;