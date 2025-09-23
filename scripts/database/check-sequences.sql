-- 检查所有序列状态的脚本
-- 用于监控序列是否与表数据同步

SELECT 
    ps.sequencename as "序列名",
    ps.last_value as "当前序列值",
    t.relname as "关联表",
    a.attname as "关联列",
    -- 动态获取表中该列的最大值（这里只是显示，实际需要单独查询）
    CASE 
        WHEN ps.last_value >= (
            SELECT COALESCE(MAX(CAST(substring(pg_get_expr(d.adbin, d.adrelid) from E'nextval\\(''([^'']+)') AS TEXT), 0)), 0)
            FROM pg_attrdef d 
            WHERE d.adrelid = t.oid AND d.adnum = a.attnum
        ) THEN '✓ 正常'
        ELSE '⚠ 需要同步'
    END as "状态"
FROM pg_sequences ps
JOIN pg_class s ON s.relname = ps.sequencename AND s.relkind = 'S'
JOIN pg_depend d ON d.objid = s.oid
JOIN pg_class t ON d.refobjid = t.oid  
JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum)
WHERE ps.schemaname = 'public'
AND t.relkind = 'r'
ORDER BY ps.sequencename;
