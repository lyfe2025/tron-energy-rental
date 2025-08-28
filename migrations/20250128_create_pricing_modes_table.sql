-- 创建定价模式表
-- Migration: 20250128_create_pricing_modes_table.sql
-- Created: 2025-01-28
-- Description: 创建定价模式表，用于定义能量闪租和笔数套餐的配置模式

-- 1. 创建定价模式表
CREATE TABLE IF NOT EXISTS pricing_modes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode_type VARCHAR(50) UNIQUE NOT NULL,
    config_schema JSONB NOT NULL,
    default_config JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_pricing_modes_type ON pricing_modes(mode_type);
CREATE INDEX IF NOT EXISTS idx_pricing_modes_enabled ON pricing_modes(is_enabled);

-- 3. 创建更新时间触发器
CREATE TRIGGER update_pricing_modes_updated_at
    BEFORE UPDATE ON pricing_modes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 添加表和字段注释
COMMENT ON TABLE pricing_modes IS '定价模式表：定义能量闪租和笔数套餐的配置模式';
COMMENT ON COLUMN pricing_modes.id IS '模式唯一标识';
COMMENT ON COLUMN pricing_modes.mode_type IS '模式类型：energy_flash-能量闪租，transaction_package-笔数套餐';
COMMENT ON COLUMN pricing_modes.config_schema IS '配置参数的JSON Schema定义';
COMMENT ON COLUMN pricing_modes.default_config IS '默认配置参数（JSON格式）';
COMMENT ON COLUMN pricing_modes.is_enabled IS '是否启用该模式';
COMMENT ON COLUMN pricing_modes.created_at IS '创建时间';
COMMENT ON COLUMN pricing_modes.updated_at IS '更新时间';

-- 5. 权限配置已完成

-- 7. 插入默认定价模式
INSERT INTO pricing_modes (mode_type, config_schema, default_config) VALUES
('energy_flash', '{
  "type": "object",
  "properties": {
    "unit_price": {
      "type": "number",
      "minimum": 0.1,
      "maximum": 10,
      "description": "单笔价格（TRX）"
    },
    "max_quantity": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10,
      "description": "最大购买笔数"
    },
    "expiry_hours": {
      "type": "integer",
      "minimum": 1,
      "maximum": 24,
      "description": "过期时间（小时）"
    },
    "double_energy_for_no_usdt": {
      "type": "boolean",
      "description": "向无USDT地址转账是否需要双倍能量"
    },
    "collection_address": {
      "type": "string",
      "pattern": "^T[A-Za-z1-9]{33}$",
      "description": "收款地址"
    }
  },
  "required": ["unit_price", "max_quantity", "expiry_hours"]
}', '{
  "unit_price": 2.6,
  "max_quantity": 5,
  "expiry_hours": 1,
  "double_energy_for_no_usdt": true,
  "collection_address": "TWdcgk9NEsV1nt5yPrNfSYktbA12345678"
}'),
('transaction_package', '{
  "type": "object",
  "properties": {
    "packages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "transactions": {
            "type": "integer",
            "minimum": 1,
            "description": "笔数"
          },
          "price": {
            "type": "number",
            "minimum": 0.1,
            "description": "价格（TRX）"
          }
        },
        "required": ["transactions", "price"]
      },
      "description": "套餐列表"
    },
    "occupation_fee_hours": {
      "type": "integer",
      "minimum": 1,
      "maximum": 168,
      "description": "占用费扣除间隔（小时）"
    },
    "occupation_fee_amount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10,
      "description": "占用费扣除笔数"
    },
    "transfer_enabled": {
      "type": "boolean",
      "description": "是否允许转移笔数"
    }
  },
  "required": ["packages", "occupation_fee_hours", "occupation_fee_amount"]
}', '{
  "packages": [
    {"transactions": 10, "price": 25},
    {"transactions": 50, "price": 120},
    {"transactions": 100, "price": 230}
  ],
  "occupation_fee_hours": 24,
  "occupation_fee_amount": 1,
  "transfer_enabled": true
}');

-- 8. 添加约束确保mode_type的唯一性和有效性
ALTER TABLE pricing_modes ADD CONSTRAINT pricing_modes_mode_type_check 
CHECK (mode_type IN ('energy_flash', 'transaction_package'));