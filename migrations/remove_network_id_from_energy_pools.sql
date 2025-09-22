-- 移除能量池表的网络字段迁移脚本
-- 创建时间: 2025-09-22
-- 目的: 根据业务需求，能量池账户不需要区分网络，移除network_id字段

BEGIN;

-- 1. 记录当前约束和索引信息（用于回滚参考）
DO $$
BEGIN
    RAISE NOTICE '开始移除能量池表的网络字段...';
    RAISE NOTICE '当前时间: %', NOW();
    
    -- 显示将要删除的约束
    RAISE NOTICE '将要删除的外键约束: fk_energy_pools_tron_networks';
    RAISE NOTICE '将要删除的索引: idx_energy_pools_network_id, idx_energy_pools_network_priority';
    RAISE NOTICE '将要删除的字段: network_id';
END $$;

-- 2. 删除相关索引
DROP INDEX IF EXISTS idx_energy_pools_network_id;
DROP INDEX IF EXISTS idx_energy_pools_network_priority;

-- 3. 删除外键约束
ALTER TABLE energy_pools DROP CONSTRAINT IF EXISTS fk_energy_pools_tron_networks;

-- 4. 删除network_id字段
ALTER TABLE energy_pools DROP COLUMN IF EXISTS network_id;

-- 5. 记录操作完成
DO $$
BEGIN
    RAISE NOTICE '✅ 能量池表网络字段移除完成';
    RAISE NOTICE '删除的内容:';
    RAISE NOTICE '  - 字段: network_id';
    RAISE NOTICE '  - 外键约束: fk_energy_pools_tron_networks';
    RAISE NOTICE '  - 索引: idx_energy_pools_network_id';
    RAISE NOTICE '  - 索引: idx_energy_pools_network_priority';
    RAISE NOTICE '完成时间: %', NOW();
END $$;

COMMIT;

-- 验证操作是否成功
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'energy_pools' 
        AND column_name = 'network_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE EXCEPTION '❌ network_id字段仍然存在，迁移失败';
    ELSE
        RAISE NOTICE '✅ 验证成功：network_id字段已成功移除';
    END IF;
END $$;
