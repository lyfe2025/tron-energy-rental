-- 创建价格策略表
-- Migration: 20250128_create_pricing_strategies_table.sql
-- Created: 2025-01-28
-- Description: 创建价格策略表，用于统一管理能量闪租和笔数套餐的定价策略

-- 1. 创建价格策略表
CREATE TABLE IF NOT EXISTS pricing_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('energy_flash', 'transaction_package')),
    config JSONB NOT NULL,
    template_id UUID, -- 将在后续迁移中添加外键约束
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES telegram_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_pricing_strategies_type ON pricing_strategies(type);
CREATE INDEX IF NOT EXISTS idx_pricing_strategies_active ON pricing_strategies(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_strategies_created_by ON pricing_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_pricing_strategies_template ON pricing_strategies(template_id);
CREATE INDEX IF NOT EXISTS idx_pricing_strategies_name ON pricing_strategies(name);

-- 3. 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 创建更新时间触发器
CREATE TRIGGER update_pricing_strategies_updated_at
    BEFORE UPDATE ON pricing_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 添加表和字段注释
COMMENT ON TABLE pricing_strategies IS '价格策略表：统一管理能量闪租和笔数套餐的定价策略';
COMMENT ON COLUMN pricing_strategies.id IS '策略唯一标识';
COMMENT ON COLUMN pricing_strategies.name IS '策略名称';
COMMENT ON COLUMN pricing_strategies.type IS '策略类型：energy_flash-能量闪租，transaction_package-笔数套餐';
COMMENT ON COLUMN pricing_strategies.config IS '策略配置参数（JSON格式）';
COMMENT ON COLUMN pricing_strategies.template_id IS '基于的模板ID';
COMMENT ON COLUMN pricing_strategies.is_active IS '是否激活';
COMMENT ON COLUMN pricing_strategies.created_by IS '创建者用户ID';
COMMENT ON COLUMN pricing_strategies.created_at IS '创建时间';
COMMENT ON COLUMN pricing_strategies.updated_at IS '更新时间';

-- 6. 创建成功提示
SELECT 'pricing_strategies table created successfully' AS status;