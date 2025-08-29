-- 重命名 telegram_users 表为 users
-- 此脚本将重命名表名并更新所有相关的外键约束

BEGIN;

-- 1. 重命名表
ALTER TABLE telegram_users RENAME TO users;

-- 2. 重命名约束
-- 重命名主键约束
ALTER TABLE users RENAME CONSTRAINT telegram_users_pkey TO users_pkey;

-- 重命名检查约束
ALTER TABLE users RENAME CONSTRAINT users_user_type_check TO users_user_type_check;
ALTER TABLE users RENAME CONSTRAINT users_login_type_check TO users_login_type_check;
ALTER TABLE users RENAME CONSTRAINT users_status_check TO users_status_check;

-- 重命名外键约束
ALTER TABLE users RENAME CONSTRAINT fk_users_referred_by TO fk_users_referred_by;
ALTER TABLE users RENAME CONSTRAINT telegram_users_agent_id_fkey TO users_agent_id_fkey;

-- 3. 更新其他表中引用 telegram_users 的外键约束
-- agent_applications 表
ALTER TABLE agent_applications DROP CONSTRAINT agent_applications_reviewed_by_fkey;
ALTER TABLE agent_applications ADD CONSTRAINT agent_applications_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES users(id);

ALTER TABLE agent_applications DROP CONSTRAINT agent_applications_user_id_fkey;
ALTER TABLE agent_applications ADD CONSTRAINT agent_applications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- agent_earnings 表
ALTER TABLE agent_earnings DROP CONSTRAINT agent_earnings_user_id_fkey;
ALTER TABLE agent_earnings ADD CONSTRAINT agent_earnings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- agents 表
ALTER TABLE agents DROP CONSTRAINT agents_approved_by_fkey;
ALTER TABLE agents ADD CONSTRAINT agents_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id);

ALTER TABLE agents DROP CONSTRAINT agents_user_id_fkey;
ALTER TABLE agents ADD CONSTRAINT agents_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- bot_users 表
ALTER TABLE bot_users DROP CONSTRAINT bot_users_user_id_fkey;
ALTER TABLE bot_users ADD CONSTRAINT bot_users_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- orders 表
ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- pricing_history 表
ALTER TABLE pricing_history DROP CONSTRAINT pricing_history_changed_by_fkey;
ALTER TABLE pricing_history ADD CONSTRAINT pricing_history_changed_by_fkey 
    FOREIGN KEY (changed_by) REFERENCES users(id);

-- telegram_bots 表
ALTER TABLE telegram_bots DROP CONSTRAINT telegram_bots_created_by_fkey;
ALTER TABLE telegram_bots ADD CONSTRAINT telegram_bots_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id);

-- user_level_changes 表
ALTER TABLE user_level_changes DROP CONSTRAINT user_level_changes_user_id_fkey;
ALTER TABLE user_level_changes ADD CONSTRAINT user_level_changes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. 重命名触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- 验证重命名是否成功
SELECT 'Table renamed successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public';