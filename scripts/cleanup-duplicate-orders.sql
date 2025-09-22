-- 清理重复的能量闪租订单脚本
-- 这个脚本会删除相同交易哈希的重复订单，只保留最早创建的一条记录

-- 1. 首先备份数据（建议在运行此脚本前先备份数据库）
-- pg_dump postgresql://postgres:postgres@localhost:5432/tron_energy_rental > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql

-- 2. 查看当前重复订单情况
SELECT 
    tron_tx_hash,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as order_ids,
    array_agg(status ORDER BY created_at) as statuses,
    array_agg(order_number ORDER BY created_at) as order_numbers,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM orders 
WHERE tron_tx_hash IS NOT NULL 
    AND order_type = 'energy_flash'
GROUP BY tron_tx_hash 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 3. 创建临时表存储要删除的订单ID
CREATE TEMP TABLE orders_to_delete AS
WITH ranked_orders AS (
    SELECT 
        id,
        tron_tx_hash,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY tron_tx_hash ORDER BY created_at ASC) as rn
    FROM orders 
    WHERE tron_tx_hash IS NOT NULL 
        AND order_type = 'energy_flash'
)
SELECT 
    id,
    tron_tx_hash,
    created_at
FROM ranked_orders 
WHERE rn > 1; -- 保留最早的记录（rn = 1），删除后续的记录

-- 4. 显示将要删除的订单
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.tron_tx_hash,
    o.created_at,
    o.error_message
FROM orders o
INNER JOIN orders_to_delete otd ON o.id = otd.id
ORDER BY o.tron_tx_hash, o.created_at;

-- 5. 执行删除操作（请确认上述查询结果正确后再执行）
-- 注意：删除操作不可逆，请确保已备份数据

/*
-- 取消注释以下行来执行删除操作：

-- 删除重复订单
DELETE FROM orders 
WHERE id IN (SELECT id FROM orders_to_delete);

-- 显示删除结果
SELECT 
    'Orders deleted' as action,
    COUNT(*) as count
FROM orders_to_delete;

-- 验证清理结果
SELECT 
    'Remaining duplicates' as check_type,
    COUNT(*) as count
FROM (
    SELECT tron_tx_hash
    FROM orders 
    WHERE tron_tx_hash IS NOT NULL 
        AND order_type = 'energy_flash'
    GROUP BY tron_tx_hash 
    HAVING COUNT(*) > 1
) as remaining_duplicates;

*/

-- 清理临时表
DROP TABLE IF EXISTS orders_to_delete;
