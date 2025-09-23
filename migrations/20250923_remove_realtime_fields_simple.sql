-- ========================================================================
-- 移除 energy_pools 表中的实时数据字段迁移 (简化版本)
-- 创建日期: 2025年9月23日
-- ========================================================================

-- 移除索引（如果存在）
DROP INDEX IF EXISTS idx_energy_pools_total_bandwidth;
DROP INDEX IF EXISTS idx_energy_pools_available_bandwidth;
DROP INDEX IF EXISTS idx_energy_pools_total_energy;
DROP INDEX IF EXISTS idx_energy_pools_available_energy;

-- 移除字段
ALTER TABLE energy_pools DROP COLUMN IF EXISTS total_bandwidth;
ALTER TABLE energy_pools DROP COLUMN IF EXISTS available_bandwidth;
ALTER TABLE energy_pools DROP COLUMN IF EXISTS total_energy;
ALTER TABLE energy_pools DROP COLUMN IF EXISTS available_energy;

-- 验证操作结果
\echo '✓ 字段移除完成，当前 energy_pools 表结构:'
\d energy_pools
