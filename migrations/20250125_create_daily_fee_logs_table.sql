-- 创建占费记录表
-- 创建时间: 2025-01-25
-- 说明: 用于记录笔数套餐订单的占费扣除详情，支持24小时占费机制

BEGIN;

-- 创建占费记录表
CREATE TABLE IF NOT EXISTS daily_fee_logs (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL,
    fee_amount INTEGER NOT NULL,
    fee_reason VARCHAR(255) DEFAULT '24小时未使用',
    last_usage_time TIMESTAMP WITH TIME ZONE,
    fee_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remaining_before INTEGER NOT NULL,
    remaining_after INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT fk_daily_fee_logs_order_id 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 添加表注释
COMMENT ON TABLE daily_fee_logs IS '占费记录表，记录每次占费扣除的详细信息';

-- 添加字段注释
COMMENT ON COLUMN daily_fee_logs.id IS '记录唯一标识符';
COMMENT ON COLUMN daily_fee_logs.order_id IS '关联的订单ID';
COMMENT ON COLUMN daily_fee_logs.fee_amount IS '扣除的笔数';
COMMENT ON COLUMN daily_fee_logs.fee_reason IS '扣费原因描述';
COMMENT ON COLUMN daily_fee_logs.last_usage_time IS '最后一次能量使用时间';
COMMENT ON COLUMN daily_fee_logs.fee_time IS '扣费执行时间';
COMMENT ON COLUMN daily_fee_logs.remaining_before IS '扣费前剩余笔数';
COMMENT ON COLUMN daily_fee_logs.remaining_after IS '扣费后剩余笔数';
COMMENT ON COLUMN daily_fee_logs.created_at IS '记录创建时间';

-- 创建索引以提升查询性能
CREATE INDEX idx_daily_fee_logs_order_id ON daily_fee_logs(order_id);
CREATE INDEX idx_daily_fee_logs_fee_time ON daily_fee_logs(fee_time DESC);
CREATE INDEX idx_daily_fee_logs_last_usage_time ON daily_fee_logs(last_usage_time DESC);
CREATE INDEX idx_daily_fee_logs_fee_amount ON daily_fee_logs(fee_amount DESC);

-- 创建复合索引以优化常用查询
CREATE INDEX idx_daily_fee_logs_order_fee_time 
    ON daily_fee_logs(order_id, fee_time DESC);

CREATE INDEX idx_daily_fee_logs_fee_time_amount 
    ON daily_fee_logs(fee_time DESC, fee_amount);

-- 添加约束以确保数据完整性
ALTER TABLE daily_fee_logs 
ADD CONSTRAINT chk_fee_amount_positive 
    CHECK (fee_amount > 0),
ADD CONSTRAINT chk_remaining_values_non_negative 
    CHECK (remaining_before >= 0 AND remaining_after >= 0),
ADD CONSTRAINT chk_remaining_logic 
    CHECK (remaining_after = remaining_before - fee_amount),
ADD CONSTRAINT chk_fee_time_not_future 
    CHECK (fee_time <= NOW() + INTERVAL '1 minute'),
ADD CONSTRAINT chk_last_usage_time_before_fee 
    CHECK (last_usage_time IS NULL OR last_usage_time <= fee_time),
ADD CONSTRAINT chk_fee_reason_not_empty 
    CHECK (LENGTH(TRIM(fee_reason)) > 0);

-- 创建枚举类型用于标准化扣费原因
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fee_reason_type') THEN
        CREATE TYPE fee_reason_type AS ENUM (
            '24小时未使用',
            '48小时未使用',
            '72小时未使用',
            '手动扣费',
            '系统维护',
            '订单过期',
            '其他'
        );
    END IF;
END $$;

-- 可选：将fee_reason字段改为使用枚举类型（如果需要严格控制）
-- ALTER TABLE daily_fee_logs ALTER COLUMN fee_reason TYPE fee_reason_type USING fee_reason::fee_reason_type;

-- 创建视图以便于查询订单的占费统计
CREATE OR REPLACE VIEW order_fee_summary AS
SELECT 
    order_id,
    COUNT(*) as total_fee_count,
    SUM(fee_amount) as total_fee_amount,
    MIN(fee_time) as first_fee_time,
    MAX(fee_time) as last_fee_time,
    AVG(fee_amount) as avg_fee_amount
FROM daily_fee_logs
GROUP BY order_id;

COMMENT ON VIEW order_fee_summary IS '订单占费统计视图，提供每个订单的占费汇总信息';

-- 创建函数以计算订单的总占费金额
CREATE OR REPLACE FUNCTION get_order_total_fees(p_order_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_fees INTEGER;
BEGIN
    SELECT COALESCE(SUM(fee_amount), 0) 
    INTO total_fees 
    FROM daily_fee_logs 
    WHERE order_id = p_order_id;
    
    RETURN total_fees;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_order_total_fees(UUID) IS '计算指定订单的总占费笔数';

-- 创建函数以获取订单的最近占费记录
CREATE OR REPLACE FUNCTION get_order_recent_fees(p_order_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    fee_id INTEGER,
    fee_amount INTEGER,
    fee_reason VARCHAR(255),
    fee_time TIMESTAMP WITH TIME ZONE,
    remaining_after INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dfl.id,
        dfl.fee_amount,
        dfl.fee_reason,
        dfl.fee_time,
        dfl.remaining_after
    FROM daily_fee_logs dfl
    WHERE dfl.order_id = p_order_id
    ORDER BY dfl.fee_time DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_order_recent_fees(UUID, INTEGER) IS '获取指定订单的最近占费记录';

COMMIT;

-- 验证表是否创建成功
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'daily_fee_logs' 
-- ORDER BY ordinal_position;