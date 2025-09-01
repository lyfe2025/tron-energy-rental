-- RBAC系统初始化数据脚本
-- 创建时间: 2025-01-09
-- 描述: 插入RBAC系统的基础数据，包括部门、岗位、角色、菜单等

-- 1. 插入默认部门数据
INSERT INTO departments (id, name, code, parent_id, level, sort_order, status, description) VALUES
(1, '总公司', 'HEAD_OFFICE', NULL, 1, 1, 1, 'TRON能量租赁系统总公司'),
(2, '技术部', 'TECH_DEPT', 1, 2, 1, 1, '负责系统开发和技术支持'),
(3, '运营部', 'OPERATION_DEPT', 1, 2, 2, 1, '负责业务运营和客户服务'),
(4, '财务部', 'FINANCE_DEPT', 1, 2, 3, 1, '负责财务管理和资金结算'),
(5, '市场部', 'MARKETING_DEPT', 1, 2, 4, 1, '负责市场推广和商务合作')
ON CONFLICT (id) DO NOTHING;

-- 2. 插入默认岗位数据
INSERT INTO positions (id, name, code, department_id, level, sort_order, status, description) VALUES
(1, '系统管理员', 'SYS_ADMIN', 2, 1, 1, 1, '系统最高管理权限'),
(2, '技术经理', 'TECH_MANAGER', 2, 2, 2, 1, '技术部门负责人'),
(3, '开发工程师', 'DEVELOPER', 2, 3, 3, 1, '系统开发人员'),
(4, '运营经理', 'OP_MANAGER', 3, 2, 1, 1, '运营部门负责人'),
(5, '客服专员', 'CUSTOMER_SERVICE', 3, 3, 2, 1, '客户服务人员'),
(6, '财务经理', 'FINANCE_MANAGER', 4, 2, 1, 1, '财务部门负责人'),
(7, '会计', 'ACCOUNTANT', 4, 3, 2, 1, '财务会计人员'),
(8, '市场经理', 'MARKETING_MANAGER', 5, 2, 1, 1, '市场部门负责人')
ON CONFLICT (id) DO NOTHING;

-- 3. 插入默认角色数据
INSERT INTO roles (id, name, code, type, data_scope, sort_order, status, description) VALUES
(1, '超级管理员', 'super_admin', 'system', 1, 1, 1, '系统超级管理员，拥有所有权限'),
(2, '系统管理员', 'system_admin', 'system', 1, 2, 1, '系统管理员，负责系统配置'),
(3, '部门管理员', 'dept_admin', 'custom', 2, 3, 1, '部门管理员，管理本部门及下级部门'),
(4, '普通管理员', 'admin', 'custom', 3, 4, 1, '普通管理员，仅管理本部门'),
(5, '操作员', 'operator', 'custom', 4, 5, 1, '普通操作员，仅能查看和操作自己的数据')
ON CONFLICT (id) DO NOTHING;

-- 4. 插入菜单数据
INSERT INTO menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status) VALUES
-- 一级菜单
(1, '系统管理', NULL, 1, '/system', NULL, 'system', 'Settings', 1, 1, 1),
(2, '业务管理', NULL, 1, '/business', NULL, 'business', 'Briefcase', 2, 1, 1),
(3, '监控中心', NULL, 1, '/monitor', NULL, 'monitor', 'Monitor', 3, 1, 1),

-- 系统管理子菜单
(11, '部门管理', 1, 2, '/system/departments', 'system/departments/index', 'system:dept:list', 'Building2', 1, 1, 1),
(12, '岗位管理', 1, 2, '/system/positions', 'system/positions/index', 'system:position:list', 'UserCheck', 2, 1, 1),
(13, '角色管理', 1, 2, '/system/roles', 'system/roles/index', 'system:role:list', 'Shield', 3, 1, 1),
(14, '菜单管理', 1, 2, '/system/menus', 'system/menus/index', 'system:menu:list', 'Menu', 4, 1, 1),
(15, '用户管理', 1, 2, '/system/users', 'system/users/index', 'system:user:list', 'Users', 5, 1, 1),

