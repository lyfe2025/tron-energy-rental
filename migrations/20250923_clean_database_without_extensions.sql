-- 无扩展依赖的数据库初始化脚本
-- 此脚本用于新部署，不依赖任何PostgreSQL扩展
-- 所有UUID生成使用PostgreSQL 13+内置的gen_random_uuid()函数

-- 检查PostgreSQL版本
DO $$
BEGIN
    IF version() !~ 'PostgreSQL 1[3-9]' AND version() !~ 'PostgreSQL [2-9][0-9]' THEN
        RAISE EXCEPTION 'PostgreSQL版本必须是13或更高版本才支持gen_random_uuid()函数. 当前版本: %', version();
    END IF;
    
    RAISE NOTICE '=== 无扩展依赖数据库初始化 ===';
    RAISE NOTICE 'PostgreSQL版本: %', split_part(version(), ' ', 2);
    RAISE NOTICE '使用内置gen_random_uuid()函数生成UUID';
    RAISE NOTICE '无需安装任何额外扩展';
    RAISE NOTICE '===========================';
END $$;

-- 测试gen_random_uuid()函数可用性
DO $$
DECLARE
    test_uuid uuid;
BEGIN
    SELECT gen_random_uuid() INTO test_uuid;
    RAISE NOTICE '✓ gen_random_uuid()函数测试成功: %', test_uuid;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'gen_random_uuid()函数不可用。请确保PostgreSQL版本为13或更高。错误: %', SQLERRM;
END $$;

-- 以下是新部署的建议模板（仅作为参考）
-- 实际的表结构请参考最新的迁移文件

/*
-- 示例表结构（使用gen_random_uuid()）
CREATE TABLE example_table (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 主要优势：
-- 1. 无需CREATE EXTENSION命令
-- 2. 无扩展版本兼容性问题  
-- 3. 部署更简单
-- 4. 性能更好（内置函数）
-- 5. 减少部署依赖

-- 注意事项：
-- 1. 要求PostgreSQL 13+
-- 2. gen_random_uuid()与uuid_generate_v4()生成的UUID格式完全兼容
-- 3. 现有数据不会受到影响
-- 4. 只影响新插入记录的UUID生成方式
*/

RAISE NOTICE '=== 初始化完成 ===';
RAISE NOTICE '✓ 数据库已准备就绪，无扩展依赖';
RAISE NOTICE '✓ UUID生成使用内置函数';
RAISE NOTICE '✓ 适合生产环境部署';
RAISE NOTICE '===================';
