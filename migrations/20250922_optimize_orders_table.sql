-- ================================================================
-- 订单表优化：移除package_id，添加price_config_id关联价格配置表
-- 创建时间: 2025-09-22
-- 作者: 系统优化
-- 说明: 
--   1. 移除不再使用的package_id字段
--   2. 添加price_config_id字段关联price_configs表
--   3. 支持能量闪租、笔数套餐、能量闪兑三种订单类型
-- ================================================================

BEGIN;

-- 1. 首先添加price_config_id字段
ALTER TABLE orders 
ADD COLUMN price_config_id INTEGER;

-- 2. 添加外键约束关联price_configs表
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_price_config 
FOREIGN KEY (price_config_id) REFERENCES price_configs(id);

-- 3. 添加索引优化查询性能
CREATE INDEX idx_orders_price_config_id ON orders(price_config_id);
CREATE INDEX idx_orders_order_type_network_id ON orders(order_type, network_id);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at);

-- 4. 更新现有订单的price_config_id（基于order_type和network_id匹配）
-- 注意：这里我们根据订单的network_id和推测的类型来匹配price_config
UPDATE orders 
SET price_config_id = (
  SELECT pc.id 
  FROM price_configs pc 
  WHERE pc.network_id = orders.network_id 
    AND pc.mode_type = CASE 
      WHEN orders.order_type = 'FLASH_RENT' THEN 'energy_flash'
      WHEN orders.order_type = 'STANDARD' THEN 'transaction_package'
      ELSE 'energy_flash'  -- 默认为能量闪租
    END
    AND pc.is_active = true
  LIMIT 1
)
WHERE price_config_id IS NULL;

-- 5. 添加注释
COMMENT ON COLUMN orders.price_config_id IS '关联的价格配置ID，指向price_configs表';

-- 6. 验证更新结果
DO $$
DECLARE
  updated_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM orders WHERE price_config_id IS NOT NULL;
  SELECT COUNT(*) INTO null_count FROM orders WHERE price_config_id IS NULL;
  
  RAISE NOTICE '更新完成: % 条订单已设置price_config_id, % 条订单price_config_id为空', updated_count, null_count;
  
  IF null_count > 0 THEN
    RAISE WARNING '还有 % 条订单的price_config_id为空，请手动检查', null_count;
  END IF;
END $$;

-- 7. 在验证无问题后，移除package_id字段（分步执行）
-- 注意：先不立即删除，等验证系统运行正常后再执行这部分
/*
-- 移除package_id字段的外键约束（如果存在）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_package_id_fkey;

-- 移除package_id字段
ALTER TABLE orders DROP COLUMN IF EXISTS package_id;

-- 移除相关注释
COMMENT ON COLUMN orders.package_id IS NULL;
*/

COMMIT;

-- ================================================================
-- 验证脚本（执行完成后可以运行）
-- ================================================================
/*
-- 检查price_config_id分布
SELECT 
  o.order_type,
  pc.mode_type,
  pc.name,
  COUNT(*) as order_count
FROM orders o
LEFT JOIN price_configs pc ON o.price_config_id = pc.id
GROUP BY o.order_type, pc.mode_type, pc.name
ORDER BY o.order_type, pc.mode_type;

-- 检查是否有未关联的订单
SELECT COUNT(*) as unlinked_orders 
FROM orders 
WHERE price_config_id IS NULL;

-- 检查外键约束是否正常
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'orders'
  AND kcu.column_name = 'price_config_id';
*/
