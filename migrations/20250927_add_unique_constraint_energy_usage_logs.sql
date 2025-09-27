-- 为能量使用记录表添加唯一约束防重复
-- 创建时间: 2025-09-27
-- 说明: 防止同一订单的同一交易哈希创建多条重复记录

BEGIN;

-- 首先清理现有的重复记录（保留最早的记录）
WITH duplicate_records AS (
    SELECT 
        id,
        order_id,
        transaction_hash,
        ROW_NUMBER() OVER (
            PARTITION BY order_id, transaction_hash 
            ORDER BY created_at ASC
        ) as rn
    FROM energy_usage_logs
    WHERE transaction_hash IS NOT NULL
)
DELETE FROM energy_usage_logs 
WHERE id IN (
    SELECT id FROM duplicate_records WHERE rn > 1
);

-- 添加唯一约束：同一订单的同一交易哈希只能有一条记录
ALTER TABLE energy_usage_logs 
ADD CONSTRAINT unique_order_transaction_hash 
UNIQUE (order_id, transaction_hash);

-- 添加部分唯一约束的注释
COMMENT ON CONSTRAINT unique_order_transaction_hash ON energy_usage_logs 
IS '确保同一订单的同一交易哈希只能有一条能量使用记录';

COMMIT;
