-- 添加 active 状态到订单表约束
-- 创建时间: 2025-09-26
-- 描述: 为笔数套餐订单添加 'active' 状态，用于表示已支付但尚未完成的活跃订单

BEGIN;

-- 先删除现有的状态约束
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 添加包含 active 状态的约束
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status::text = ANY (ARRAY[
  'pending'::character varying::text,
  'processing'::character varying::text, 
  'active'::character varying::text,
  'completed'::character varying::text,
  'failed'::character varying::text,
  'cancelled'::character varying::text,
  'refunded'::character varying::text,
  'pending_delegation'::character varying::text,
  'manually_completed'::character varying::text
]));

-- 验证约束添加成功
DO $$
BEGIN
    -- 检查约束是否存在
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass 
        AND conname = 'orders_status_check'
        AND pg_get_constraintdef(oid) LIKE '%active%'
    ) THEN
        RAISE NOTICE '✅ 状态约束更新成功，包含 active 状态';
    ELSE
        RAISE EXCEPTION '❌ 状态约束更新失败';
    END IF;
END $$;

COMMIT;
