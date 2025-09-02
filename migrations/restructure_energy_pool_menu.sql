-- 重构能量池管理菜单结构
-- 创建时间: 2025-01-13
-- 描述: 将能量池管理设为一级菜单，下设两个二级菜单：能量池账户管理和账户质押管理

-- 备份当前菜单数据
CREATE TEMP TABLE menu_backup AS 
SELECT * FROM menus WHERE id IN (6, 26, 261, 262, 265);

BEGIN;

-- 1. 更新现有的能量池管理菜单，保持为一级菜单
UPDATE menus 
SET 
    name = '能量池管理',
    parent_id = NULL,
    type = 1,
    path = '/energy-pool',
    component = NULL,
    permission = 'energy:pool:view',
    icon = 'Zap',
    sort_order = 6,
    visible = 1,
    status = 1
WHERE id = 6;

-- 2. 创建能量池账户管理二级菜单（原有功能）
INSERT INTO menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status) 
VALUES (61, '能量池账户管理', 6, 2, '/energy-pool/accounts', 'EnergyPool', 'energy:pool:manage', NULL, 1, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. 更新质押管理菜单，改为账户质押管理，设为能量池管理的子菜单
UPDATE menus 
SET 
    name = '账户质押管理',
    parent_id = 6,
    type = 2,
    path = '/energy-pool/stake',
    component = 'EnergyPool/Stake',
    permission = 'energy:stake:manage',
    sort_order = 2
WHERE id = 26;

-- 4. 添加能量池账户管理的按钮权限
INSERT INTO menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status) VALUES
(611, '账户新增', 61, 3, NULL, NULL, 'energy:pool:add', NULL, 1, 0, 1),
(612, '账户编辑', 61, 3, NULL, NULL, 'energy:pool:edit', NULL, 2, 0, 1),
(613, '账户删除', 61, 3, NULL, NULL, 'energy:pool:delete', NULL, 3, 0, 1),
(614, '账户查看', 61, 3, NULL, NULL, 'energy:pool:view', NULL, 4, 0, 1),
(615, '账户状态切换', 61, 3, NULL, NULL, 'energy:pool:toggle', NULL, 5, 0, 1)
ON CONFLICT (id) DO NOTHING;

-- 5. 确保质押管理的按钮权限存在
INSERT INTO menus (id, name, parent_id, type, path, component, permission, icon, sort_order, visible, status) VALUES
(263, '委托资源', 26, 3, NULL, NULL, 'energy:stake:delegate', NULL, 3, 0, 1),
(264, '取消委托', 26, 3, NULL, NULL, 'energy:stake:undelegate', NULL, 4, 0, 1)
ON CONFLICT (id) DO NOTHING;

-- 6. 为管理员角色添加新的权限
INSERT INTO role_permissions (role_id, menu_id) 
SELECT r.id, m.id 
FROM roles r, menus m 
WHERE r.name = 'admin' 
AND m.id IN (61, 611, 612, 613, 614, 615)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.menu_id = m.id
);

COMMIT;

-- 验证更新结果
SELECT 
    id, 
    name, 
    parent_id, 
    type, 
    path, 
    component, 
    permission, 
    icon, 
    sort_order, 
    visible, 
    status 
FROM menus 
WHERE id IN (6, 61, 26) OR parent_id IN (6, 61, 26)
ORDER BY parent_id NULLS FIRST, sort_order, id;

SELECT 'Menu restructure completed successfully!' as result;