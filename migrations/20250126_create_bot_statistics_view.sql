-- 创建机器人统计视图
-- 文件: 20250126_create_bot_statistics_view.sql
-- 作者: AI Assistant
-- 创建时间: 2025-01-26
-- 说明: 创建视图用于实时统计每个机器人的用户数和订单数

-- 开始事务
BEGIN;

-- 1. 创建机器人统计视图
CREATE OR REPLACE VIEW bot_statistics AS
SELECT 
    tb.id as bot_id,
    tb.bot_name as bot_name,
    tb.bot_username as bot_username,
    tb.is_active as bot_is_active,
    
    -- 用户统计
    COALESCE(user_stats.total_users, 0) as total_users,
    COALESCE(user_stats.active_users, 0) as active_users,
    COALESCE(user_stats.inactive_users, 0) as inactive_users,
    
    -- 订单统计  
    COALESCE(order_stats.total_orders, 0) as total_orders,
    COALESCE(order_stats.completed_orders, 0) as completed_orders,
    COALESCE(order_stats.pending_orders, 0) as pending_orders,
    COALESCE(order_stats.cancelled_orders, 0) as cancelled_orders,
    COALESCE(order_stats.total_revenue, 0) as total_revenue,
    
    -- 时间信息
    tb.created_at as bot_created_at,
    tb.updated_at as bot_updated_at

FROM telegram_bots tb

-- 左连接用户统计
LEFT JOIN (
    SELECT 
        bot_id,
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status IN ('inactive', 'banned') THEN 1 END) as inactive_users
    FROM users 
    WHERE bot_id IS NOT NULL
    GROUP BY bot_id
) user_stats ON tb.id = user_stats.bot_id

-- 左连接订单统计
LEFT JOIN (
    SELECT 
        bot_id,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status IN ('pending', 'processing') THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status IN ('cancelled', 'failed') THEN 1 END) as cancelled_orders,
        SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_revenue
    FROM orders 
    WHERE bot_id IS NOT NULL
    GROUP BY bot_id
) order_stats ON tb.id = order_stats.bot_id

ORDER BY tb.created_at DESC;

-- 2. 添加视图注释
COMMENT ON VIEW bot_statistics IS '机器人统计视图 - 实时统计每个机器人的用户数和订单数';

-- 3. 创建一个更简化的统计函数用于API调用
CREATE OR REPLACE FUNCTION get_bot_stats(bot_uuid uuid)
RETURNS TABLE(
    total_users bigint,
    total_orders bigint,
    active_users bigint,
    completed_orders bigint,
    total_revenue numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bs.total_users::bigint,
        bs.total_orders::bigint,
        bs.active_users::bigint,
        bs.completed_orders::bigint,
        bs.total_revenue
    FROM bot_statistics bs
    WHERE bs.bot_id = bot_uuid;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建批量获取所有机器人统计的函数
CREATE OR REPLACE FUNCTION get_all_bot_stats()
RETURNS TABLE(
    bot_id uuid,
    bot_name varchar,
    total_users bigint,
    total_orders bigint,
    active_users bigint,
    completed_orders bigint,
    total_revenue numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bs.bot_id,
        bs.bot_name,
        bs.total_users::bigint,
        bs.total_orders::bigint,
        bs.active_users::bigint,
        bs.completed_orders::bigint,
        bs.total_revenue
    FROM bot_statistics bs
    ORDER BY bs.total_orders DESC, bs.total_users DESC;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- 验证创建的视图和函数
SELECT 'Views created successfully' as status;
SELECT * FROM bot_statistics LIMIT 5;

-- 输出确认信息
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully created bot_statistics view and helper functions';
    RAISE NOTICE '📊 Use: SELECT * FROM bot_statistics to get all bot statistics';
    RAISE NOTICE '🔍 Use: SELECT * FROM get_bot_stats(''bot-uuid-here'') for single bot stats';
    RAISE NOTICE '📈 Use: SELECT * FROM get_all_bot_stats() for all bots stats';
END $$;
