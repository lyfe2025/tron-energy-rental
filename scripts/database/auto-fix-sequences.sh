#!/bin/bash

# 自动修复数据库序列同步问题
# 确保所有自增序列值始终大于表中的最大ID值

set -e

# 数据库连接配置
DB_URL="postgresql://postgres:postgres@localhost:5432/tron_energy_rental"

echo "🔧 开始检查和修复数据库序列同步问题..."

# 检查并修复序列的SQL
read -r -d '' FIX_SEQUENCES_SQL << 'EOF'
-- 动态查找所有需要修复的序列
DO $$
DECLARE
    rec RECORD;
    max_id INTEGER;
    current_seq_val INTEGER;
    table_name TEXT;
    sequence_name TEXT;
    column_name TEXT;
    fixed_count INTEGER := 0;
    checked_count INTEGER := 0;
BEGIN
    -- 查找所有使用序列的表和列
    FOR rec IN 
        SELECT 
            t.table_name,
            c.column_name,
            pg_get_serial_sequence(t.table_name, c.column_name) as sequence_name
        FROM 
            information_schema.tables t
        JOIN 
            information_schema.columns c ON t.table_name = c.table_name
        WHERE 
            t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND c.column_default LIKE 'nextval%'
            AND pg_get_serial_sequence(t.table_name, c.column_name) IS NOT NULL
    LOOP
        table_name := rec.table_name;
        column_name := rec.column_name;
        sequence_name := rec.sequence_name;
        
        checked_count := checked_count + 1;
        
        -- 获取表中最大ID
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', column_name, table_name) INTO max_id;
        
        -- 获取当前序列值
        EXECUTE format('SELECT last_value FROM %I', sequence_name) INTO current_seq_val;
        
        -- 如果序列值不大于最大ID，则调整序列
        IF current_seq_val <= max_id THEN
            PERFORM setval(sequence_name, max_id + 1, false);
            RAISE NOTICE '🔧 修复 %.%: 序列从 % 调整为 %', table_name, column_name, current_seq_val, max_id + 1;
            fixed_count := fixed_count + 1;
        ELSE
            RAISE NOTICE '✅ 正常 %.%: 序列值 %, 表最大ID %', table_name, column_name, current_seq_val, max_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '📊 检查完成: 共检查 % 个序列，修复 % 个', checked_count, fixed_count;
END $$;
EOF

# 执行修复
echo "📋 执行序列修复..."
psql "$DB_URL" -c "$FIX_SEQUENCES_SQL"

echo ""
echo "✅ 序列修复完成!"

# 验证结果 - 显示所有序列状态
echo ""
echo "📊 验证结果 - 当前序列状态:"
psql "$DB_URL" -c "
SELECT 
    schemaname,
    sequencename,
    last_value as current_value,
    is_called
FROM pg_sequences 
WHERE schemaname = 'public'
ORDER BY sequencename;
"

echo ""
echo "🎯 关键表序列状态详情:"
psql "$DB_URL" -c "
WITH sequence_status AS (
    SELECT 
        t.table_name,
        c.column_name,
        pg_get_serial_sequence(t.table_name, c.column_name) as sequence_name
    FROM 
        information_schema.tables t
    JOIN 
        information_schema.columns c ON t.table_name = c.table_name
    WHERE 
        t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.column_default LIKE 'nextval%'
        AND pg_get_serial_sequence(t.table_name, c.column_name) IS NOT NULL
)
SELECT 
    ss.table_name,
    ss.column_name,
    (SELECT last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename = substring(ss.sequence_name from '\"(.+)\"')) as seq_value,
    (SELECT ('SELECT MAX(' || ss.column_name || ') FROM ' || ss.table_name)::text) as max_query
FROM sequence_status ss
WHERE ss.table_name IN ('login_logs', 'menus', 'roles', 'role_permissions')
ORDER BY ss.table_name;
"

echo ""
echo "✨ 所有序列已检查和修复完成！"
