-- 删除bot_users表 - 功能与users表重叠
-- 创建时间: 2025-09-05
-- 作者: 数据库优化项目
-- 说明: bot_users表主要用于机器人用户关联，但users表已包含telegram_id等字段可实现相同功能
--       且bot_users表目前无数据，可安全删除

-- 开始事务
BEGIN;

-- 1. 删除相关的外键约束（如果存在）
ALTER TABLE IF EXISTS bot_users DROP CONSTRAINT IF EXISTS bot_users_user_id_fkey;
ALTER TABLE IF EXISTS bot_users DROP CONSTRAINT IF EXISTS bot_users_bot_id_fkey;

-- 2. 删除相关索引（如果存在）
DROP INDEX IF EXISTS idx_bot_users_user_id;
DROP INDEX IF EXISTS idx_bot_users_bot_id;
DROP INDEX IF EXISTS idx_bot_users_telegram_chat_id;
DROP INDEX IF EXISTS idx_bot_users_status;
DROP INDEX IF EXISTS idx_bot_users_created_at;

-- 3. 删除bot_users表
DROP TABLE IF EXISTS bot_users CASCADE;

-- 4. 验证删除结果
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_users') THEN
        RAISE EXCEPTION 'bot_users表删除失败';
    ELSE
        RAISE NOTICE 'bot_users表已成功删除';
    END IF;
END $$;

-- 提交事务
COMMIT;

-- 操作完成提示
SELECT 'bot_users表删除完成，数据库结构已优化' as result;