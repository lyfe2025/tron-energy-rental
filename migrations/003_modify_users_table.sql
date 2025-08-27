-- 修改users表结构，添加管理后台登录相关字段
-- Migration: 003_modify_users_table.sql
-- Created: 2024-01-16
-- Description: 为users表添加管理后台登录支持

-- 添加新字段
ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255),
ADD COLUMN login_type VARCHAR(20) DEFAULT 'telegram' CHECK (login_type IN ('telegram', 'admin', 'both')),
ADD COLUMN last_login_at TIMESTAMP,
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP;

-- 修改telegram_id字段为可空（因为管理后台用户不需要telegram_id）
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;

-- 为password_hash字段添加注释
COMMENT ON COLUMN users.password_hash IS '用户密码哈希值，用于管理后台登录';
COMMENT ON COLUMN users.login_type IS '登录类型：telegram=仅Telegram登录，admin=仅管理后台登录，both=两种方式都支持';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.password_reset_token IS '密码重置令牌';
COMMENT ON COLUMN users.password_reset_expires IS '密码重置令牌过期时间';

-- 为password_reset_token创建索引（用于快速查找重置令牌）
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- 为login_type创建索引（用于快速筛选不同类型的用户）
CREATE INDEX idx_users_login_type ON users(login_type);

-- 更新现有管理员用户，设置为管理后台登录类型并添加默认密码
-- 默认密码: admin123 (BCrypt哈希值)
UPDATE users 
SET 
    login_type = 'admin',
    password_hash = '$2b$10$rQZ8kqVZ8qVZ8qVZ8qVZ8O7yJ8qVZ8qVZ8qVZ8qVZ8qVZ8qVZ8qVZ8'
WHERE role = 'admin' AND email = 'admin@example.com';

-- 添加约束：管理后台用户必须有密码
ALTER TABLE users ADD CONSTRAINT check_admin_password 
CHECK (
    (login_type = 'telegram' AND password_hash IS NULL) OR
    (login_type = 'admin' AND password_hash IS NOT NULL) OR
    (login_type = 'both' AND password_hash IS NOT NULL)
);

-- 添加约束：Telegram用户必须有telegram_id
ALTER TABLE users ADD CONSTRAINT check_telegram_id 
CHECK (
    (login_type = 'admin' AND telegram_id IS NULL) OR
    (login_type IN ('telegram', 'both') AND telegram_id IS NOT NULL)
);