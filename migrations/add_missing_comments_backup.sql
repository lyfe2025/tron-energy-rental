-- 补充数据库表和字段的中文注释
-- 执行时间: 2024-01-22

-- 为departments表的缺失字段添加注释
COMMENT ON COLUMN departments.leader_id IS '部门负责人ID，关联admins表';
COMMENT ON COLUMN departments.phone IS '部门联系电话';
COMMENT ON COLUMN departments.email IS '部门联系邮箱';

-- 为menus表的缺失字段添加注释
COMMENT ON COLUMN menus.permission IS '权限标识符，用于权限控制';
COMMENT ON COLUMN menus.visible IS '是否可见：1-可见，0-隐藏';

-- 为operation_logs表的缺失字段添加注释
COMMENT ON COLUMN operation_logs.username IS '操作用户名';

-- 为positions表的缺失字段添加注释
COMMENT ON COLUMN positions.name IS '岗位名称';
COMMENT ON COLUMN positions.code IS '岗位编码，唯一标识';
COMMENT ON COLUMN positions.department_id IS '所属部门ID，关联departments表';
COMMENT ON COLUMN positions.level IS '岗位级别：1-初级，2-中级，3-高级，4-专家级';
COMMENT ON COLUMN positions.sort_order IS '排序号，数字越小排序越靠前';
COMMENT ON COLUMN positions.status IS '状态：1-启用，0-禁用';
COMMENT ON COLUMN positions.description IS '岗位描述';
COMMENT ON COLUMN positions.updated_at IS '更新时间';

-- 为price_configs表的缺失字段添加注释
COMMENT ON COLUMN price_configs.mode_type IS '价格模式类型：fixed-固定价格，dynamic-动态价格';
COMMENT ON COLUMN price_configs.name IS '价格配置名称';
COMMENT ON COLUMN price_configs.config IS '价格配置详情，JSON格式存储';
COMMENT ON COLUMN price_configs.is_active IS '是否启用：true-启用，false-禁用';

-- 为role_permissions表的缺失字段添加注释
COMMENT ON COLUMN role_permissions.menu_id IS '菜单ID，关联menus表';

-- 修正一些可能有错误的注释
-- 检查admin_roles表的注释是否正确
COMMENT ON TABLE admin_roles IS '管理员角色关联表，定义管理员与角色的多对多关系';
COMMENT ON COLUMN admin_roles.admin_id IS '管理员ID，关联admins表';
COMMENT ON COLUMN admin_roles.role_id IS '角色ID，关联roles表';
COMMENT ON COLUMN admin_roles.created_at IS '分配时间';

-- 确保所有表都有正确的注释
COMMENT ON TABLE departments IS '部门表，存储组织架构中的部门信息';
COMMENT ON TABLE positions IS '岗位表，存储组织架构中的岗位信息';
COMMENT ON TABLE price_configs IS '价格配置表，存储系统中各种服务的价格配置信息';
COMMENT ON TABLE role_permissions IS '角色权限关联表，定义角色与菜单权限的多对多关系';
COMMENT ON TABLE operation_logs IS '操作日志表，记录用户在系统中的所有操作行为';
COMMENT ON TABLE menus IS '系统菜单表，存储后台管理系统的菜单结构和权限配置';