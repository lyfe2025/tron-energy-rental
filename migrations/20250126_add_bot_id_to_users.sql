-- 为用户表添加机器人ID字段
-- 文件: 20250126_add_bot_id_to_users.sql
-- 作者: AI Assistant
-- 创建时间: 2025-01-26
-- 说明: 在users表中添加bot_id字段，用于统计每个机器人的用户数

-- 开始事务
BEGIN;

-- 1. 添加 bot_id 字段到 users 表
ALTER TABLE users 
ADD COLUMN bot_id uuid REFERENCES telegram_bots(id);

-- 2. 添加字段注释
COMMENT ON COLUMN users.bot_id IS '关联的机器人ID（如果用户是通过机器人注册的）';

-- 3. 创建索引以提升查询性能
CREATE INDEX idx_users_bot_id ON users(bot_id);

-- 4. 创建复合索引用于统计查询
CREATE INDEX idx_users_bot_id_status ON users(bot_id, status);

-- 5. 为现有用户数据设置默认机器人（可选，根据业务需求调整）
-- 如果有默认机器人，可以取消注释并修改机器人ID
-- UPDATE users 
-- SET bot_id = 'your-default-bot-id-here' 
-- WHERE bot_id IS NULL AND login_type = 'telegram';

COMMIT;

-- 验证更改
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'bot_id';

-- 输出确认信息
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added bot_id column to users table';
    RAISE NOTICE '📊 You can now track users per bot using: SELECT bot_id, COUNT(*) FROM users GROUP BY bot_id';
    RAISE NOTICE '🔧 Remember to update your application code to set bot_id when creating users';
END $$;
