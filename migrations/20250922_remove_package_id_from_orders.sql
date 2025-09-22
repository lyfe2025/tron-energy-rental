-- ================================================================
-- 移除orders表中的package_id字段
-- 创建时间: 2025-09-22
-- 作者: 系统优化
-- 说明: 
--   1. 确认所有订单都已经正确设置了price_config_id
--   2. 安全移除不再使用的package_id字段
-- ================================================================

BEGIN;

-- 1. 验证所有订单都有有效的price_config_id
DO $$
DECLARE
  orders_without_price_config INTEGER;
  orders_with_package_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO orders_without_price_config 
  FROM orders 
  WHERE price_config_id IS NULL;
  
  SELECT COUNT(*) INTO orders_with_package_id 
  FROM orders 
  WHERE package_id IS NOT NULL;
  
  RAISE NOTICE '检查结果:';
  RAISE NOTICE '- 没有price_config_id的订单数量: %', orders_without_price_config;
  RAISE NOTICE '- 仍有package_id的订单数量: %', orders_with_package_id;
  
  IF orders_without_price_config > 0 THEN
    RAISE EXCEPTION '发现 % 条订单没有设置price_config_id，请先确保所有订单都有有效的价格配置关联', orders_without_price_config;
  END IF;
  
  RAISE NOTICE '✓ 所有订单都已正确设置price_config_id，可以安全移除package_id字段';
END $$;

-- 2. 移除package_id字段的外键约束（如果存在）
DO $$
BEGIN
  -- 检查并删除外键约束
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_package_id_fkey' 
    AND table_name = 'orders'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_package_id_fkey;
    RAISE NOTICE '✓ 已移除package_id外键约束';
  ELSE
    RAISE NOTICE '- package_id外键约束不存在，跳过';
  END IF;
END $$;

-- 3. 移除package_id字段
ALTER TABLE orders DROP COLUMN IF EXISTS package_id;

DO $$
BEGIN
  RAISE NOTICE '✓ 已移除package_id字段';
END $$;

-- 4. 验证字段是否已成功移除
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'package_id'
  ) THEN
    RAISE NOTICE '✓ 确认package_id字段已成功移除';
  ELSE
    RAISE EXCEPTION 'package_id字段移除失败';
  END IF;
END $$;

-- 5. 验证price_config_id外键约束是否存在且正常工作
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'orders' 
    AND kcu.column_name = 'price_config_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE NOTICE '✓ price_config_id外键约束正常';
  ELSE
    RAISE WARNING 'price_config_id外键约束不存在，请检查';
  END IF;
END $$;

COMMIT;

-- ================================================================
-- 完成后的验证脚本
-- ================================================================
-- 验证订单表结构优化结果
SELECT 
  'orders表优化完成' as status,
  COUNT(*) as total_orders,
  COUNT(price_config_id) as orders_with_price_config,
  COUNT(CASE WHEN order_type = 'FLASH_RENT' THEN 1 END) as flash_rent_orders,
  COUNT(CASE WHEN order_type = 'STANDARD' THEN 1 END) as standard_orders
FROM orders;

-- 检查价格配置关联分布
SELECT 
  pc.mode_type as price_config_type,
  pc.name as config_name,
  o.order_type,
  COUNT(*) as order_count
FROM orders o
JOIN price_configs pc ON o.price_config_id = pc.id
GROUP BY pc.mode_type, pc.name, o.order_type
ORDER BY pc.mode_type, o.order_type;
