-- 创建机器人定价配置表
-- Migration: 20250128_create_bot_pricing_configs_table.sql
-- Created: 2025-01-28
-- Description: 创建机器人定价配置表，用于关联Telegram机器人与价格策略

-- 1. 创建机器人定价配置表
CREATE TABLE IF NOT EXISTS bot_pricing_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL,
    strategy_id UUID NOT NULL,
    mode_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES telegram_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT fk_bot_pricing_configs_bot FOREIGN KEY (bot_id) REFERENCES telegram_bots(id) ON DELETE CASCADE,
    CONSTRAINT fk_bot_pricing_configs_strategy FOREIGN KEY (strategy_id) REFERENCES pricing_strategies(id) ON DELETE CASCADE,
    CONSTRAINT fk_bot_pricing_configs_mode FOREIGN KEY (mode_type) REFERENCES pricing_modes(mode_type) ON DELETE RESTRICT,
    
    -- 唯一约束：同一机器人同一模式类型同一时间只能有一个活跃配置
    CONSTRAINT uk_bot_pricing_configs_active UNIQUE (bot_id, mode_type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_bot_pricing_configs_bot_id ON bot_pricing_configs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_pricing_configs_strategy_id ON bot_pricing_configs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_bot_pricing_configs_mode_type ON bot_pricing_configs(mode_type);
CREATE INDEX IF NOT EXISTS idx_bot_pricing_configs_active ON bot_pricing_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_bot_pricing_configs_effective ON bot_pricing_configs(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_bot_pricing_configs_priority ON bot_pricing_configs(priority DESC);

-- 3. 创建更新时间触发器
CREATE TRIGGER update_bot_pricing_configs_updated_at
    BEFORE UPDATE ON bot_pricing_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 添加表和字段注释
COMMENT ON TABLE bot_pricing_configs IS '机器人定价配置表：关联Telegram机器人与价格策略';
COMMENT ON COLUMN bot_pricing_configs.id IS '配置唯一标识';
COMMENT ON COLUMN bot_pricing_configs.bot_id IS '关联的Telegram机器人ID';
COMMENT ON COLUMN bot_pricing_configs.strategy_id IS '关联的价格策略ID';
COMMENT ON COLUMN bot_pricing_configs.mode_type IS '定价模式类型：energy_flash-能量闪租，transaction_package-笔数套餐';
COMMENT ON COLUMN bot_pricing_configs.is_active IS '是否激活该配置';
COMMENT ON COLUMN bot_pricing_configs.priority IS '优先级（数字越大优先级越高）';
COMMENT ON COLUMN bot_pricing_configs.effective_from IS '生效开始时间';
COMMENT ON COLUMN bot_pricing_configs.effective_until IS '生效结束时间（NULL表示永久有效）';
COMMENT ON COLUMN bot_pricing_configs.created_by IS '创建者用户ID';
COMMENT ON COLUMN bot_pricing_configs.created_at IS '创建时间';
COMMENT ON COLUMN bot_pricing_configs.updated_at IS '更新时间';

-- 5. 权限配置已完成

-- 9. 添加约束确保有效时间范围
ALTER TABLE bot_pricing_configs ADD CONSTRAINT bot_pricing_configs_effective_time_check 
CHECK (effective_until IS NULL OR effective_until > effective_from);

-- 10. 添加约束确保优先级为非负数
ALTER TABLE bot_pricing_configs ADD CONSTRAINT bot_pricing_configs_priority_check 
CHECK (priority >= 0);

-- 11. 创建函数：获取机器人当前有效的定价配置
CREATE OR REPLACE FUNCTION get_bot_active_pricing_config(
    p_bot_id UUID,
    p_mode_type VARCHAR(50)
)
RETURNS TABLE (
    config_id UUID,
    strategy_id UUID,
    strategy_name VARCHAR(255),
    strategy_config JSONB,
    priority INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bpc.id,
        bpc.strategy_id,
        ps.name,
        ps.config,
        bpc.priority
    FROM bot_pricing_configs bpc
    JOIN pricing_strategies ps ON bpc.strategy_id = ps.id
    WHERE bpc.bot_id = p_bot_id
        AND bpc.mode_type = p_mode_type
        AND bpc.is_active = true
        AND ps.is_active = true
        AND bpc.effective_from <= NOW()
        AND (bpc.effective_until IS NULL OR bpc.effective_until > NOW())
    ORDER BY bpc.priority DESC, bpc.created_at DESC
    LIMIT 1;
END;
$$;

-- 12. 为函数添加注释
COMMENT ON FUNCTION get_bot_active_pricing_config(UUID, VARCHAR) IS '获取指定机器人和模式类型的当前有效定价配置';