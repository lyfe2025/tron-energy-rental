-- ================================================================
-- 为orders表缺少注释的字段添加注释
-- 创建时间: 2025-09-22
-- 作者: 系统优化
-- 说明: 
--   为orders表中所有缺少注释的字段添加详细的业务说明
--   确保每个字段都有准确的注释，便于开发和维护
-- ================================================================

BEGIN;

-- 1. 为network_id字段添加注释
COMMENT ON COLUMN orders.network_id IS 'TRON网络ID，关联tron_networks表，标识订单使用的区块链网络';

-- 2. 为order_type字段添加注释
COMMENT ON COLUMN orders.order_type IS '订单类型：STANDARD-标准订单，FLASH_RENT-能量闪租订单';

-- 3. 为payment_trx_amount字段添加注释
COMMENT ON COLUMN orders.payment_trx_amount IS '用户实际支付的TRX数量（精确到6位小数）';

-- 4. 为calculated_units字段添加注释  
COMMENT ON COLUMN orders.calculated_units IS '计算得出的处理单位数量，用于定价和资源分配';

-- 5. 为delegated_energy_amount字段添加注释
COMMENT ON COLUMN orders.delegated_energy_amount IS '实际委托给用户的能量数量（单位：sun）';

-- 6. 为delegation_tx_id字段添加注释
COMMENT ON COLUMN orders.delegation_tx_id IS '能量委托交易的唯一标识符';

COMMIT;

-- ================================================================
-- 验证脚本：检查所有字段的注释完整性
-- ================================================================
SELECT 
  '=== Orders表字段注释完整性检查 ===' as info;

-- 查看所有字段的注释情况
SELECT 
  cols.ordinal_position as "序号",
  cols.column_name as "字段名",
  cols.data_type as "数据类型",
  cols.is_nullable as "允许空值",
  CASE 
    WHEN col_description(pgc.oid, cols.ordinal_position) IS NULL THEN '❌ 缺少注释'
    ELSE '✅ ' || col_description(pgc.oid, cols.ordinal_position)
  END as "注释状态"
FROM information_schema.columns cols
LEFT JOIN pg_class pgc ON pgc.relname = cols.table_name
WHERE cols.table_name = 'orders' 
ORDER BY cols.ordinal_position;

-- 统计注释完整性
SELECT 
  '=== 注释完整性统计 ===' as info;

SELECT 
  COUNT(*) as total_columns,
  COUNT(col_description(pgc.oid, cols.ordinal_position)) as commented_columns,
  COUNT(*) - COUNT(col_description(pgc.oid, cols.ordinal_position)) as missing_comments,
  ROUND(
    COUNT(col_description(pgc.oid, cols.ordinal_position))::numeric / COUNT(*)::numeric * 100, 
    2
  ) as completion_percentage
FROM information_schema.columns cols
LEFT JOIN pg_class pgc ON pgc.relname = cols.table_name
WHERE cols.table_name = 'orders';
