-- 移除预留能量相关字段
-- 日期: 2025-01-06
-- 目的: 简化系统，移除预留能量功能相关的数据库字段

-- 移除reserved_energy字段
ALTER TABLE energy_pools 
DROP COLUMN IF EXISTS reserved_energy;

-- 显示迁移完成信息
SELECT 'Reserved energy field removed from energy_pools table successfully' as migration_status;
