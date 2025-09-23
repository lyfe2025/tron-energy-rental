-- ========================================================================
-- 移除 energy_pools 表中的实时数据字段迁移
-- 创建日期: 2025年9月23日
-- 目的: 移除需要从TRON网络实时获取的字段，避免数据不一致
-- 
-- 移除的字段：
-- • total_bandwidth - 总带宽资源（从TRON网络实时获取）
-- • available_bandwidth - 可用带宽资源（从TRON网络实时获取）
-- • total_energy - 总能量容量（从TRON网络实时获取）
-- • available_energy - 可用能量数量（从TRON网络实时获取）
-- ========================================================================

BEGIN;

-- 记录迁移开始
DO $$
BEGIN
    RAISE NOTICE '开始移除 energy_pools 表中的实时数据字段...';
    RAISE NOTICE '时间: %', NOW();
END $$;

-- 1. 移除相关索引（如果存在）
DO $$
BEGIN
    -- 移除 total_bandwidth 索引
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_energy_pools_total_bandwidth') THEN
        DROP INDEX idx_energy_pools_total_bandwidth;
        RAISE NOTICE '已移除索引: idx_energy_pools_total_bandwidth';
    ELSE
        RAISE NOTICE '索引 idx_energy_pools_total_bandwidth 不存在，跳过';
    END IF;

    -- 移除 available_bandwidth 索引
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_energy_pools_available_bandwidth') THEN
        DROP INDEX idx_energy_pools_available_bandwidth;
        RAISE NOTICE '已移除索引: idx_energy_pools_available_bandwidth';
    ELSE
        RAISE NOTICE '索引 idx_energy_pools_available_bandwidth 不存在，跳过';
    END IF;

    -- 移除 total_energy 索引（如果存在）
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_energy_pools_total_energy') THEN
        DROP INDEX idx_energy_pools_total_energy;
        RAISE NOTICE '已移除索引: idx_energy_pools_total_energy';
    ELSE
        RAISE NOTICE '索引 idx_energy_pools_total_energy 不存在，跳过';
    END IF;

    -- 移除 available_energy 索引（如果存在）
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_energy_pools_available_energy') THEN
        DROP INDEX idx_energy_pools_available_energy;
        RAISE NOTICE '已移除索引: idx_energy_pools_available_energy';
    ELSE
        RAISE NOTICE '索引 idx_energy_pools_available_energy 不存在，跳过';
    END IF;
END $$;

-- 2. 移除字段注释（清理元数据）
DO $$
BEGIN
    -- 移除字段注释
    COMMENT ON COLUMN energy_pools.total_bandwidth IS NULL;
    COMMENT ON COLUMN energy_pools.available_bandwidth IS NULL;
    COMMENT ON COLUMN energy_pools.total_energy IS NULL;
    COMMENT ON COLUMN energy_pools.available_energy IS NULL;
    RAISE NOTICE '已清理字段注释';
END $$;

-- 3. 移除字段（按照依赖关系顺序）
DO $$
BEGIN
    -- 检查并移除 total_bandwidth 字段
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'energy_pools' AND column_name = 'total_bandwidth') THEN
        ALTER TABLE energy_pools DROP COLUMN total_bandwidth;
        RAISE NOTICE '已移除字段: total_bandwidth';
    ELSE
        RAISE NOTICE '字段 total_bandwidth 不存在，跳过';
    END IF;

    -- 检查并移除 available_bandwidth 字段
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'energy_pools' AND column_name = 'available_bandwidth') THEN
        ALTER TABLE energy_pools DROP COLUMN available_bandwidth;
        RAISE NOTICE '已移除字段: available_bandwidth';
    ELSE
        RAISE NOTICE '字段 available_bandwidth 不存在，跳过';
    END IF;

    -- 检查并移除 total_energy 字段
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'energy_pools' AND column_name = 'total_energy') THEN
        ALTER TABLE energy_pools DROP COLUMN total_energy;
        RAISE NOTICE '已移除字段: total_energy';
    ELSE
        RAISE NOTICE '字段 total_energy 不存在，跳过';
    END IF;

    -- 检查并移除 available_energy 字段
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'energy_pools' AND column_name = 'available_energy') THEN
        ALTER TABLE energy_pools DROP COLUMN available_energy;
        RAISE NOTICE '已移除字段: available_energy';
    ELSE
        RAISE NOTICE '字段 available_energy 不存在，跳过';
    END IF;
END $$;

-- 4. 验证操作结果
DO $$
DECLARE
    remaining_fields TEXT;
BEGIN
    -- 检查是否还有遗留字段
    SELECT string_agg(column_name, ', ')
    INTO remaining_fields
    FROM information_schema.columns 
    WHERE table_name = 'energy_pools' 
    AND column_name IN ('total_bandwidth', 'available_bandwidth', 'total_energy', 'available_energy');

    IF remaining_fields IS NOT NULL THEN
        RAISE EXCEPTION '迁移失败：仍有字段未移除: %', remaining_fields;
    ELSE
        RAISE NOTICE '✓ 验证通过：所有目标字段已成功移除';
    END IF;

    -- 显示当前表结构
    RAISE NOTICE '当前 energy_pools 表字段:';
    FOR remaining_fields IN 
        SELECT column_name || ' (' || data_type || ')' 
        FROM information_schema.columns 
        WHERE table_name = 'energy_pools' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %', remaining_fields;
    END LOOP;
END $$;

-- 记录迁移完成
DO $$
BEGIN
    RAISE NOTICE '✓ energy_pools 表实时数据字段移除完成';
    RAISE NOTICE '时间: %', NOW();
    RAISE NOTICE '后续需要更新应用代码以适配新的表结构';
END $$;

COMMIT;

-- ========================================================================
-- 迁移说明：
-- 
-- 1. 此迁移会移除4个字段及其相关索引和注释
-- 2. 操作是不可逆的，请确保已有数据备份
-- 3. 执行后需要更新应用代码，移除对这些字段的引用
-- 4. 应用应改为从TRON网络API实时获取这些数据
-- 
-- 回滚方案：
-- 如需回滚，请使用备份文件恢复数据库
-- ========================================================================
