-- 实现机器人和能量池的单网络约束
-- 添加业务逻辑函数和数据库约束
-- 创建时间: 2025-01-26
-- 作者: 单网络配置功能开发

-- 开始事务
BEGIN;

-- ========================================
-- 1. 机器人单网络约束实现
-- ========================================

-- 为机器人添加单网络约束：确保每个机器人只能有一个活跃的网络配置
-- 删除现有的主网络唯一约束，因为我们要实现更严格的单网络约束
DROP INDEX IF EXISTS idx_bot_network_configs_unique_primary;

-- 创建新的唯一约束：每个机器人只能有一个活跃的网络配置
CREATE UNIQUE INDEX idx_bot_network_configs_single_active 
    ON bot_network_configs(bot_id) 
    WHERE is_active = true;

-- 添加触发器函数：确保机器人网络配置的单网络约束
CREATE OR REPLACE FUNCTION enforce_bot_single_network_constraint()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果新记录是活跃的，检查是否已有其他活跃配置
    IF NEW.is_active = true THEN
        -- 检查是否已存在其他活跃的网络配置
        IF EXISTS (
            SELECT 1 FROM bot_network_configs 
            WHERE bot_id = NEW.bot_id 
                AND is_active = true 
                AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'Bot can only have one active network configuration. Bot ID: %', NEW.bot_id;
        END IF;
        
        -- 自动设置为主网络
        NEW.is_primary = true;
    ELSE
        -- 如果不活跃，则不能是主网络
        NEW.is_primary = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_enforce_bot_single_network ON bot_network_configs;
CREATE TRIGGER trigger_enforce_bot_single_network
    BEFORE INSERT OR UPDATE ON bot_network_configs
    FOR EACH ROW
    EXECUTE FUNCTION enforce_bot_single_network_constraint();

-- ========================================
-- 2. 能量池网络配置约束
-- ========================================

-- 为能量池添加网络配置必需约束
-- 注意：能量池已经通过 network_id 字段支持单网络关联
-- 我们添加一些业务逻辑约束

-- 添加触发器函数：验证能量池网络配置
CREATE OR REPLACE FUNCTION validate_energy_pool_network_config()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果状态是 active，必须有网络配置
    IF NEW.status = 'active' AND NEW.network_id IS NULL THEN
        RAISE EXCEPTION 'Active energy pool must have a network configuration. Pool ID: %', NEW.id;
    END IF;
    
    -- 如果有网络配置，验证网络是否存在且活跃
    IF NEW.network_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM tron_networks 
            WHERE id = NEW.network_id AND is_active = true
        ) THEN
            RAISE EXCEPTION 'Network does not exist or is not active. Network ID: %', NEW.network_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_validate_energy_pool_network ON energy_pools;
CREATE TRIGGER trigger_validate_energy_pool_network
    BEFORE INSERT OR UPDATE ON energy_pools
    FOR EACH ROW
    EXECUTE FUNCTION validate_energy_pool_network_config();

-- ========================================
-- 3. 业务逻辑函数
-- ========================================