-- 业务管理子菜单
(21, '订单管理', 2, 2, '/business/orders', 'business/orders/index', 'business:order:list', 'ShoppingCart', 1, 1, 1),
(22, '用户管理', 2, 2, '/business/customers', 'business/customers/index', 'business:customer:list', 'User', 2, 1, 1),
(23, '代理管理', 2, 2, '/business/agents', 'business/agents/index', 'business:agent:list', 'UserPlus', 3, 1, 1),
(24, '价格配置', 2, 2, '/business/price-config', 'business/price-config/index', 'business:price:list', 'DollarSign', 4, 1, 1),
(25, '能量池管理', 2, 2, '/business/energy-pool', 'business/energy-pool/index', 'business:energy:list', 'Zap', 5, 1, 1),

-- 监控中心子菜单
(31, '登录日志', 3, 2, '/monitor/login-logs', 'monitor/login-logs/index', 'monitor:loginlog:list', 'LogIn', 1, 1, 1),
(32, '操作日志', 3, 2, '/monitor/operation-logs', 'monitor/operation-logs/index', 'monitor:operlog:list', 'FileText', 2, 1, 1),
(33, '系统统计', 3, 2, '/monitor/statistics', 'monitor/statistics/index', 'monitor:stats:list', 'BarChart3', 3, 1, 1),

-- 部门管理按钮权限
(111, '部门新增', 11, 3, NULL, NULL, 'system:dept:add', NULL, 1, 0, 1),
(112, '部门修改', 11, 3, NULL, NULL, 'system:dept:edit', NULL, 2, 0, 1),
(113, '部门删除', 11, 3, NULL, NULL, 'system:dept:remove', NULL, 3, 0, 1),

-- 岗位管理按钮权限
(121, '岗位新增', 12, 3, NULL, NULL, 'system:position:add', NULL, 1, 0, 1),
(122, '岗位修改', 12, 3, NULL, NULL, 'system:position:edit', NULL, 2, 0, 1),
(123, '岗位删除', 12, 3, NULL, NULL, 'system:position:remove', NULL, 3, 0, 1),

-- 角色管理按钮权限
(131, '角色新增', 13, 3, NULL, NULL, 'system:role:add', NULL, 1, 0, 1),
(132, '角色修改', 13, 3, NULL, NULL, 'system:role:edit', NULL, 2, 0, 1),
(133, '角色删除', 13, 3, NULL, NULL, 'system:role:remove', NULL, 3, 0, 1),
(134, '分配权限', 13, 3, NULL, NULL, 'system:role:permission', NULL, 4, 0, 1),

-- 菜单管理按钮权限
(141, '菜单新增', 14, 3, NULL, NULL, 'system:menu:add', NULL, 1, 0, 1),
(142, '菜单修改', 14, 3, NULL, NULL, 'system:menu:edit', NULL, 2, 0, 1),
(143, '菜单删除', 14, 3, NULL, NULL, 'system:menu:remove', NULL, 3, 0, 1),

-- 用户管理按钮权限
(151, '用户新增', 15, 3, NULL, NULL, 'system:user:add', NULL, 1, 0, 1),
(152, '用户修改', 15, 3, NULL, NULL, 'system:user:edit', NULL, 2, 0, 1),
(153, '用户删除', 15, 3, NULL, NULL, 'system:user:remove', NULL, 3, 0, 1),
(154, '重置密码', 15, 3, NULL, NULL, 'system:user:resetpwd', NULL, 4, 0, 1)
ON CONFLICT (id) DO NOTHING;

-- 5. 为超级管理员角色分配所有权限
INSERT INTO role_permissions (role_id, menu_id)
SELECT 1, id FROM menus WHERE status = 1
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 6. 为系统管理员角色分配系统管理权限
INSERT INTO role_permissions (role_id, menu_id)
SELECT 2, id FROM menus WHERE (parent_id = 1 OR id = 1) AND status = 1
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 7. 为部门管理员角色分配部门相关权限
INSERT INTO role_permissions (role_id, menu_id) VALUES
(3, 1), (3, 11), (3, 12), (3, 15),
(3, 111), (3, 112), (3, 121), (3, 122), (3, 151), (3, 152)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 8. 更新序列值
SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments));
SELECT setval('positions_id_seq', (SELECT MAX(id) FROM positions));
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('menus_id_seq', (SELECT MAX(id) FROM menus));