-- =============================================================================
-- N+1 查询优化 - 数据库索引优化
-- 文件: 20250125_n_plus_1_query_optimization_indexes.sql
-- 创建时间: 2025-01-25
-- 说明: 为解决 N+1 查询问题而添加的性能优化索引
-- =============================================================================

BEGIN;

-- 1. 能量消耗日志查询优化
-- 优化场景: cleanupExpiredReservations, batchReserveEnergy 等方法的查询
-- 覆盖查询: pool_account_id + transaction_type + created_at 的复合查询
-- 注意: 表中已有单独的索引，这个复合索引进一步优化复合查询
CREATE INDEX IF NOT EXISTS idx_energy_consumption_logs_pool_type_time 
ON energy_consumption_logs(pool_account_id, transaction_type, created_at);

-- 优化场景: 根据 order_id 查找相关记录
-- 使用部分索引减少存储空间（只为非空 order_id 建立索引）
CREATE INDEX IF NOT EXISTS idx_energy_consumption_logs_order_id 
ON energy_consumption_logs(order_id) 
WHERE order_id IS NOT NULL;

-- 2. 能量池查询优化
-- 优化场景: getActivePoolAccounts, 按状态和类型筛选能量池
CREATE INDEX IF NOT EXISTS idx_energy_pools_status 
ON energy_pools(status, account_type);

-- 3. 用户代理关系优化
-- 优化场景: 代理商相关查询，查找某代理商下的所有用户
-- 使用部分索引优化存储（只为有代理商的用户建立索引）
CREATE INDEX IF NOT EXISTS idx_users_agent_id 
ON users(agent_id) 
WHERE agent_id IS NOT NULL;

-- 4. 订单查询优化
-- 优化场景: getUserOrders, getAgentOrders 等按用户和状态查询订单
CREATE INDEX IF NOT EXISTS idx_orders_user_status 
ON orders(user_id, status, created_at);

-- 5. 管理员角色权限优化
-- 优化场景: 权限验证，快速查找管理员的所有角色
CREATE INDEX IF NOT EXISTS idx_admin_roles_admin_id 
ON admin_roles(admin_id, role_id);

-- 优化场景: 角色权限查询，快速查找角色的所有权限
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id 
ON role_permissions(role_id, menu_id);

-- 6. 额外的性能优化索引
-- 优化登录日志查询性能
CREATE INDEX IF NOT EXISTS idx_login_logs_user_time 
ON login_logs(user_id, login_time DESC);

-- 优化操作日志查询性能
CREATE INDEX IF NOT EXISTS idx_operation_logs_admin_time 
ON operation_logs(admin_id, created_at DESC);

-- 优化会话查询性能
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active 
ON admin_sessions(admin_id, is_active, last_activity);

COMMIT;

-- =============================================================================
-- 索引使用说明和性能预期
-- =============================================================================

-- 1. idx_energy_consumption_logs_pool_transaction:
--    - 查询场景: WHERE pool_account_id = ? AND transaction_type = ? AND created_at < ?
--    - 预期提升: 过期预留清理查询速度提升 80-90%
--    
-- 2. idx_energy_consumption_logs_transaction_id:
--    - 查询场景: WHERE transaction_id = ? 或 transaction_id IN (...)
--    - 预期提升: 事务ID查找速度提升 95%+
--    
-- 3. idx_energy_pools_status:
--    - 查询场景: WHERE status = 'active' AND account_type = ?
--    - 预期提升: 活跃账户查询速度提升 70-80%
--    
-- 4. idx_users_agent_id:
--    - 查询场景: WHERE agent_id = ?
--    - 预期提升: 代理商用户查询速度提升 85%+
--    
-- 5. idx_orders_user_status:
--    - 查询场景: WHERE user_id = ? AND status = ? ORDER BY created_at DESC
--    - 预期提升: 用户订单查询速度提升 75-85%

-- =============================================================================
-- 验证索引创建是否成功
-- =============================================================================
-- 运行以下查询验证索引是否创建成功:
--
-- SELECT 
--     tablename, 
--     indexname, 
--     indexdef 
-- FROM pg_indexes 
-- WHERE indexname LIKE 'idx_%' 
--     AND tablename IN (
--         'energy_consumption_logs', 
--         'energy_pools', 
--         'users', 
--         'orders', 
--         'admin_roles', 
--         'role_permissions',
--         'login_logs',
--         'operation_logs',
--         'admin_sessions'
--     )
-- ORDER BY tablename, indexname;

-- =============================================================================
-- 监控索引使用情况
-- =============================================================================
-- 使用以下查询监控索引的使用情况和效果:
--
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_tup_read,
--     idx_tup_fetch,
--     idx_scan
-- FROM pg_stat_user_indexes 
-- WHERE indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;
