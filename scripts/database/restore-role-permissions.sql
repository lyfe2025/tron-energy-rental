-- 恢复角色权限数据
-- 为不同角色分配相应的菜单访问权限

-- 清空现有的权限数据（如果有的话）
TRUNCATE role_permissions RESTART IDENTITY;

-- 1. 超级管理员 (super_admin) - 拥有所有权限
INSERT INTO role_permissions (role_id, menu_id)
SELECT 1, id FROM menus WHERE status = 1 AND visible = 1;

-- 2. 系统管理员 (system_admin) - 拥有大部分权限，除了部分敏感配置
INSERT INTO role_permissions (role_id, menu_id)
SELECT 2, id FROM menus 
WHERE status = 1 AND visible = 1 
  AND id NOT IN (
    -- 排除一些超级管理员专属功能（如果需要的话可以调整）
    28  -- 系统设置（可能包含敏感配置）
  );

-- 3. 部门管理员 (dept_admin) - 业务管理权限
INSERT INTO role_permissions (role_id, menu_id)
SELECT 3, id FROM menus 
WHERE status = 1 AND visible = 1 
  AND id IN (
    1,   -- 仪表板
    2,   -- 订单管理  
    3,   -- 用户管理
    4,   -- 价格配置
    5,   -- 机器人管理
    6,   -- 能量池管理
    7,   -- 账户管理
    8,   -- 质押管理
    9,   -- 代理商管理
    10,  -- 统计分析
    11,  -- 监控中心
    12,  -- 监控概览
    13,  -- 在线用户
    14,  -- 定时任务
    15,  -- 数据监控
    16,  -- 服务状态
    17,  -- 缓存状态
    18,  -- 系统管理
    19,  -- 部门管理
    20,  -- 岗位管理
    24,  -- 日志管理
    25,  -- 登录日志
    26,  -- 操作日志
    27,  -- 系统日志
    29,  -- 配置管理
    31,  -- TRON网络管理
    32   -- 配置历史
  );

-- 4. 普通管理员 (admin) - 基本管理权限
INSERT INTO role_permissions (role_id, menu_id)
SELECT 4, id FROM menus 
WHERE status = 1 AND visible = 1 
  AND id IN (
    1,   -- 仪表板
    2,   -- 订单管理
    3,   -- 用户管理
    5,   -- 机器人管理
    6,   -- 能量池管理
    7,   -- 账户管理
    8,   -- 质押管理
    9,   -- 代理商管理
    10,  -- 统计分析
    11,  -- 监控中心
    12,  -- 监控概览
    13,  -- 在线用户
    15,  -- 数据监控
    24,  -- 日志管理
    25,  -- 登录日志
    26,  -- 操作日志
    32   -- 配置历史
  );

-- 5. 操作员 (operator) - 基本查看和操作权限
INSERT INTO role_permissions (role_id, menu_id)
SELECT 5, id FROM menus 
WHERE status = 1 AND visible = 1 
  AND id IN (
    1,   -- 仪表板
    2,   -- 订单管理
    3,   -- 用户管理
    6,   -- 能量池管理
    7,   -- 账户管理
    8,   -- 质押管理
    10,  -- 统计分析
    11,  -- 监控中心
    12,  -- 监控概览
    13   -- 在线用户
  );

-- 显示恢复后的权限统计
SELECT 
    r.name as "角色名称",
    r.code as "角色代码", 
    COUNT(rp.id) as "菜单权限数量"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.code
ORDER BY r.id;

-- 显示超级管理员的详细权限（用于验证）
SELECT 
    '超级管理员权限详情' as "说明",
    m.id as "菜单ID",
    m.name as "菜单名称",
    m.path as "菜单路径",
    CASE WHEN m.parent_id IS NULL THEN '顶级菜单' 
         ELSE CONCAT('子菜单(父ID:', m.parent_id, ')') 
    END as "菜单类型"
FROM role_permissions rp
JOIN menus m ON rp.menu_id = m.id  
WHERE rp.role_id = 1  -- 超级管理员
ORDER BY m.sort_order, m.id;
