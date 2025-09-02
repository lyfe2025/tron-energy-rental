-- 添加质押管理子菜单到能量池管理下
-- 创建时间: 2025-01-13
-- 描述: 为能量池管理添加质押管理子菜单项

-- 添加质押管理子菜单
INSERT INTO menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status) VALUES
(26, '质押管理', 25, 2, '/business/energy-pool/stake', 'business/energy-pool/stake/index', 'business:energy:stake', 'Lock', 1, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- 添加质押管理相关按钮权限
INSERT INTO menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status) VALUES
(261, '质押操作', 26, 3, NULL, NULL, 'business:energy:stake:freeze', NULL, 1, 0, 1),
(262, '解质押操作', 26, 3, NULL, NULL, 'business:energy:stake:unfreeze', NULL, 2, 0, 1),
(263, '委托资源', 26, 3, NULL, NULL, 'business:energy:stake:delegate', NULL, 3, 0, 1),
(264, '取消委托', 26, 3, NULL, NULL, 'business:energy:stake:undelegate', NULL, 4, 0, 1),
(265, '提取解质押', 26, 3, NULL, NULL, 'business:energy:stake:withdraw', NULL, 5, 0, 1)
ON CONFLICT (id) DO NOTHING;

-- 为超级管理员角色分配质押管理权限
INSERT INTO role_permissions (role_id, menu_id) VALUES
(1, 26), (1, 261), (1, 262), (1, 263), (1, 264), (1, 265)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 为系统管理员角色分配质押管理权限
INSERT INTO role_permissions (role_id, menu_id) VALUES
(2, 26), (2, 261), (2, 262), (2, 263), (2, 264), (2, 265)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 更新序列值
SELECT setval('menus_id_seq', (SELECT MAX(id) FROM menus));