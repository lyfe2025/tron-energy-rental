-- 修改用户类型约束，只保留三种角色：normal, vip, premium
-- 移除 agent 和 admin 类型

-- 首先将现有的 agent 和 admin 用户类型更新为 normal
UPDATE users 
SET user_type = 'normal' 
WHERE user_type IN ('agent', 'admin');

-- 删除现有的约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- 添加新的约束，只包含三种用户类型
ALTER TABLE users ADD CONSTRAINT users_user_type_check 
CHECK (user_type::text = ANY (ARRAY['normal'::character varying, 'vip'::character varying, 'premium'::character varying]::text[]));

-- 同时修改状态约束，只保留 active 和 banned
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check 
CHECK (status::text = ANY (ARRAY['active'::character varying, 'banned'::character varying]::text[]));

-- 将现有的 inactive 状态更新为 active
UPDATE users 
SET status = 'active' 
WHERE status = 'inactive';