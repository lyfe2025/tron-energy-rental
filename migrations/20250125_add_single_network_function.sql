-- 创建设置机器人单网络配置的函数
CREATE OR REPLACE FUNCTION set_bot_single_network_config(
    p_bot_id UUID,
    p_network_config JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    -- 更新机器人的网络配置，替换为单个网络配置
    UPDATE telegram_bots 
    SET 
        network_configurations = JSONB_BUILD_ARRAY(p_network_config),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_bot_id;
    
    -- 检查是否更新成功
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 添加函数注释
COMMENT ON FUNCTION set_bot_single_network_config(UUID, JSONB) IS '设置机器人单网络配置，清空现有配置并设置新的单个网络配置';
