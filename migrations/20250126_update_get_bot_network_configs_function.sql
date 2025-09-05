-- 更新get_bot_network_configs函数以使用telegram_bots表的network_configurations字段
-- 创建时间: 2025-01-26
-- 作者: 表结构优化项目

-- 删除旧函数
DROP FUNCTION IF EXISTS get_bot_network_configs(UUID);

-- 创建新的get_bot_network_configs函数
CREATE OR REPLACE FUNCTION get_bot_network_configs(p_bot_id UUID)
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
        (nc->>'id')::UUID as config_id,
        tb.id as bot_id,
        (nc->>'network_id')::UUID as network_id,
        tn.name as network_name,
        tn.network_type as network_type,
        tn.rpc_url as rpc_url,
        (nc->>'is_active')::BOOLEAN as is_active,
        (nc->>'is_primary')::BOOLEAN as is_primary,
        (nc->>'priority')::INTEGER as priority,
        nc as config,
        COALESCE(nc->>'sync_status', 'pending') as sync_status
    FROM telegram_bots tb
    CROSS JOIN LATERAL jsonb_array_elements(tb.network_configurations) AS nc
    LEFT JOIN tron_networks tn ON (nc->>'network_id')::UUID = tn.id
    WHERE tb.id = p_bot_id
    ORDER BY (nc->>'is_primary')::BOOLEAN DESC, (nc->>'priority')::INTEGER DESC, tn.name;
END;
$$ LANGUAGE plpgsql;

-- 添加函数注释
COMMENT ON FUNCTION get_bot_network_configs(UUID) IS '获取机器人的所有网络配置信息，从telegram_bots表的network_configurations字段读取';