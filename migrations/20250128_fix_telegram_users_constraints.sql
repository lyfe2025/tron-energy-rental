-- 修复telegram_users表的约束问题
-- Migration: 20250128_fix_telegram_users_constraints.sql
-- Created: 2025-01-28
-- Description: 修复telegram_users表user_type字段的约束问题

-- 1. 删除可能存在的错误约束
ALTER TABLE telegram_users DROP CONSTRAINT IF EXISTS telegram_users_user_type_check;

-- 2. 检查并更新不符合约束的数据
-- 将所有不在允许列表中的值更新为'normal'
UPDATE telegram_users 
SET user_type = 'normal' 
WHERE user_type NOT IN ('normal', 'vip', 'premium', 'agent', 'admin');

-- 3. 重新添加正确的约束
ALTER TABLE telegram_users ADD CONSTRAINT telegram_users_user_type_check 
CHECK (user_type IN ('normal', 'vip', 'premium', 'agent', 'admin'));

-- 4. 验证约束是否正确添加
-- 这个查询应该返回所有有效的user_type值
SELECT DISTINCT user_type FROM telegram_users ORDER BY user_type;