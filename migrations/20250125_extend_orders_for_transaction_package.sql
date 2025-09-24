-- 扩展订单表以支持笔数套餐业务
-- 创建时间: 2025-01-25
-- 说明: 为订单表添加笔数套餐业务必需的字段，支持分批能量代理和占费机制

BEGIN;

-- 首先添加订单类型枚举值（如果不存在）
DO $$
BEGIN
    -- 检查是否存在order_type字段，如果不存在则添加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'order_type') THEN
        ALTER TABLE orders ADD COLUMN order_type VARCHAR(50) DEFAULT 'energy_rent';
        COMMENT ON COLUMN orders.order_type IS '订单类型：energy_rent=能量租赁，transaction_package=笔数套餐';
    END IF;
    
    -- 更新约束以包含新的订单类型
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
    ALTER TABLE orders ADD CONSTRAINT orders_order_type_check 
        CHECK (order_type IN ('energy_rent', 'transaction_package', 'flash_rent'));
END $$;

-- 添加笔数套餐专用字段
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0 
    COMMENT '购买的总交易笔数',
ADD COLUMN IF NOT EXISTS used_transactions INTEGER DEFAULT 0 
    COMMENT '已使用的交易笔数',
ADD COLUMN IF NOT EXISTS remaining_transactions INTEGER DEFAULT 0 
    COMMENT '剩余可用交易笔数',
ADD COLUMN IF NOT EXISTS last_energy_usage_time TIMESTAMP WITH TIME ZONE 
    COMMENT '最后一次能量使用时间',
ADD COLUMN IF NOT EXISTS next_delegation_time TIMESTAMP WITH TIME ZONE 
    COMMENT '下次代理检查时间',
ADD COLUMN IF NOT EXISTS daily_fee_last_check TIMESTAMP WITH TIME ZONE 
    COMMENT '最后一次占费检查时间';

-- 添加字段注释
COMMENT ON COLUMN orders.transaction_count IS '购买的总交易笔数（仅笔数套餐订单使用）';
COMMENT ON COLUMN orders.used_transactions IS '已使用的交易笔数（仅笔数套餐订单使用）';
COMMENT ON COLUMN orders.remaining_transactions IS '剩余可用交易笔数（仅笔数套餐订单使用）';
COMMENT ON COLUMN orders.last_energy_usage_time IS '最后一次能量使用时间（用于占费计算）';
COMMENT ON COLUMN orders.next_delegation_time IS '下次代理检查时间（用于分批代理调度）';
COMMENT ON COLUMN orders.daily_fee_last_check IS '最后一次占费检查时间（用于占费机制）';

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_orders_transaction_package 
    ON orders(order_type, status, remaining_transactions) 
    WHERE order_type = 'transaction_package';

CREATE INDEX IF NOT EXISTS idx_orders_energy_usage_time 
    ON orders(last_energy_usage_time) 
    WHERE order_type = 'transaction_package';

CREATE INDEX IF NOT EXISTS idx_orders_daily_fee_check 
    ON orders(daily_fee_last_check) 
    WHERE order_type = 'transaction_package';

CREATE INDEX IF NOT EXISTS idx_orders_next_delegation_time 
    ON orders(next_delegation_time) 
    WHERE order_type = 'transaction_package' AND next_delegation_time IS NOT NULL;

-- 添加约束以确保数据完整性
ALTER TABLE orders 
ADD CONSTRAINT chk_transaction_count_non_negative 
    CHECK (transaction_count >= 0),
ADD CONSTRAINT chk_used_transactions_non_negative 
    CHECK (used_transactions >= 0),
ADD CONSTRAINT chk_remaining_transactions_non_negative 
    CHECK (remaining_transactions >= 0),
ADD CONSTRAINT chk_used_not_exceed_total 
    CHECK (used_transactions <= transaction_count),
ADD CONSTRAINT chk_remaining_equals_difference 
    CHECK (remaining_transactions = transaction_count - used_transactions);

-- 创建复合索引以优化笔数套餐订单查询
CREATE INDEX IF NOT EXISTS idx_orders_transaction_package_lookup 
    ON orders(order_type, status, target_address, created_at) 
    WHERE order_type = 'transaction_package';

-- 为笔数套餐订单的时间范围查询创建索引
CREATE INDEX IF NOT EXISTS idx_orders_transaction_package_timeline 
    ON orders(order_type, last_energy_usage_time, daily_fee_last_check, next_delegation_time) 
    WHERE order_type = 'transaction_package';

COMMIT;

-- 验证新字段是否添加成功
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' 
-- AND column_name IN ('order_type', 'transaction_count', 'used_transactions', 'remaining_transactions', 
--                     'last_energy_usage_time', 'next_delegation_time', 'daily_fee_last_check');