-- 添加payment_currency字段注释
-- 说明：明确支付货币类型字段的用途和允许值

BEGIN;

-- 添加payment_currency字段注释
COMMENT ON COLUMN "public"."orders"."payment_currency" IS '支付货币类型：USDT 或 TRX';

-- 添加检查约束确保只允许USDT或TRX
DO $$
BEGIN
    -- 检查约束是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_payment_currency_valid_values'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT chk_payment_currency_valid_values 
        CHECK (payment_currency IN ('USDT', 'TRX'));
    END IF;
END $$;

COMMIT;
