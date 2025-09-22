-- ================================================================
-- 修正orders表字段注释
-- 创建时间: 2025-09-22
-- 作者: 系统优化
-- 说明: 
--   1. 修正delegation_started_at注释：从"代理开始时间"改为"委托开始时间"
--   2. 完善processing_started_at注释：明确为"订单处理开始时间"  
--   3. 更新status注释：与实际约束定义保持一致
--   4. 保持payment_status注释格式一致性
-- ================================================================

BEGIN;

-- 1. 修正delegation_started_at字段注释
-- 原注释：'代理开始时间' (翻译错误)
-- 新注释：'委托开始时间' (准确反映TRON delegation概念)
COMMENT ON COLUMN orders.delegation_started_at IS '委托开始时间';

-- 2. 完善processing_started_at字段注释
-- 使其更明确地表达业务含义
COMMENT ON COLUMN orders.processing_started_at IS '订单处理开始时间';

-- 3. 更新status字段注释
-- 原注释缺少部分状态值，现在与约束定义完全一致
-- 支持的状态值：pending, processing, completed, failed, cancelled, refunded, pending_delegation
COMMENT ON COLUMN orders.status IS '订单状态：pending-待处理，processing-处理中，completed-已完成，failed-失败，cancelled-已取消，refunded-已退款，pending_delegation-待委托';

-- 4. 保持payment_status注释格式一致
-- 使用连字符分隔，与status字段注释格式统一
COMMENT ON COLUMN orders.payment_status IS '支付状态：unpaid-未支付，paid-已支付，refunded-已退款';

COMMIT;

-- ================================================================
-- 验证脚本：检查修正后的注释
-- ================================================================
SELECT 
  '=== Orders表字段注释修正结果 ===' as info;

SELECT 
  column_name,
  col_description(pgc.oid, cols.ordinal_position) as column_comment
FROM information_schema.columns cols
LEFT JOIN pg_class pgc ON pgc.relname = cols.table_name
WHERE cols.table_name = 'orders' 
  AND cols.column_name IN (
    'status', 
    'payment_status', 
    'processing_started_at', 
    'delegation_started_at'
  )
ORDER BY 
  CASE column_name 
    WHEN 'status' THEN 1
    WHEN 'payment_status' THEN 2  
    WHEN 'processing_started_at' THEN 3
    WHEN 'delegation_started_at' THEN 4
  END;

-- 显示当前约束定义，确保注释与约束一致
SELECT 
  '=== 相关约束定义 ===' as info;

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND contype = 'c'
  AND conname LIKE '%status%';
