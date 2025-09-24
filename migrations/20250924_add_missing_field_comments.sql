-- ==================================================================
-- 添加数据库缺失的字段注释
-- 创建时间: 2025-09-24
-- 作者: 系统维护
-- 说明: 
--   为所有缺少注释的字段添加完整的中文注释
--   涉及4个表共17个字段的注释添加
-- ==================================================================

BEGIN;

-- ================================================================
-- 1. telegram_bot_status表 - 添加9个字段注释
-- ================================================================
COMMENT ON COLUMN telegram_bot_status.bot_id IS 'Telegram机器人ID，关联telegram_bots表';
COMMENT ON COLUMN telegram_bot_status.status IS '机器人当前状态：online(在线)、offline(离线)、error(错误)、unknown(未知)';
COMMENT ON COLUMN telegram_bot_status.last_activity IS '最后活动时间，记录机器人最后一次活动的时间戳';
COMMENT ON COLUMN telegram_bot_status.message_count IS '消息处理总数，统计机器人处理的消息数量';
COMMENT ON COLUMN telegram_bot_status.error_count IS '错误计数器，统计机器人运行时发生的错误次数';
COMMENT ON COLUMN telegram_bot_status.uptime_seconds IS '运行时长（秒），机器人本次启动后的运行时间';
COMMENT ON COLUMN telegram_bot_status.metadata IS '扩展元数据，存储机器人状态的其他信息（JSON格式）';
COMMENT ON COLUMN telegram_bot_status.created_at IS '创建时间，记录状态记录的创建时间';
COMMENT ON COLUMN telegram_bot_status.updated_at IS '更新时间，记录状态的最后更新时间';

-- ================================================================
-- 2. orders表 - 添加3个字段注释
-- ================================================================
COMMENT ON COLUMN orders.daily_fee IS '每日占用费，用于计算长期持有订单的日费（TRX）';
COMMENT ON COLUMN orders.package_type IS '套餐类型：single(单次)、package(套餐)、enterprise(企业)';
COMMENT ON COLUMN orders.fee_calculation_method IS '费用计算方法：fixed(固定费用)、variable(变动费用)、tiered(阶梯费用)';

-- ================================================================
-- 3. price_configs表 - 添加3个字段注释
-- ================================================================
COMMENT ON COLUMN price_configs.network_id IS 'TRON网络ID，关联tron_networks表，指定价格配置适用的网络';
COMMENT ON COLUMN price_configs.package_type IS '套餐类型：single(单次)、package(套餐)、enterprise(企业套餐)';
COMMENT ON COLUMN price_configs.fee_calculation_method IS '费用计算方法：fixed(固定费用)、variable(变动费用)、tiered(阶梯费用)';

-- ================================================================
-- 4. telegram_bots表 - 添加2个字段注释
-- ================================================================
COMMENT ON COLUMN telegram_bots.health_status IS '机器人健康状态：healthy(健康)、unhealthy(不健康)、unknown(未知)、maintenance(维护中)';
COMMENT ON COLUMN telegram_bots.last_health_check IS '最后健康检查时间，记录系统最后一次检查机器人健康状态的时间';

COMMIT;

-- ================================================================
-- 验证结果 - 检查所有表是否都有完整的字段注释
-- ================================================================
/*
-- 运行以下查询验证结果：

SELECT 
    t.table_name,
    COUNT(*) as total_columns,
    COUNT(pgd.description) as commented_columns,
    COUNT(*) - COUNT(pgd.description) as missing_comments
FROM 
    information_schema.tables t
JOIN 
    information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN 
    pg_catalog.pg_class pgc ON pgc.relname = t.table_name
LEFT JOIN 
    pg_catalog.pg_description pgd ON pgd.objoid = pgc.oid AND pgd.objsubid = c.ordinal_position
WHERE 
    t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
GROUP BY 
    t.table_name
HAVING 
    COUNT(*) - COUNT(pgd.description) > 0
ORDER BY 
    missing_comments DESC;

-- 应该返回0行，表示所有字段都有注释
*/

-- ================================================================
-- 修复总结
-- ================================================================
-- ✅ telegram_bot_status表：9个字段注释 - 完成
-- ✅ orders表：3个字段注释 - 完成  
-- ✅ price_configs表：3个字段注释 - 完成
-- ✅ telegram_bots表：2个字段注释 - 完成
-- ================================================================
-- 总计：4个表，17个字段注释添加完成
-- 数据库字段注释覆盖率：100%
-- ================================================================
