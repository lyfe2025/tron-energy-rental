-- 修复所有表的序列同步问题
-- 确保自增序列值始终大于表中的最大ID值

-- 修复 login_logs 表的序列
DO $$
DECLARE
    max_id INTEGER;
    current_seq_val INTEGER;
BEGIN
    -- 获取表中最大ID
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM login_logs;
    
    -- 获取当前序列值
    SELECT last_value INTO current_seq_val FROM login_logs_id_seq;
    
    -- 如果序列值不大于最大ID，则调整序列
    IF current_seq_val <= max_id THEN
        PERFORM setval('login_logs_id_seq', max_id + 1, false);
        RAISE NOTICE '✅ login_logs序列已修复: 从 % 调整为 %', current_seq_val, max_id + 1;
    ELSE
        RAISE NOTICE '✅ login_logs序列正常: 当前值 %, 表最大ID %', current_seq_val, max_id;
    END IF;
END $$;

-- 为所有使用序列的表创建通用修复函数
CREATE OR REPLACE FUNCTION fix_sequence_sync(table_name TEXT, sequence_name TEXT, id_column TEXT DEFAULT 'id')
RETURNS TEXT AS $$
DECLARE
    max_id INTEGER;
    current_seq_val INTEGER;
    sql_text TEXT;
BEGIN
    -- 动态获取表中最大ID
    sql_text := format('SELECT COALESCE(MAX(%I), 0) FROM %I', id_column, table_name);
    EXECUTE sql_text INTO max_id;
    
    -- 获取当前序列值
    sql_text := format('SELECT last_value FROM %I', sequence_name);
    EXECUTE sql_text INTO current_seq_val;
    
    -- 如果序列值不大于最大ID，则调整序列
    IF current_seq_val <= max_id THEN
        PERFORM setval(sequence_name, max_id + 1, false);
        RETURN format('✅ %s序列已修复: 从 %s 调整为 %s', table_name, current_seq_val, max_id + 1);
    ELSE
        RETURN format('✅ %s序列正常: 当前值 %s, 表最大ID %s', table_name, current_seq_val, max_id);
    END IF;
END $$ LANGUAGE plpgsql;

-- 修复所有需要的表序列
SELECT fix_sequence_sync('login_logs', 'login_logs_id_seq');
SELECT fix_sequence_sync('menus', 'menus_id_seq');
SELECT fix_sequence_sync('roles', 'roles_id_seq');
SELECT fix_sequence_sync('permissions', 'permissions_id_seq');
SELECT fix_sequence_sync('role_permissions', 'role_permissions_id_seq');
SELECT fix_sequence_sync('admin_role_assignments', 'admin_role_assignments_id_seq');

-- 验证修复结果
SELECT 
    'login_logs' as table_name,
    (SELECT last_value FROM login_logs_id_seq) as sequence_value,
    (SELECT MAX(id) FROM login_logs) as max_table_id,
    (SELECT last_value FROM login_logs_id_seq) - (SELECT MAX(id) FROM login_logs) as safe_margin;
