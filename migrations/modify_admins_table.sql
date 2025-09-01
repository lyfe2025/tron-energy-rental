-- 修改admins表，添加RBAC相关字段
-- 创建时间: 2025-01-09
-- 描述: 为现有admins表添加部门、岗位和最后登录时间字段

-- 添加部门ID字段
ALTER TABLE admins ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

-- 添加岗位ID字段
ALTER TABLE admins ADD COLUMN IF NOT EXISTS position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL;

-- 添加最后登录时间字段
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admins_department_id ON admins(department_id);
CREATE INDEX IF NOT EXISTS idx_admins_position_id ON admins(position_id);
CREATE INDEX IF NOT EXISTS idx_admins_last_login_at ON admins(last_login_at);

-- 添加表注释
COMMENT ON COLUMN admins.department_id IS '所属部门ID';
COMMENT ON COLUMN admins.position_id IS '岗位ID';
COMMENT ON COLUMN admins.last_login_at IS '最后登录时间';