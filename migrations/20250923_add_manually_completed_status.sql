-- 添加手动补单完成状态到订单表
-- 创建时间: 2025-09-23
-- 描述: 为了区分自动完成和手动补单完成的订单，添加新的状态 'manually_completed'

BEGIN;

-- 先删除现有的状态约束
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 添加包含新状态的约束
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status::text = ANY (ARRAY[
  'pending'::character varying::text,
  'processing'::character varying::text, 
  'completed'::character varying::text,
  'failed'::character varying::text,
  'cancelled'::character varying::text,
  'refunded'::character varying::text,
  'pending_delegation'::character varying::text,
  'manually_completed'::character varying::text
]));

-- 创建索引以优化按状态查询的性能（如果不存在的话）
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 验证约束添加成功
DO $$
BEGIN
    -- 检查约束是否存在
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass 
        AND conname = 'orders_status_check'
        AND pg_get_constraintdef(oid) LIKE '%manually_completed%'
    ) THEN
        RAISE NOTICE '✅ 状态约束添加成功，包含 manually_completed 状态';
    ELSE
        RAISE EXCEPTION '❌ 状态约束添加失败';
    END IF;
END $$;

COMMIT;

