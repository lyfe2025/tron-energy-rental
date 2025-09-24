-- 笔数套餐功能数据库迁移脚本
-- 创建时间: 2024-09-24
-- 描述: 添加笔数套餐相关的表结构和字段

-- 1. 扩展orders表，添加笔数套餐相关字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS used_transactions INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS remaining_transactions INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_energy_usage_time TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS next_delegation_time TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS daily_fee_last_check TIMESTAMP;

-- 为orders表添加索引
CREATE INDEX IF NOT EXISTS idx_orders_transaction_count ON orders(transaction_count);
CREATE INDEX IF NOT EXISTS idx_orders_remaining_transactions ON orders(remaining_transactions);
CREATE INDEX IF NOT EXISTS idx_orders_last_energy_usage_time ON orders(last_energy_usage_time);
CREATE INDEX IF NOT EXISTS idx_orders_next_delegation_time ON orders(next_delegation_time);

-- 2. 创建energy_usage_logs表
CREATE TABLE IF NOT EXISTS energy_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_address VARCHAR(50) NOT NULL,
    energy_before BIGINT NOT NULL DEFAULT 0,
    energy_after BIGINT NOT NULL DEFAULT 0,
    energy_consumed BIGINT NOT NULL DEFAULT 0,
    transaction_hash VARCHAR(100),
    usage_time TIMESTAMP NOT NULL,
    detection_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 为energy_usage_logs表添加索引
CREATE INDEX IF NOT EXISTS idx_energy_usage_logs_order_id ON energy_usage_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_energy_usage_logs_user_address ON energy_usage_logs(user_address);
CREATE INDEX IF NOT EXISTS idx_energy_usage_logs_usage_time ON energy_usage_logs(usage_time);
CREATE INDEX IF NOT EXISTS idx_energy_usage_logs_transaction_hash ON energy_usage_logs(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_energy_usage_logs_detection_time ON energy_usage_logs(detection_time);

-- 3. 创建daily_fee_logs表
CREATE TABLE IF NOT EXISTS daily_fee_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    fee_amount DECIMAL(20,6) NOT NULL DEFAULT 0,
    fee_reason VARCHAR(200),
    last_usage_time TIMESTAMP,
    fee_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remaining_before INTEGER NOT NULL DEFAULT 0,
    remaining_after INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 为daily_fee_logs表添加索引
CREATE INDEX IF NOT EXISTS idx_daily_fee_logs_order_id ON daily_fee_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_daily_fee_logs_fee_time ON daily_fee_logs(fee_time);
CREATE INDEX IF NOT EXISTS idx_daily_fee_logs_last_usage_time ON daily_fee_logs(last_usage_time);

-- 4. 扩展price_configs表
ALTER TABLE price_configs ADD COLUMN IF NOT EXISTS daily_fee DECIMAL(20,6) DEFAULT 0;
ALTER TABLE price_configs ADD COLUMN IF NOT EXISTS single_transaction_energy BIGINT DEFAULT 32000;
ALTER TABLE price_configs ADD COLUMN IF NOT EXISTS energy_check_interval INTEGER DEFAULT 300;
ALTER TABLE price_configs ADD COLUMN IF NOT EXISTS daily_fee_check_time TIME DEFAULT '00:00:00';

-- 为price_configs表添加索引
CREATE INDEX IF NOT EXISTS idx_price_configs_daily_fee ON price_configs(daily_fee);
CREATE INDEX IF NOT EXISTS idx_price_configs_single_transaction_energy ON price_configs(single_transaction_energy);

-- 添加表注释
COMMENT ON TABLE energy_usage_logs IS '能量使用记录表';
COMMENT ON TABLE daily_fee_logs IS '日费扣除记录表';

-- 添加字段注释
COMMENT ON COLUMN orders.transaction_count IS '总交易笔数';
COMMENT ON COLUMN orders.used_transactions IS '已使用交易笔数';
COMMENT ON COLUMN orders.remaining_transactions IS '剩余交易笔数';
COMMENT ON COLUMN orders.last_energy_usage_time IS '最后能量使用时间';
COMMENT ON COLUMN orders.next_delegation_time IS '下次委托时间';
COMMENT ON COLUMN orders.daily_fee_last_check IS '日费最后检查时间';

COMMENT ON COLUMN energy_usage_logs.energy_before IS '使用前能量值';
COMMENT ON COLUMN energy_usage_logs.energy_after IS '使用后能量值';
COMMENT ON COLUMN energy_usage_logs.energy_consumed IS '消耗的能量';
COMMENT ON COLUMN energy_usage_logs.usage_time IS '能量使用时间';
COMMENT ON COLUMN energy_usage_logs.detection_time IS '检测到使用的时间';

COMMENT ON COLUMN daily_fee_logs.fee_amount IS '扣除费用金额';
COMMENT ON COLUMN daily_fee_logs.fee_reason IS '扣费原因';
COMMENT ON COLUMN daily_fee_logs.remaining_before IS '扣费前剩余笔数';
COMMENT ON COLUMN daily_fee_logs.remaining_after IS '扣费后剩余笔数';

COMMENT ON COLUMN price_configs.daily_fee IS '日费金额';
COMMENT ON COLUMN price_configs.single_transaction_energy IS '单笔交易能量消耗';
COMMENT ON COLUMN price_configs.energy_check_interval IS '能量检查间隔(秒)';
COMMENT ON COLUMN price_configs.daily_fee_check_time IS '日费检查时间';

-- 迁移完成
SELECT 'Transaction package migration completed successfully' AS status;