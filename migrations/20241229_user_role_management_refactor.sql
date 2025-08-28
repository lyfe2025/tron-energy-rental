-- 用户角色管理系统重构数据库迁移
-- 创建新的表结构并修改现有users表

-- 1. 创建代理商表 (agents)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telegram_id VARCHAR(50),
    commission_rate DECIMAL(5,4) DEFAULT 0.0000,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建代理商表索引
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_telegram_id ON agents(telegram_id);

-- 2. 创建代理商定价表 (agent_pricing)
CREATE TABLE IF NOT EXISTS agent_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    energy_type VARCHAR(50) NOT NULL,
    purchase_price DECIMAL(10,6) NOT NULL,
    selling_price DECIMAL(10,6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, energy_type)
);

-- 创建代理商定价表索引
CREATE INDEX IF NOT EXISTS idx_agent_pricing_agent_id ON agent_pricing(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_pricing_energy_type ON agent_pricing(energy_type);

-- 3. 创建管理员角色表 (admin_roles)
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建管理员角色表索引
CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);

-- 4. 创建管理员表 (admins)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建管理员表索引
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

-- 5. 创建管理员权限表 (admin_permissions)
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id, role_id)
);

-- 创建管理员权限表索引
CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_role_id ON admin_permissions(role_id);

-- 6. 创建审计日志表 (audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建审计日志表索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 7. 修改现有users表
-- 首先备份现有数据，然后重命名表
DO $$
BEGIN
    -- 检查是否已经重命名过
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- 重命名users表为telegram_users
        ALTER TABLE users RENAME TO telegram_users;
        
        -- 修改role字段的约束
        ALTER TABLE telegram_users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE telegram_users ADD CONSTRAINT telegram_users_role_check 
            CHECK (role IN ('normal', 'package', 'vip'));
        
        -- 添加agent_id字段
        ALTER TABLE telegram_users ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);
        
        -- 添加索引
        CREATE INDEX IF NOT EXISTS idx_telegram_users_agent_id ON telegram_users(agent_id);
        CREATE INDEX IF NOT EXISTS idx_telegram_users_role ON telegram_users(role);
        CREATE INDEX IF NOT EXISTS idx_telegram_users_status ON telegram_users(status);
        
        -- 更新现有用户的角色值
        UPDATE telegram_users SET role = 'normal' WHERE role = 'user';
    END IF;
END $$;

-- 8. 插入默认管理员角色
INSERT INTO admin_roles (name, description, permissions) VALUES
('super_admin', '超级管理员', '["all"]'),
('admin', '普通管理员', '["users.read", "users.write", "orders.read", "statistics.read"]'),
('operator', '运营管理员', '["users.read", "agents.read", "agents.write", "statistics.read"]'),
('customer_service', '客服管理员', '["users.read", "orders.read", "orders.write"]')
ON CONFLICT (name) DO NOTHING;

-- 9. 创建默认超级管理员账户
-- 注意：密码hash需要在应用层生成，这里使用占位符
INSERT INTO admins (username, email, password_hash, role) VALUES
('superadmin', 'admin@tronrental.com', '$2b$10$placeholder_hash_will_be_updated', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- 10. 为超级管理员分配权限
INSERT INTO admin_permissions (admin_id, role_id)
SELECT a.id, r.id
FROM admins a, admin_roles r
WHERE a.username = 'superadmin' AND r.name = 'super_admin'
ON CONFLICT (admin_id, role_id) DO NOTHING;

-- 11. 更新bots表，添加agent_id字段关联代理商
ALTER TABLE bots ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);
CREATE INDEX IF NOT EXISTS idx_bots_agent_id ON bots(agent_id);

-- 12. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. 为相关表添加更新时间触发器
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_pricing_updated_at ON agent_pricing;
CREATE TRIGGER update_agent_pricing_updated_at
    BEFORE UPDATE ON agent_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 14. 授予必要的权限
-- 为anon和authenticated角色授予新表的访问权限
GRANT SELECT ON telegram_users TO anon, authenticated;
GRANT SELECT ON agents TO anon, authenticated;
GRANT SELECT ON agent_pricing TO anon, authenticated;
GRANT SELECT ON admins TO authenticated;
GRANT SELECT ON admin_roles TO authenticated;
GRANT SELECT ON admin_permissions TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- 为authenticated角色授予写权限
GRANT INSERT, UPDATE, DELETE ON telegram_users TO authenticated;
GRANT INSERT, UPDATE, DELETE ON agents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON agent_pricing TO authenticated;
GRANT INSERT, UPDATE, DELETE ON admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON admin_permissions TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;

COMMIT;