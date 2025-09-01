-- 重命名 user_roles 表为 admin_roles
-- 这个表实际上是用于管理员角色分配的RBAC权限系统

-- 1. 重命名表
ALTER TABLE user_roles RENAME TO admin_roles;

-- 2. 重命名序列
ALTER SEQUENCE user_roles_id_seq RENAME TO admin_roles_id_seq;

-- 3. 重命名字段（user_id 改为 admin_id，更准确地反映其用途）
ALTER TABLE admin_roles RENAME COLUMN user_id TO admin_id;

-- 4. 重命名索引
ALTER INDEX idx_user_roles_user_id RENAME TO idx_admin_roles_admin_id;
ALTER INDEX idx_user_roles_role_id RENAME TO idx_admin_roles_role_id;

-- 5. 重命名约束
ALTER TABLE admin_roles RENAME CONSTRAINT user_roles_pkey TO admin_roles_pkey;
ALTER TABLE admin_roles RENAME CONSTRAINT user_roles_user_id_role_id_key TO admin_roles_admin_id_role_id_key;
ALTER TABLE admin_roles RENAME CONSTRAINT user_roles_role_id_fkey TO admin_roles_role_id_fkey;

-- 6. 添加外键约束到 admins 表
ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;

-- 7. 更新表注释
COMMENT ON TABLE admin_roles IS '管理员角色关联表';
COMMENT ON COLUMN admin_roles.id IS '管理员角色关联唯一标识符';
COMMENT ON COLUMN admin_roles.admin_id IS '管理员ID，关联admins表';
COMMENT ON COLUMN admin_roles.role_id IS '角色ID，关联roles表';
COMMENT ON COLUMN admin_roles.created_at IS '创建时间';