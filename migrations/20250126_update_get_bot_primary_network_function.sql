-- 更新get_bot_primary_network函数以使用telegram_bots表的network_configurations字段
-- 创建时间: 2025-01-26
-- 作者: 表结构优化项目

-- 删除旧函数
DROP FUNCTION IF EXISTS get_bot_primary_network(UUID);

-- 创建新的get_bot_primary_network函数
CREATE OR REPLACE FUNCTION get_bot_primary_network(p_bot_id UUID)
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
        tb.id as bot_id,
        (nc->>'network_id')::UUID as network_id,
        tn.name as network_name,
        tn.network_type as network_type,
        tn.rpc_url as rpc_url,
        nc as config
    FROM telegram_bots tb
    CROSS JOIN LATERAL jsonb_array_elements(tb.network_configurations) AS nc
    LEFT JOIN tron_networks tn ON (nc->>'network_id')::UUID = tn.id
    WHERE tb.id = p_bot_id
        AND (nc->>'is_active')::BOOLEAN = true
        AND (nc->>'is_primary')::BOOLEAN = true
        AND tn.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 添加函数注释
COMMENT ON FUNCTION get_bot_primary_network(UUID) IS '获取机器人的主要网络配置信息，从telegram_bots表的network_configurations字段读取';