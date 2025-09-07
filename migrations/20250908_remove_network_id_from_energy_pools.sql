-- 移除energy_pools表的network_id字段
-- 创建时间: 2025-09-08
-- 说明: 根据业务需求，账户应该支持所有网络，不再需要network_id字段

BEGIN;

-- 1. 首先删除外键约束
ALTER TABLE energy_pools DROP CONSTRAINT IF EXISTS energy_pools_network_id_fkey;

-- 2. 删除相关索引（如果存在）
DROP INDEX IF EXISTS idx_energy_pools_network_id;

-- 3. 删除network_id字段
ALTER TABLE energy_pools DROP COLUMN IF EXISTS network_id;

-- 4. 验证修改结果
DO $$
BEGIN
    -- 检查字段是否已被删除
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'energy_pools' 
        AND column_name = 'network_id'
    ) THEN
        RAISE EXCEPTION 'network_id字段删除失败';
    END IF;
    
    RAISE NOTICE 'network_id字段已成功从energy_pools表中删除';
END $$;

COMMIT;

-- 记录迁移完成
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('20250908_remove_network_id_from_energy_pools', NOW())
ON CONFLICT (version) DO NOTHING;