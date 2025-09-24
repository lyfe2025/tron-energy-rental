-- 创建能量使用记录表
-- 创建时间: 2025-01-25
-- 说明: 用于记录笔数套餐订单的能量使用详情，支持实时监控和占费计算

BEGIN;

-- 创建能量使用记录表
CREATE TABLE IF NOT EXISTS energy_usage_logs (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL,
    user_address VARCHAR(34) NOT NULL,
    energy_before BIGINT NOT NULL,
    energy_after BIGINT NOT NULL,
    energy_consumed BIGINT NOT NULL,
    transaction_hash VARCHAR(64),
    usage_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detection_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT fk_energy_usage_logs_order_id 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 添加表注释
COMMENT ON TABLE energy_usage_logs IS '能量使用记录表，记录用户每次能量消耗详情';

-- 添加字段注释
COMMENT ON COLUMN energy_usage_logs.id IS '记录唯一标识符';
COMMENT ON COLUMN energy_usage_logs.order_id IS '关联的订单ID';
COMMENT ON COLUMN energy_usage_logs.user_address IS 'TRON地址，能量使用者地址';
COMMENT ON COLUMN energy_usage_logs.energy_before IS '使用前能量值';
COMMENT ON COLUMN energy_usage_logs.energy_after IS '使用后能量值';
COMMENT ON COLUMN energy_usage_logs.energy_consumed IS '消耗的能量数量';
COMMENT ON COLUMN energy_usage_logs.transaction_hash IS '触发能量消耗的交易哈希（可选）';
COMMENT ON COLUMN energy_usage_logs.usage_time IS '实际能量使用时间';
COMMENT ON COLUMN energy_usage_logs.detection_time IS '系统检测到使用的时间';
COMMENT ON COLUMN energy_usage_logs.created_at IS '记录创建时间';
COMMENT ON COLUMN energy_usage_logs.updated_at IS '记录更新时间';

-- 创建索引以提升查询性能
CREATE INDEX idx_energy_usage_logs_order_id ON energy_usage_logs(order_id);
CREATE INDEX idx_energy_usage_logs_user_address ON energy_usage_logs(user_address);
CREATE INDEX idx_energy_usage_logs_usage_time ON energy_usage_logs(usage_time DESC);
CREATE INDEX idx_energy_usage_logs_detection_time ON energy_usage_logs(detection_time DESC);
CREATE INDEX idx_energy_usage_logs_energy_consumed ON energy_usage_logs(energy_consumed DESC);

-- 创建复合索引以优化常用查询
CREATE INDEX idx_energy_usage_logs_order_time 
    ON energy_usage_logs(order_id, usage_time DESC);

CREATE INDEX idx_energy_usage_logs_address_time 
    ON energy_usage_logs(user_address, usage_time DESC);

-- 为事务哈希创建部分索引（只索引有交易哈希的记录）
CREATE INDEX idx_energy_usage_logs_transaction_hash 
    ON energy_usage_logs(transaction_hash) 
    WHERE transaction_hash IS NOT NULL;

-- 添加约束以确保数据完整性
ALTER TABLE energy_usage_logs 
ADD CONSTRAINT chk_energy_values_non_negative 
    CHECK (energy_before >= 0 AND energy_after >= 0 AND energy_consumed >= 0),
ADD CONSTRAINT chk_energy_consumption_logic 
    CHECK (energy_consumed = energy_before - energy_after),
ADD CONSTRAINT chk_valid_tron_address 
    CHECK (LENGTH(user_address) = 34 AND user_address ~ '^T[A-Za-z0-9]{33}$'),
ADD CONSTRAINT chk_valid_transaction_hash 
    CHECK (transaction_hash IS NULL OR LENGTH(transaction_hash) = 64),
ADD CONSTRAINT chk_usage_time_not_future 
    CHECK (usage_time <= NOW() + INTERVAL '1 minute'),
ADD CONSTRAINT chk_detection_time_not_future 
    CHECK (detection_time <= NOW() + INTERVAL '1 minute');

-- 创建触发器以自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_energy_usage_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_energy_usage_logs_updated_at
    BEFORE UPDATE ON energy_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_energy_usage_logs_updated_at();

COMMIT;

-- 验证表是否创建成功
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'energy_usage_logs' 
-- ORDER BY ordinal_position;