-- 函数：设置机器人的网络配置（单网络）
CREATE OR REPLACE FUNCTION set_bot_network_config(
    p_bot_id UUID,
    p_network_id UUID,
    p_config JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- 验证机器人是否存在
    IF NOT EXISTS (SELECT 1 FROM telegram_bots WHERE id = p_bot_id) THEN
        RAISE EXCEPTION 'Bot does not exist. Bot ID: %', p_bot_id;
    END IF;
    
    -- 验证网络是否存在且活跃
    IF NOT EXISTS (SELECT 1 FROM tron_networks WHERE id = p_network_id AND is_active = true) THEN
        RAISE EXCEPTION 'Network does not exist or is not active. Network ID: %', p_network_id;
    END IF;
    
    -- 删除现有的所有网络配置
    DELETE FROM bot_network_configs WHERE bot_id = p_bot_id;
    
    -- 创建新的网络配置
    INSERT INTO bot_network_configs (
        bot_id, network_id, is_active, is_primary, priority, config
    ) VALUES (
        p_bot_id, p_network_id, true, true, 100, p_config
    ) RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- 函数：获取机器人的当前网络配置
CREATE OR REPLACE FUNCTION get_bot_current_network(
    p_bot_id UUID
)
RETURNS TABLE (
    config_id UUID,
    network_id UUID,
    network_name VARCHAR,
    network_type VARCHAR,
    rpc_url VARCHAR,
    chain_id BIGINT,
    is_active BOOLEAN,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bnc.id,
        bnc.network_id,
        tn.name,
        tn.network_type,
        tn.rpc_url,
        tn.chain_id,
        bnc.is_active,
        bnc.config
    FROM bot_network_configs bnc
    JOIN tron_networks tn ON bnc.network_id = tn.id
    WHERE bnc.bot_id = p_bot_id 
        AND bnc.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 函数：设置能量池的网络配置
CREATE OR REPLACE FUNCTION set_energy_pool_network(
    p_pool_id UUID,
    p_network_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 验证能量池是否存在
    IF NOT EXISTS (SELECT 1 FROM energy_pools WHERE id = p_pool_id) THEN
        RAISE EXCEPTION 'Energy pool does not exist. Pool ID: %', p_pool_id;
    END IF;
    
    -- 验证网络是否存在且活跃
    IF p_network_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM tron_networks WHERE id = p_network_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Network does not exist or is not active. Network ID: %', p_network_id;
    END IF;
    
    -- 更新能量池的网络配置
    UPDATE energy_pools 
    SET 
        network_id = p_network_id,
        updated_at = NOW()
    WHERE id = p_pool_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 函数：批量设置能量池网络配置
CREATE OR REPLACE FUNCTION batch_set_energy_pools_network(
    p_pool_ids UUID[],
    p_network_id UUID
)
RETURNS TABLE (
    pool_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_pool_id UUID;
    v_error_msg TEXT;
BEGIN
    -- 验证网络是否存在且活跃
    IF p_network_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM tron_networks WHERE id = p_network_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Network does not exist or is not active. Network ID: %', p_network_id;
    END IF;
    
    -- 遍历每个能量池ID
    FOREACH v_pool_id IN ARRAY p_pool_ids
    LOOP
        BEGIN
            -- 验证能量池是否存在
            IF NOT EXISTS (SELECT 1 FROM energy_pools WHERE id = v_pool_id) THEN
                pool_id := v_pool_id;
                success := false;
                error_message := 'Energy pool does not exist';
                RETURN NEXT;
                CONTINUE;
            END IF;
            
            -- 更新能量池的网络配置
            UPDATE energy_pools 
            SET 
                network_id = p_network_id,
                updated_at = NOW()
            WHERE id = v_pool_id;
            
            pool_id := v_pool_id;
            success := true;
            error_message := NULL;
            RETURN NEXT;
            
        EXCEPTION WHEN OTHERS THEN
            pool_id := v_pool_id;
            success := false;
            error_message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 函数：获取网络统计信息
CREATE OR REPLACE FUNCTION get_network_statistics(
    p_network_id UUID DEFAULT NULL
)
RETURNS TABLE (
    network_id UUID,
    network_name VARCHAR,
    network_type VARCHAR,
    bot_count BIGINT,
    energy_pool_count BIGINT,
    active_energy_pool_count BIGINT,
    total_available_energy BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id,
        tn.name,
        tn.network_type,
        COALESCE(bot_stats.bot_count, 0) as bot_count,
        COALESCE(pool_stats.pool_count, 0) as energy_pool_count,
        COALESCE(pool_stats.active_pool_count, 0) as active_energy_pool_count,
        COALESCE(pool_stats.total_energy, 0) as total_available_energy
    FROM tron_networks tn
    LEFT JOIN (
        SELECT 
            bnc.network_id,
            COUNT(*) as bot_count
        FROM bot_network_configs bnc
        WHERE bnc.is_active = true
        GROUP BY bnc.network_id
    ) bot_stats ON tn.id = bot_stats.network_id
    LEFT JOIN (
        SELECT 
            ep.network_id,
            COUNT(*) as pool_count,
            COUNT(CASE WHEN ep.status = 'active' THEN 1 END) as active_pool_count,
            SUM(CASE WHEN ep.status = 'active' THEN ep.available_energy ELSE 0 END) as total_energy
        FROM energy_pools ep
        WHERE ep.network_id IS NOT NULL
        GROUP BY ep.network_id
    ) pool_stats ON tn.id = pool_stats.network_id
    WHERE tn.is_active = true
        AND (p_network_id IS NULL OR tn.id = p_network_id)
    ORDER BY tn.priority DESC, tn.name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. 数据迁移和清理
-- ========================================

-- 清理机器人的重复网络配置，只保留优先级最高的一个
WITH ranked_configs AS (
    SELECT 
        id,
        bot_id,
        ROW_NUMBER() OVER (
            PARTITION BY bot_id 
            ORDER BY 
                is_primary DESC, 
                priority DESC, 
                created_at ASC
        ) as rn
    FROM bot_network_configs
    WHERE is_active = true
)
DELETE FROM bot_network_configs 
WHERE id IN (
    SELECT id FROM ranked_configs WHERE rn > 1
);

-- 更新保留的配置为主网络
UPDATE bot_network_configs 
SET 
    is_primary = true,
    priority = 100,
    updated_at = NOW()
WHERE is_active = true;

-- 提交事务
COMMIT;

-- ========================================
-- 5. 验证迁移结果
-- ========================================

-- 验证机器人网络配置约束
SELECT 
    'Bot Network Configs' as table_name,
    COUNT(*) as total_configs,
    COUNT(DISTINCT bot_id) as unique_bots,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_configs
FROM bot_network_configs;

-- 验证能量池网络配置
SELECT 
    'Energy Pools' as table_name,
    COUNT(*) as total_pools,
    COUNT(CASE WHEN network_id IS NOT NULL THEN 1 END) as pools_with_network,
    COUNT(CASE WHEN status = 'active' AND network_id IS NOT NULL THEN 1 END) as active_pools_with_network
FROM energy_pools;

-- 验证网络统计
SELECT * FROM get_network_statistics();