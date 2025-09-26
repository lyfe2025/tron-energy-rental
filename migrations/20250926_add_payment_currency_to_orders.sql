-- 添加 payment_currency 字段到 orders 表
-- 用于区分 USDT 和 TRX 支付方式

-- 添加字段
ALTER TABLE orders 
ADD COLUMN payment_currency VARCHAR(10) DEFAULT 'USDT';

-- 添加约束
ALTER TABLE orders 
ADD CONSTRAINT orders_payment_currency_check 
CHECK (payment_currency IN ('USDT', 'TRX'));

-- 添加索引用于查询优化
CREATE INDEX idx_orders_payment_currency ON orders(payment_currency);

-- 添加组合索引用于支付监听查询
CREATE INDEX idx_orders_payment_lookup ON orders(order_type, payment_currency, status, created_at);

-- 添加注释
COMMENT ON COLUMN orders.payment_currency IS '支付货币类型：USDT 或 TRX';
