#!/bin/bash

# 简单的序列检查和修复脚本
# 专门用于检查和修复login_logs表的序列问题

DB_URL="postgresql://postgres:postgres@localhost:5432/tron_energy_rental"

echo "🔍 检查login_logs序列状态..."

# 获取当前状态
RESULT=$(psql "$DB_URL" -t -c "
SELECT 
    last_value as seq_val,
    (SELECT MAX(id) FROM login_logs) as max_id,
    last_value - (SELECT MAX(id) FROM login_logs) as margin
FROM login_logs_id_seq;
")

echo "当前状态: $RESULT"

# 检查是否需要修复
NEEDS_FIX=$(psql "$DB_URL" -t -c "
SELECT CASE 
    WHEN last_value <= (SELECT MAX(id) FROM login_logs) THEN 'true'
    ELSE 'false'
END
FROM login_logs_id_seq;
")

if [[ "$NEEDS_FIX" == *"true"* ]]; then
    echo "⚠️  序列需要修复！"
    echo "🔧 正在修复序列..."
    
    psql "$DB_URL" -c "SELECT setval('login_logs_id_seq', (SELECT MAX(id) FROM login_logs) + 1);"
    
    echo "✅ 序列修复完成！"
    
    # 显示修复后状态
    psql "$DB_URL" -c "
    SELECT 
        'login_logs' as table_name,
        last_value as sequence_value,
        (SELECT MAX(id) FROM login_logs) as max_table_id,
        last_value - (SELECT MAX(id) FROM login_logs) as safe_margin
    FROM login_logs_id_seq;
    "
else
    echo "✅ 序列状态正常，无需修复"
fi

echo ""
echo "🧪 测试插入下一个ID..."
NEXT_ID=$(psql "$DB_URL" -t -c "SELECT nextval('login_logs_id_seq');")
echo "下次插入将使用ID: $NEXT_ID"

# 重置序列到正确位置（因为我们刚才测试性地调用了nextval）
psql "$DB_URL" -c "SELECT setval('login_logs_id_seq', (SELECT MAX(id) FROM login_logs) + 1);" > /dev/null

echo "✨ 检查完成！"
