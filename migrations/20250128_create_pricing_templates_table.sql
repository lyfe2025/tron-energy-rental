-- 创建定价模板表
-- Migration: 20250128_create_pricing_templates_table.sql
-- Created: 2025-01-28
-- Description: 创建定价模板表，用于管理预设的定价模板

-- 1. 创建定价模板表
CREATE TABLE IF NOT EXISTS pricing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('energy_flash', 'transaction_package')),
    default_config JSONB NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_pricing_templates_type ON pricing_templates(type);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_system ON pricing_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_name ON pricing_templates(name);

-- 3. 添加表和字段注释
COMMENT ON TABLE pricing_templates IS '定价模板表：管理预设的定价模板';
COMMENT ON COLUMN pricing_templates.id IS '模板唯一标识';
COMMENT ON COLUMN pricing_templates.name IS '模板名称';
COMMENT ON COLUMN pricing_templates.type IS '模板类型：energy_flash-能量闪租，transaction_package-笔数套餐';
COMMENT ON COLUMN pricing_templates.default_config IS '默认配置参数（JSON格式）';
COMMENT ON COLUMN pricing_templates.description IS '模板描述';
COMMENT ON COLUMN pricing_templates.is_system IS '是否为系统模板';
COMMENT ON COLUMN pricing_templates.created_at IS '创建时间';

-- 4. 权限配置已完成

-- 6. 插入系统默认模板
INSERT INTO pricing_templates (name, type, default_config, description, is_system) VALUES
('标准能量闪租模板', 'energy_flash', '{
  "unit_price": 2.6,
  "max_quantity": 5,
  "expiry_hours": 1,
  "double_energy_for_no_usdt": true,
  "collection_address": "TWdcgk9NEsV1nt5yPrNfSYktbA12345678"
}', '标准的能量闪租定价模板，单笔2.6 TRX，最大5笔，1小时过期', true),
('标准笔数套餐模板', 'transaction_package', '{
  "packages": [
    {"transactions": 10, "price": 25},
    {"transactions": 50, "price": 120},
    {"transactions": 100, "price": 230}
  ],
  "occupation_fee_hours": 24,
  "occupation_fee_amount": 1,
  "transfer_enabled": true
}', '标准的笔数套餐定价模板，包含10/50/100笔套餐，24小时占用费', true),
('代理商优惠模板', 'energy_flash', '{
  "unit_price": 2.3,
  "max_quantity": 10,
  "expiry_hours": 2,
  "double_energy_for_no_usdt": true,
  "collection_address": "TWdcgk9NEsV1nt5yPrNfSYktbA12345678"
}', '代理商专享优惠价格模板，单笔2.3 TRX，最大10笔', true),
('VIP笔数套餐模板', 'transaction_package', '{
  "packages": [
    {"transactions": 10, "price": 22},
    {"transactions": 50, "price": 105},
    {"transactions": 100, "price": 200},
    {"transactions": 500, "price": 950}
  ],
  "occupation_fee_hours": 48,
  "occupation_fee_amount": 1,
  "transfer_enabled": true
}', 'VIP用户专享笔数套餐模板，包含更多套餐选择和更长占用时间', true);

-- 7. 现在为pricing_strategies表添加外键约束
ALTER TABLE pricing_strategies 
ADD CONSTRAINT fk_pricing_strategies_template 
FOREIGN KEY (template_id) REFERENCES pricing_templates(id) ON DELETE SET NULL;