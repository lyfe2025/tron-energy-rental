-- 添加带宽相关字段到 energy_pools 表
-- 日期: 2025-01-05
-- 目的: 添加总带宽和可用带宽字段，以支持完整的TRON账户资源显示

-- 添加总带宽字段
ALTER TABLE energy_pools 
ADD COLUMN IF NOT EXISTS total_bandwidth bigint DEFAULT 0 NOT NULL;

-- 添加可用带宽字段
ALTER TABLE energy_pools 
ADD COLUMN IF NOT EXISTS available_bandwidth bigint DEFAULT 0 NOT NULL;

-- 添加字段注释
COMMENT ON COLUMN energy_pools.total_bandwidth IS '总带宽资源，从TRON网络实际获取的带宽上限';
COMMENT ON COLUMN energy_pools.available_bandwidth IS '可用带宽资源，当前可以使用的带宽数量';

-- 为新字段创建索引（可选，用于查询优化）
CREATE INDEX IF NOT EXISTS idx_energy_pools_total_bandwidth ON energy_pools(total_bandwidth);
CREATE INDEX IF NOT EXISTS idx_energy_pools_available_bandwidth ON energy_pools(available_bandwidth);

-- 显示迁移完成信息
SELECT 'Bandwidth fields added to energy_pools table successfully' as migration_status;
