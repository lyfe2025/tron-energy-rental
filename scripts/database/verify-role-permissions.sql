-- 验证角色权限设置的脚本
-- 用于确认所有角色的菜单权限都已正确配置

-- 1. 总览：各角色的权限统计
SELECT 
    '=== 角色权限统计 ===' as "验证项目";
    
SELECT 
    r.name as "角色名称",
    r.code as "角色代码", 
    COUNT(rp.id) as "拥有菜单权限数",
    CASE 
        WHEN COUNT(rp.id) > 0 THEN '✓ 有权限'
        ELSE '❌ 无权限'
    END as "状态"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.code
ORDER BY r.id;

-- 2. 检查是否有菜单没有被任何角色分配
SELECT 
    '=== 未分配菜单检查 ===' as "验证项目";

SELECT 
    m.id as "菜单ID",
    m.name as "菜单名称",
    m.path as "菜单路径",
    '❌ 未分配给任何角色' as "状态"
FROM menus m
WHERE m.status = 1 AND m.visible = 1
  AND m.id NOT IN (
    SELECT DISTINCT menu_id 
    FROM role_permissions 
    WHERE menu_id IS NOT NULL
  );

-- 3. 超级管理员权限详细检查
SELECT 
    '=== 超级管理员权限详情 ===' as "验证项目";

SELECT 
    CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM menus WHERE status = 1 AND visible = 1)
         THEN '✅ 超级管理员拥有所有菜单权限'
         ELSE '❌ 超级管理员权限不完整'
    END as "超级管理员权限状态",
    COUNT(*) as "已分配权限数",
    (SELECT COUNT(*) FROM menus WHERE status = 1 AND visible = 1) as "应有权限数"
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.code = 'super_admin';

-- 4. 各角色权限对比表
SELECT 
    '=== 各角色权限对比 ===' as "验证项目";

SELECT 
    m.name as "菜单名称",
    MAX(CASE WHEN r.code = 'super_admin' THEN '✓' ELSE '' END) as "超级管理员",
    MAX(CASE WHEN r.code = 'system_admin' THEN '✓' ELSE '' END) as "系统管理员", 
    MAX(CASE WHEN r.code = 'dept_admin' THEN '✓' ELSE '' END) as "部门管理员",
    MAX(CASE WHEN r.code = 'admin' THEN '✓' ELSE '' END) as "普通管理员",
    MAX(CASE WHEN r.code = 'operator' THEN '✓' ELSE '' END) as "操作员"
FROM menus m
LEFT JOIN role_permissions rp ON m.id = rp.menu_id
LEFT JOIN roles r ON rp.role_id = r.id
WHERE m.status = 1 AND m.visible = 1 AND m.parent_id IS NULL  -- 只显示顶级菜单
GROUP BY m.id, m.name, m.sort_order
ORDER BY m.sort_order;

-- 5. 验证结论
SELECT 
    '=== 验证结论 ===' as "验证项目";

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM role_permissions) > 100 THEN '✅ 权限数据已恢复，系统可正常使用'
        WHEN (SELECT COUNT(*) FROM role_permissions) > 0 THEN '⚠️  权限数据部分恢复，请检查具体配置'  
        ELSE '❌ 权限数据未恢复，需要重新执行恢复脚本'
    END as "系统状态",
    (SELECT COUNT(*) FROM role_permissions) as "总权限记录数",
    (SELECT COUNT(DISTINCT role_id) FROM role_permissions) as "有权限的角色数",
    (SELECT COUNT(DISTINCT menu_id) FROM role_permissions) as "已分配菜单数";
