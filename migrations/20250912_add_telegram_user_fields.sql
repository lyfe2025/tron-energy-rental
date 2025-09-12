-- 为users表添加完整的Telegram用户信息字段
-- 文件: 20250912_add_telegram_user_fields.sql
-- 作者: AI Assistant  
-- 创建时间: 2025-01-29
-- 说明: 添加language_code和is_premium字段以保存完整的Telegram用户信息

-- 开始事务
BEGIN;

-- 1. 添加 language_code 字段
ALTER TABLE users 
ADD COLUMN language_code character varying(10);

-- 2. 添加 is_premium 字段
ALTER TABLE users 
ADD COLUMN is_premium boolean DEFAULT false;

-- 3. 添加字段注释
COMMENT ON COLUMN users.language_code IS 'Telegram用户的IETF语言代码（如：zh-CN, en, zh等）';
COMMENT ON COLUMN users.is_premium IS 'Telegram Premium用户标识';

-- 4. 创建索引以提升查询性能
CREATE INDEX idx_users_language_code ON users(language_code) WHERE language_code IS NOT NULL;
CREATE INDEX idx_users_is_premium ON users(is_premium) WHERE is_premium = true;

-- 5. 创建复合索引用于机器人用户统计
CREATE INDEX idx_users_bot_language ON users(bot_id, language_code) WHERE bot_id IS NOT NULL AND language_code IS NOT NULL;

COMMIT;

-- 验证更改
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('language_code', 'is_premium')
ORDER BY column_name;

-- 输出确认信息
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added Telegram user fields to users table';
    RAISE NOTICE '📊 New fields: language_code (varchar(10)), is_premium (boolean)';
    RAISE NOTICE '🔧 Remember to update UserAuthService to save these fields';
END $$;
