-- 清理旧的bot_network_configs表和相关函数
-- 在确认新的合并方案工作正常后执行此脚本
-- 创建时间: 2025-01-25
-- 作者: 表结构优化项目

-- 开始事务
BEGIN;

-- 1. 删除旧的函数（如果存在）
DROP FUNCTION IF EXISTS get_bot_primary_network(UUID);
DROP FUNCTION IF EXISTS get_bot_network_configs(UUID);
DROP FUNCTION IF EXISTS update_bot_network_sync_status(UUID, UUID, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS increment_bot_network_error_count(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reset_bot_network_error_count(UUID, UUID);

-- 2. 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS update_bot_network_configs_updated_at ON bot_network_configs;
DROP TRIGGER IF EXISTS validate_bot_network_primary_constraint ON bot_network_configs;

-- 3. 删除旧的索引（如果存在）
DROP INDEX IF EXISTS idx_bot_network_configs_bot_id;
DROP INDEX IF EXISTS idx_bot_network_configs_network_id;
DROP INDEX IF EXISTS idx_bot_network_configs_is_active;
DROP INDEX IF EXISTS idx_bot_network_configs_is_primary;
DROP INDEX IF EXISTS idx_bot_network_configs_priority;
DROP INDEX IF EXISTS idx_bot_network_configs_sync_status;
DROP INDEX IF EXISTS idx_bot_network_configs_last_sync;
DROP INDEX IF EXISTS idx_bot_network_configs_error_count;
DROP INDEX IF EXISTS idx_bot_network_configs_composite;

-- 4. 删除bot_network_configs表
DROP TABLE IF EXISTS bot_network_configs CASCADE;

-- 5. 重命名新函数，去掉_v2后缀
ALTER FUNCTION get_bot_primary_network_v2(UUID) RENAME TO get_bot_primary_network;
ALTER FUNCTION get_bot_network_configs_v2(UUID) RENAME TO get_bot_network_configs;
ALTER FUNCTION add_bot_network_config_v2(UUID, UUID, BOOLEAN, BOOLEAN, INTEGER, JSONB, JSONB, JSONB, JSONB, JSONB) RENAME TO add_bot_network_config;
ALTER FUNCTION update_bot_network_config_v2(UUID, UUID, BOOLEAN, BOOLEAN, INTEGER, JSONB, JSONB, JSONB, JSONB, JSONB) RENAME TO update_bot_network_config;
ALTER FUNCTION remove_bot_network_config_v2(UUID, UUID) RENAME TO remove_bot_network_config;

-- 6. 创建新的辅助函数：更新网络同步状态
CREATE OR REPLACE FUNCTION update_bot_network_sync_status(
    p_bot_id UUID,
    p_config_id UUID,
    p_sync_status VARCHAR,
    p_error_info JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_found BOOLEAN := false;
BEGIN
    UPDATE telegram_bots 
    SET network_configurations = (
        SELECT jsonb_agg(
            CASE 
                WHEN (config->>'id')::UUID = p_config_id THEN
                    config ||
                    jsonb_build_object(
                        'sync_status', p_sync_status,
                        'last_sync_at', NOW(),
                        'last_error', COALESCE(p_error_info->>'message', NULL),
                        'last_error_at', CASE WHEN p_error_info IS NOT NULL THEN NOW() ELSE config->'last_error_at' END,
                        'error_count', CASE 
                            WHEN p_error_info IS NOT NULL THEN COALESCE((config->>'error_count')::integer, 0) + 1
                            ELSE CASE WHEN p_sync_status = 'success' THEN 0 ELSE COALESCE((config->>'error_count')::integer, 0) END
                        END,
                        'updated_at', NOW()
                    )
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
    
    GET DIAGNOSTICS v_found = FOUND;
    RETURN v_found;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建新的辅助函数：重置错误计数
CREATE OR REPLACE FUNCTION reset_bot_network_error_count(
    p_bot_id UUID,
    p_config_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN update_bot_network_sync_status(p_bot_id, p_config_id, 'success', NULL);
END;
$$ LANGUAGE plpgsql;

-- 8. 创建新的辅助函数：增加错误计数
CREATE OR REPLACE FUNCTION increment_bot_network_error_count(
    p_bot_id UUID,
    p_config_id UUID,
    p_error_message TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN update_bot_network_sync_status(
        p_bot_id, 
        p_config_id, 
        'error', 
        jsonb_build_object('message', p_error_message)
    );
END;
$$ LANGUAGE plpgsql;

-- 9. 添加函数注释
COMMENT ON FUNCTION get_bot_primary_network(UUID) IS '获取机器人的主要网络配置';
COMMENT ON FUNCTION get_bot_network_configs(UUID) IS '获取机器人的所有网络配置';
COMMENT ON FUNCTION add_bot_network_config(UUID, UUID, BOOLEAN, BOOLEAN, INTEGER, JSONB, JSONB, JSONB, JSONB, JSONB) IS '为机器人添加网络配置';
COMMENT ON FUNCTION update_bot_network_config(UUID, UUID, BOOLEAN, BOOLEAN, INTEGER, JSONB, JSONB, JSONB, JSONB, JSONB) IS '更新机器人的网络配置';
COMMENT ON FUNCTION remove_bot_network_config(UUID, UUID) IS '删除机器人的网络配置';
COMMENT ON FUNCTION update_bot_network_sync_status(UUID, UUID, VARCHAR, JSONB) IS '更新网络配置的同步状态';
COMMENT ON FUNCTION reset_bot_network_error_count(UUID, UUID) IS '重置网络配置的错误计数';
COMMENT ON FUNCTION increment_bot_network_error_count(UUID, UUID, TEXT) IS '增加网络配置的错误计数';

-- 提交事务
COMMIT;

-- 验证清理结果
SELECT 
    'cleanup_completed' as status,
    'bot_network_configs table dropped' as message;

-- 验证新函数是否正常工作
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%bot%network%'
ORDER BY routine_name;