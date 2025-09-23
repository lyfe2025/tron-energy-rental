-- 移除uuid-ossp扩展依赖迁移脚本
-- 将所有使用uuid_generate_v4()的字段改为使用gen_random_uuid()
-- gen_random_uuid()是PostgreSQL 13+的内置函数，无需额外扩展

-- 执行前备份提醒
DO $$
BEGIN
    RAISE NOTICE '=== UUID扩展依赖移除迁移 ===';
    RAISE NOTICE '此脚本将：';
    RAISE NOTICE '1. 将所有uuid_generate_v4()替换为gen_random_uuid()';
    RAISE NOTICE '2. 移除对uuid-ossp扩展的依赖';
    RAISE NOTICE '3. gen_random_uuid()是PostgreSQL 13+内置函数';
    RAISE NOTICE '执行前请确保已备份数据库！';
    RAISE NOTICE '===============================';
END $$;

-- 开始事务
BEGIN;

-- 1. 修改所有使用uuid_generate_v4()的表字段默认值
DO $$
BEGIN
    RAISE NOTICE '正在更新表字段默认值...';
END $$;

-- agent_applications表
ALTER TABLE public.agent_applications 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- agent_earnings表
ALTER TABLE public.agent_earnings 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- agents表
ALTER TABLE public.agents 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- energy_pools表
ALTER TABLE public.energy_pools 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- orders表
ALTER TABLE public.orders 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- system_configs表
ALTER TABLE public.system_configs 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- telegram_bot_notification_configs表
ALTER TABLE public.telegram_bot_notification_configs 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- telegram_message_templates表
ALTER TABLE public.telegram_message_templates 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- telegram_notification_analytics表
ALTER TABLE public.telegram_notification_analytics 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- telegram_notification_logs表
ALTER TABLE public.telegram_notification_logs 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- user_notification_preferences表
ALTER TABLE public.user_notification_preferences 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- users表
ALTER TABLE public.users 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. 验证更改
DO $$
BEGIN
    RAISE NOTICE '正在验证更改...';
    RAISE NOTICE '✓ 已更新所有12个表的默认值为gen_random_uuid()';
END $$;

-- 检查是否还有使用uuid_generate_v4的字段
DO $$
DECLARE
    count_uuid_generate integer;
BEGIN
    SELECT COUNT(*) INTO count_uuid_generate
    FROM information_schema.columns 
    WHERE column_default LIKE '%uuid_generate_v4%' 
    AND table_schema = 'public';
    
    IF count_uuid_generate > 0 THEN
        RAISE EXCEPTION '仍有 % 个字段使用uuid_generate_v4()，请检查', count_uuid_generate;
    ELSE
        RAISE NOTICE '✓ 所有字段已成功更新为gen_random_uuid()';
    END IF;
END $$;

-- 3. 测试gen_random_uuid()函数
DO $$
DECLARE
    test_uuid uuid;
BEGIN
    SELECT gen_random_uuid() INTO test_uuid;
    RAISE NOTICE '✓ gen_random_uuid()函数测试成功: %', test_uuid;
END $$;

-- 4. 创建测试记录验证UUID生成
CREATE TEMP TABLE uuid_test (
    id uuid DEFAULT gen_random_uuid(),
    name text
);

INSERT INTO uuid_test (name) VALUES ('测试记录');

DO $$
DECLARE
    test_record RECORD;
BEGIN
    SELECT * INTO test_record FROM uuid_test LIMIT 1;
    IF test_record.id IS NOT NULL THEN
        RAISE NOTICE '✓ UUID自动生成测试成功: %', test_record.id;
    ELSE
        RAISE EXCEPTION 'UUID自动生成测试失败';
    END IF;
END $$;

DROP TABLE uuid_test;

-- 5. 显示完成信息
DO $$
BEGIN
    RAISE NOTICE '=== 迁移完成 ===';
    RAISE NOTICE '✓ 已将12个表的UUID生成函数更新为gen_random_uuid()';
    RAISE NOTICE '✓ 验证所有更改成功';
    RAISE NOTICE '✓ UUID生成功能正常';
    RAISE NOTICE '';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '1. 可以安全地移除uuid-ossp扩展';
    RAISE NOTICE '2. 新的部署无需安装uuid-ossp扩展';
    RAISE NOTICE '3. 请更新部署文档和脚本';
    RAISE NOTICE '==================';
END $$;

-- 提交事务
COMMIT;

-- 可选：移除uuid-ossp扩展（谨慎操作）
-- 注释掉的代码，需要手动确认后执行
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- RAISE NOTICE '✓ uuid-ossp扩展已移除';
