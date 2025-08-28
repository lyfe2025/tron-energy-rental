-- 将telegram_users表的role字段更新为user_type
-- Migration: 20250128_update_telegram_users_role_to_user_type.sql
-- Created: 2025-01-28
-- Description: 将telegram_users表的role字段重命名为user_type，并更新相关约束和索引

-- 1. 添加新的user_type字段
ALTER TABLE telegram_users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50);

-- 2. 将现有role字段的值复制到user_type字段
UPDATE telegram_users SET user_type = role WHERE user_type IS NULL;

-- 3. 设置user_type字段的默认值和非空约束
ALTER TABLE telegram_users ALTER COLUMN user_type SET DEFAULT 'normal';
ALTER TABLE telegram_users ALTER COLUMN user_type SET NOT NULL;

-- 4. 添加user_type字段的检查约束
ALTER TABLE telegram_users ADD CONSTRAINT telegram_users_user_type_check 
CHECK (user_type IN ('normal', 'vip', 'premium', 'agent', 'admin'));

-- 5. 创建user_type字段的索引
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_type ON telegram_users(user_type);

-- 6. 删除旧的role字段约束和索引
DROP INDEX IF EXISTS idx_telegram_users_role;
ALTER TABLE telegram_users DROP CONSTRAINT IF EXISTS telegram_users_role_check;

-- 7. 删除role字段
ALTER TABLE telegram_users DROP COLUMN IF EXISTS role;

-- 8. 添加字段注释
COMMENT ON COLUMN telegram_users.user_type IS '用户类型：normal-普通用户，vip-VIP用户，premium-高级用户，agent-代理商，admin-管理员';

-- 9. 更新现有数据，将'user'角色更新为'normal'
UPDATE telegram_users SET user_type = 'normal' WHERE user_type = 'user';