-- ================================================================
-- 更新orders表的order_type字段约束，支持三种订单类型
-- 创建时间: 2025-09-22
-- 作者: 系统优化
-- 说明: 
--   1. 将order_type约束从2种类型扩展为3种类型
--   2. 与price_configs表的mode_type保持一致
--   3. 支持：energy_flash（能量闪租）、transaction_package（笔数套餐）、trx_exchange（TRX闪兑）
--   4. 迁移现有数据：STANDARD → transaction_package, FLASH_RENT → energy_flash
-- ================================================================

BEGIN;

-- 1. 查看当前数据分布
DO $$
DECLARE
  standard_count INTEGER;
  flash_rent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO standard_count FROM orders WHERE order_type = 'STANDARD';
  SELECT COUNT(*) INTO flash_rent_count FROM orders WHERE order_type = 'FLASH_RENT';
  
  RAISE NOTICE '当前数据分布:';
  RAISE NOTICE '- STANDARD类型订单: % 条', standard_count;
  RAISE NOTICE '- FLASH_RENT类型订单: % 条', flash_rent_count;
END $$;

-- 2. 先删除旧的约束
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

-- 3. 更新现有数据，将旧的类型值映射到新的类型值
UPDATE orders 
SET order_type = CASE 
  WHEN order_type = 'STANDARD' THEN 'transaction_package'
  WHEN order_type = 'FLASH_RENT' THEN 'energy_flash'
  ELSE order_type
END
WHERE order_type IN ('STANDARD', 'FLASH_RENT');

-- 4. 添加新的约束，支持三种订单类型
ALTER TABLE orders 
ADD CONSTRAINT orders_order_type_check 
CHECK (order_type::text = ANY (ARRAY[
  'energy_flash'::character varying::text,      -- 能量闪租
  'transaction_package'::character varying::text, -- 笔数套餐  
  'trx_exchange'::character varying::text       -- TRX闪兑
]));

-- 5. 更新字段默认值
ALTER TABLE orders 
ALTER COLUMN order_type SET DEFAULT 'transaction_package';

-- 6. 更新字段注释
COMMENT ON COLUMN orders.order_type IS '订单类型：energy_flash-能量闪租，transaction_package-笔数套餐，trx_exchange-TRX闪兑';

-- 7. 验证数据迁移结果
DO $$
DECLARE
  energy_flash_count INTEGER;
  transaction_package_count INTEGER;
  trx_exchange_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO energy_flash_count FROM orders WHERE order_type = 'energy_flash';
  SELECT COUNT(*) INTO transaction_package_count FROM orders WHERE order_type = 'transaction_package';
  SELECT COUNT(*) INTO trx_exchange_count FROM orders WHERE order_type = 'trx_exchange';
  
  RAISE NOTICE '迁移后数据分布:';
  RAISE NOTICE '- energy_flash（能量闪租）: % 条', energy_flash_count;
  RAISE NOTICE '- transaction_package（笔数套餐）: % 条', transaction_package_count;
  RAISE NOTICE '- trx_exchange（TRX闪兑）: % 条', trx_exchange_count;
  
  IF (energy_flash_count + transaction_package_count + trx_exchange_count) = 
     (SELECT COUNT(*) FROM orders) THEN
    RAISE NOTICE '✅ 数据迁移验证成功，所有订单类型都符合新约束';
  ELSE
    RAISE EXCEPTION '❌ 数据迁移验证失败，存在不符合约束的数据';
  END IF;
END $$;

COMMIT;

-- ================================================================
-- 验证脚本：检查约束和数据一致性
-- ================================================================
SELECT 
  '=== Order Type约束更新结果 ===' as info;

-- 查看新的约束定义
SELECT 
  'orders表order_type约束' as constraint_info,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'orders_order_type_check';

-- 查看price_configs表约束，确保一致性
SELECT 
  'price_configs表mode_type约束' as constraint_info,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'price_configs'::regclass 
  AND conname = 'price_configs_mode_type_check';

-- 查看orders和price_configs的类型对应关系
SELECT 
  '=== 订单类型与价格配置对应关系 ===' as info;

SELECT 
  o.order_type as orders_type,
  pc.mode_type as price_config_type,
  pc.name as config_name,
  COUNT(*) as order_count
FROM orders o
JOIN price_configs pc ON o.price_config_id = pc.id
GROUP BY o.order_type, pc.mode_type, pc.name
ORDER BY o.order_type;
