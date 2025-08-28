-- 迁移脚本：移除energy_pools表的is_enabled字段
-- 执行时间：2025-01-XX
-- 原因：统一使用status字段管理账户状态，避免字段混淆

-- 检查字段是否存在
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'energy_pools' 
        AND column_name = 'is_enabled'
    ) THEN
        -- 移除is_enabled字段
        ALTER TABLE energy_pools DROP COLUMN is_enabled;
        RAISE NOTICE '已移除energy_pools表的is_enabled字段';
    ELSE
        RAISE NOTICE 'energy_pools表的is_enabled字段不存在，无需移除';
    END IF;
END $$;

-- 更新表注释，移除is_enabled字段的注释
COMMENT ON TABLE energy_pools IS '能量池账户表';
COMMENT ON COLUMN energy_pools.status IS '能量池状态：active=已启用，inactive=已停用，maintenance=维护中';
COMMENT ON COLUMN energy_pools.account_type IS '账户类型：own_energy=自有能量源，agent_energy=代理商能量源，third_party=第三方供应商';
COMMENT ON COLUMN energy_pools.priority IS '优先级：数值越小优先级越高 (1-100)';
COMMENT ON COLUMN energy_pools.total_energy IS '总能量数量';
COMMENT ON COLUMN energy_pools.available_energy IS '可用能量数量';
COMMENT ON COLUMN energy_pools.reserved_energy IS '预留能量数量';
COMMENT ON COLUMN energy_pools.cost_per_energy IS '单位能量成本 (TRX)';
COMMENT ON COLUMN energy_pools.daily_limit IS '每日最大能量使用量 (可选)';
COMMENT ON COLUMN energy_pools.monthly_limit IS '每月最大能量使用量 (可选)';
COMMENT ON COLUMN energy_pools.description IS '账户描述信息';
COMMENT ON COLUMN energy_pools.contact_info IS '联系信息 (JSON格式)';
COMMENT ON COLUMN energy_pools.last_updated_at IS '最后更新时间';
COMMENT ON COLUMN energy_pools.created_at IS '创建时间';
COMMENT ON COLUMN energy_pools.updated_at IS '更新时间';

-- 验证迁移结果
-- 检查表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'energy_pools'
ORDER BY ordinal_position;

-- 检查status字段的值分布
SELECT status, COUNT(*) as count 
FROM energy_pools 
GROUP BY status 
ORDER BY count DESC;
