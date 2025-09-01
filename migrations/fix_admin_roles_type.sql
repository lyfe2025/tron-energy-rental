-- 修复 admin_roles 表的类型不匹配问题
-- 将 admin_id 字段从 integer 改为 uuid 以匹配 admins 表

-- 1. 删除现有的唯一约束（因为要修改字段类型）
ALTER TABLE admin_roles DROP CONSTRAINT admin_roles_admin_id_role_id_key;

-- 2. 删除现有的索引
DROP INDEX idx_admin_roles_admin_id;

-- 3. 修改 admin_id 字段类型为 uuid
ALTER TABLE admin_roles ALTER COLUMN admin_id TYPE uuid USING admin_id::text::uuid;

-- 4. 重新创建索引
CREATE INDEX idx_admin_roles_admin_id ON admin_roles(admin_id);

-- 5. 重新创建唯一约束
ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_admin_id_role_id_key UNIQUE (admin_id, role_id);

-- 6. 添加外键约束到 admins 表
ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;