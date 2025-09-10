-- =============================================================================
-- 📚 数据库对象实战查询脚本
-- =============================================================================
-- 
-- 本文件包含了用于探索和理解 TronResourceDev 项目数据库对象的实用查询
-- 配合《数据库对象详解.md》文档使用，让您亲自体验各种数据库对象
--
-- 使用方式：
-- 1. 在 psql 命令行中执行: \i docs/数据库对象实战查询.sql
-- 2. 在 Navicat 等图形化工具中分段执行
-- 3. 逐个复制查询到 SQL 编辑器执行
--
-- =============================================================================

-- 🎯 1. 查看数据库中的所有对象类型
-- =============================================================================
SELECT 
    '📊 基础统计' as category,
    '表 (Tables)' as object_type,
    count(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    '📊 基础统计',
    '视图 (Views)',
    count(*)
FROM information_schema.views 
WHERE table_schema = 'public'

UNION ALL

SELECT 
    '📊 基础统计',
    '函数 (Functions)',
    count(*)
FROM information_schema.routines 
WHERE routine_schema = 'public'

UNION ALL

SELECT 
    '📊 基础统计',
    '触发器 (Triggers)',
    count(*)
FROM information_schema.triggers 
WHERE trigger_schema = 'public'

UNION ALL

SELECT 
    '📊 基础统计',
    '序列 (Sequences)',
    count(*)
FROM information_schema.sequences 
WHERE sequence_schema = 'public'

UNION ALL

SELECT 
    '📊 基础统计',
    '索引 (Indexes)',
    count(*)
FROM pg_indexes 
WHERE schemaname = 'public'

ORDER BY object_type;

-- =============================================================================
-- 👁️ 2. 视图 (Views) 实战查询
-- =============================================================================

-- 2.1 查看所有视图的定义
SELECT 
    '👁️ 视图详情' as category,
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2.2 使用每日能量消耗视图
-- 查看最近7天的能量消耗统计
SELECT 
    '📈 能量消耗趋势' as report_type,
    *
FROM daily_energy_consumption 
WHERE consumption_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY consumption_date DESC;

-- 2.3 使用质押统计视图
-- 查看质押用户的统计信息
SELECT 
    '💰 质押统计' as report_type,
    s.*,
    -- 可以和其他表关联获取更多信息
    CASE 
        WHEN s.total_stake_amount > 10000 THEN '🏆 大户'
        WHEN s.total_stake_amount > 1000 THEN '🥈 中户'
        ELSE '🥉 小户'
    END as user_level
FROM stake_statistics s
ORDER BY s.total_stake_amount DESC
LIMIT 10;

-- =============================================================================
-- ⚙️ 3. 函数 (Functions) 实战查询
-- =============================================================================

-- 3.1 查看所有自定义函数
SELECT 
    '⚙️ 函数列表' as category,
    routine_name as function_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name NOT LIKE 'uuid_%'  -- 排除UUID扩展函数
ORDER BY routine_name;

-- 3.2 使用业务函数获取活跃机器人
SELECT 
    '🤖 活跃机器人' as query_type,
    bot_name,
    bot_username,
    last_activity_at,
    CASE 
        WHEN last_activity_at > NOW() - INTERVAL '1 hour' THEN '🟢 刚刚活跃'
        WHEN last_activity_at > NOW() - INTERVAL '24 hours' THEN '🟡 今日活跃'
        WHEN last_activity_at > NOW() - INTERVAL '7 days' THEN '🟠 本周活跃'
        ELSE '🔴 较久未活跃'
    END as activity_status
FROM get_active_bots()
ORDER BY last_activity_at DESC;

-- 3.3 获取价格变更统计（最近30天）
SELECT 
    '💹 价格变更统计' as query_type,
    action_type,
    change_count,
    latest_change,
    EXTRACT(days FROM NOW() - latest_change) as days_since_last_change
FROM get_pricing_change_stats(30)
ORDER BY change_count DESC;

-- =============================================================================
-- 🎯 4. 触发器 (Triggers) 探索
-- =============================================================================

-- 4.1 查看所有触发器及其关联的表
SELECT 
    '🎯 触发器列表' as category,
    t.trigger_name,
    t.event_object_table as table_name,
    t.action_timing,  -- BEFORE, AFTER, INSTEAD OF
    t.event_manipulation, -- INSERT, UPDATE, DELETE
    t.action_statement -- 执行的函数
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;

-- 4.2 查看触发器函数的定义
SELECT 
    '🔧 触发器函数' as category,
    routine_name as function_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND data_type = 'trigger'
ORDER BY routine_name;

-- 4.3 测试自动时间戳触发器（仅查询，不实际修改）
-- 这个查询展示触发器如何工作，但不会真的修改数据
SELECT 
    '⏰ 时间戳测试' as demo_type,
    'users表更新时会自动设置updated_at时间戳' as explanation,
    '示例: UPDATE users SET name = ''新名称'' WHERE id = ''某个ID'';' as example_sql,
    '触发器会自动执行: NEW.updated_at = NOW();' as trigger_action;

-- =============================================================================
-- 🔢 5. 序列 (Sequences) 探索
-- =============================================================================

-- 5.1 查看所有序列及其当前状态
SELECT 
    '🔢 序列状态' as category,
    sequence_name,
    data_type,
    start_value,
    increment,
    max_value,
    min_value,
    cache_size,
    cycle
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 5.2 查看序列的当前值（不增加序列值）
-- 注意：这个查询只在序列已被使用后才能执行
SELECT 
    '📊 序列当前值' as category,
    'admins_id_seq' as sequence_name,
    currval('admins_id_seq') as current_value,
    '⚠️ 只有在序列被使用后才能查看当前值' as note
-- 如果序列从未被使用，这个查询会出错，可以注释掉
-- WHERE currval('admins_id_seq') IS NOT NULL;

-- 5.3 展示序列的工作原理（仅演示，不实际执行）
SELECT 
    '🎓 序列使用说明' as demo_type,
    'nextval(''序列名'')' as get_next_value,
    'currval(''序列名'')' as get_current_value,
    'setval(''序列名'', 新值)' as set_value,
    '序列确保多用户同时访问时的唯一性' as key_benefit;

-- =============================================================================
-- 📇 6. 索引 (Indexes) 分析
-- =============================================================================

-- 6.1 查看表的所有索引
SELECT 
    '📇 索引统计' as category,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6.2 分析索引使用情况（需要数据库有一定的查询负载）
SELECT 
    '🔍 索引性能分析' as category,
    schemaname,
    tablename,
    indexname,
    idx_tup_read,   -- 索引被读取的元组数
    idx_tup_fetch   -- 通过索引获取的表行数
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
    AND idx_tup_read > 0
ORDER BY idx_tup_read DESC;

-- 6.3 查找可能需要索引的查询（分析表大小）
SELECT 
    '📊 表大小分析' as category,
    schemaname,
    tablename,
    n_tup_ins as inserts,      -- 插入的行数
    n_tup_upd as updates,      -- 更新的行数
    n_tup_del as deletes,      -- 删除的行数
    n_live_tup as live_rows,   -- 活跃行数
    n_dead_tup as dead_rows    -- 死亡行数（需要VACUUM清理）
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- =============================================================================
-- 🔗 7. 约束 (Constraints) 探索
-- =============================================================================

-- 7.1 查看所有约束类型
SELECT 
    '🔗 约束统计' as category,
    constraint_type,
    count(*) as count
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public'
GROUP BY constraint_type
ORDER BY count DESC;

-- 7.2 查看外键约束关系
SELECT 
    '🔗 外键关系' as category,
    tc.constraint_name,
    tc.table_name as child_table,
    kcu.column_name as child_column,
    ccu.table_name as parent_table,
    ccu.column_name as parent_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 7.3 查看检查约束
SELECT 
    '✅ 检查约束' as category,
    cc.constraint_name,
    cc.table_name,
    cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
    ON cc.constraint_name = tc.constraint_name
WHERE tc.constraint_schema = 'public'
ORDER BY cc.table_name, cc.constraint_name;

-- =============================================================================
-- 🧩 8. 扩展 (Extensions) 和自定义类型
-- =============================================================================

-- 8.1 查看已安装的扩展
SELECT 
    '🧩 扩展列表' as category,
    extname as extension_name,
    extversion as version,
    extrelocatable as relocatable,
    extnamespace::regnamespace as schema
FROM pg_extension
ORDER BY extname;

-- 8.2 查看扩展提供的函数（以uuid-ossp为例）
SELECT 
    '🔑 UUID函数' as category,
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE 'uuid_%'
ORDER BY routine_name;

-- 8.3 测试UUID生成函数
SELECT 
    '🆔 UUID生成示例' as demo_type,
    uuid_generate_v4() as random_uuid,
    uuid_generate_v1() as time_based_uuid,
    uuid_nil() as nil_uuid;

-- 8.4 查看自定义枚举类型
SELECT 
    '🏷️ 自定义类型' as category,
    t.typname as type_name,
    e.enumlabel as enum_value,
    e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY t.typname, e.enumsortorder;

-- 8.5 查看使用自定义类型的表和字段
SELECT DISTINCT
    '📋 类型使用情况' as category,
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name as custom_type
FROM information_schema.columns c
WHERE c.table_schema = 'public' 
    AND c.data_type = 'USER-DEFINED'
ORDER BY c.table_name, c.column_name;

-- =============================================================================
-- 🚀 9. 综合应用示例
-- =============================================================================

-- 9.1 复杂业务查询示例：用户活跃度分析
WITH user_activity AS (
    SELECT 
        u.id,
        u.username,
        u.created_at,
        -- 使用函数和视图进行复杂分析
        COALESCE(s.total_stakes, 0) as stakes,
        COALESCE(s.total_stake_amount, 0) as stake_amount
    FROM users u
    LEFT JOIN stake_statistics s ON u.id = s.user_id
),
activity_levels AS (
    SELECT 
        *,
        CASE 
            WHEN stake_amount > 10000 THEN '🏆 VIP用户'
            WHEN stake_amount > 1000 THEN '🥈 活跃用户'
            WHEN stakes > 0 THEN '🥉 普通用户'
            ELSE '👤 新用户'
        END as user_level,
        -- 使用日期函数分析用户注册时间
        EXTRACT(days FROM NOW() - created_at) as days_since_registration
    FROM user_activity
)
SELECT 
    '🎯 用户分析报告' as report_type,
    user_level,
    count(*) as user_count,
    avg(stake_amount) as avg_stake_amount,
    avg(days_since_registration) as avg_days_registered
FROM activity_levels
GROUP BY user_level
ORDER BY avg_stake_amount DESC;

-- 9.2 性能监控查询：找出可能需要优化的查询
SELECT 
    '📊 性能监控' as category,
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as seq_rows_read,
    idx_scan as index_scans,
    idx_tup_fetch as idx_rows_fetched,
    CASE 
        WHEN seq_scan > idx_scan THEN '⚠️ 可能需要添加索引'
        WHEN seq_scan = 0 AND idx_scan > 0 THEN '✅ 索引使用良好'
        ELSE '📈 需要进一步分析'
    END as suggestion
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY seq_tup_read DESC;

-- =============================================================================
-- 📝 10. 学习建议和下一步
-- =============================================================================

SELECT 
    '🎓 学习路径建议' as category,
    '1. 先理解基本概念：表、视图、函数' as step_1,
    '2. 实践查询：使用项目中的视图和函数' as step_2,
    '3. 观察触发器：修改数据后检查自动更新' as step_3,
    '4. 性能优化：学习索引和查询优化' as step_4,
    '5. 高级特性：扩展、自定义类型、存储过程' as step_5

UNION ALL

SELECT 
    '🚀 实践建议',
    '定期执行这些查询，观察数据库对象的使用情况',
    '在测试环境中尝试创建自己的视图和函数',
    '学习阅读执行计划，理解查询性能',
    '关注数据库日志，发现性能问题',
    '参与数据库设计讨论，应用学到的知识';

-- =============================================================================
-- ✅ 查询脚本执行完成
-- =============================================================================

SELECT 
    '🎉 恭喜！' as message,
    '您已经完成了数据库对象的实战探索' as achievement,
    '现在您对数据库的理解更加深入了' as result,
    '继续实践和学习，成为数据库专家！' as encouragement;
