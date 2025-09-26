-- 修复orders表price字段精度问题
-- 从 numeric(10,2) 改为 numeric(12,6) 以支持更精确的价格

-- 备份当前数据
CREATE TABLE IF NOT EXISTS orders_price_backup AS 
SELECT id, price FROM orders WHERE price IS NOT NULL;

-- 临时删除依赖的视图
DROP VIEW IF EXISTS bot_statistics CASCADE;

-- 修改字段类型
ALTER TABLE orders ALTER COLUMN price TYPE numeric(12,6);

-- 重新创建视图 bot_statistics
CREATE VIEW bot_statistics AS
SELECT 
    tb.id as bot_id,
    tb.username,
    tb.status,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.price), 0) as total_revenue,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN o.status = 'failed' THEN 1 END) as failed_orders,
    tb.created_at as bot_created_at,
    MAX(o.created_at) as last_order_time
FROM telegram_bots tb
LEFT JOIN orders o ON tb.id = o.bot_id
GROUP BY tb.id, tb.username, tb.status, tb.created_at;

-- 添加注释
COMMENT ON COLUMN orders.price IS '订单价格，支持6位小数精度 (USDT/TRX)';

-- 验证数据完整性
SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as with_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    AVG(price) as avg_price
FROM orders;
