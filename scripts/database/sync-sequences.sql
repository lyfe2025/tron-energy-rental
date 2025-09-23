-- 自动同步所有序列值的通用脚本
-- 解决主键冲突问题，避免"duplicate key value violates unique constraint"错误

-- 专门同步login_logs表的序列
SELECT setval('login_logs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM login_logs));

-- 通用序列同步函数
DO $$
DECLARE
    seq_info RECORD;
    max_val BIGINT;
    table_name TEXT;
    column_name TEXT;
BEGIN
    -- 同步所有常见的序列
    FOR seq_info IN 
        SELECT 
            s.relname as seq_name,
            t.relname as table_name,
            a.attname as column_name
        FROM pg_class s
        JOIN pg_depend d ON d.objid = s.oid
        JOIN pg_class t ON d.refobjid = t.oid
        JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum)
        WHERE s.relkind = 'S'
        AND t.relkind = 'r'
        AND s.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        table_name := seq_info.table_name;
        column_name := seq_info.column_name;
        
        -- 获取表中该列的最大值
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', column_name, table_name) INTO max_val;
        
        -- 如果表中有数据，设置序列值
        IF max_val > 0 THEN
            EXECUTE format('SELECT setval(%L, %s)', seq_info.seq_name, max_val);
            RAISE NOTICE '已同步序列 % 到值 % (表: %.%)', seq_info.seq_name, max_val, table_name, column_name;
        END IF;
    END LOOP;
END $$;

-- 显示所有序列的当前状态
SELECT 
    s.relname as "序列名",
    s.last_value as "当前序列值",
    t.relname as "关联表",
    a.attname as "关联列"
FROM pg_class s
JOIN pg_depend d ON d.objid = s.oid
JOIN pg_class t ON d.refobjid = t.oid  
JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum)
JOIN pg_sequences ps ON ps.sequencename = s.relname
WHERE s.relkind = 'S'
AND t.relkind = 'r'
AND s.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY s.relname;
