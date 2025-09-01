/**
 * 菜单同步脚本
 * 将硬编码的菜单导入到数据库中，解决菜单管理与真实菜单不一致的问题
 */

import { query } from '../api/config/database.js';

// 硬编码菜单数据（来自 Layout.vue）
const menuData = [
  {
    name: '仪表板',
    path: '/dashboard',
    component: 'Dashboard',
    icon: 'LayoutDashboard',
    type: 1, // 菜单
    sort_order: 1,
    permission: 'dashboard:view',
    visible: 1,
    status: 1
  },
  {
    name: '订单管理',
    path: '/orders',
    component: 'Orders',
    icon: 'ShoppingCart',
    type: 1,
    sort_order: 2,
    permission: 'order:list',
    visible: 1,
    status: 1
  },
  {
    name: '用户管理',
    path: '/users',
    component: 'Users',
    icon: 'Users',
    type: 1,
    sort_order: 3,
    permission: 'user:list',
    visible: 1,
    status: 1
  },
  {
    name: '价格配置',
    path: '/price-config',
    component: 'PriceConfig',
    icon: 'DollarSign',
    type: 1,
    sort_order: 4,
    permission: 'price:config',
    visible: 1,
    status: 1
  },
  {
    name: '机器人管理',
    path: '/bots',
    component: 'Bots',
    icon: 'Bot',
    type: 1,
    sort_order: 5,
    permission: 'bot:list',
    visible: 1,
    status: 1
  },
  {
    name: '能量池管理',
    path: '/energy-pool',
    component: 'EnergyPool',
    icon: 'Fuel',
    type: 1,
    sort_order: 6,
    permission: 'energy:pool',
    visible: 1,
    status: 1
  },
  {
    name: '代理商管理',
    path: '/agents',
    component: 'Agents',
    icon: 'UserCheck',
    type: 1,
    sort_order: 7,
    permission: 'agent:list',
    visible: 1,
    status: 1
  },
  {
    name: '统计分析',
    path: '/statistics',
    component: 'Statistics',
    icon: 'BarChart3',
    type: 1,
    sort_order: 8,
    permission: 'statistics:view',
    visible: 1,
    status: 1
  },
  {
    name: '监控中心',
    path: '/monitoring',
    component: 'Monitoring',
    icon: 'Monitor',
    type: 1,
    sort_order: 9,
    permission: 'monitoring:view',
    visible: 1,
    status: 1,
    children: [
      {
        name: '监控概览',
        path: '/monitoring/overview',
        component: 'MonitoringOverview',
        type: 1,
        sort_order: 1,
        permission: 'monitoring:overview',
        visible: 1,
        status: 1
      },
      {
        name: '在线用户',
        path: '/monitoring/online-users',
        component: 'OnlineUsers',
        type: 1,
        sort_order: 2,
        permission: 'monitoring:users',
        visible: 1,
        status: 1
      },
      {
        name: '定时任务',
        path: '/monitoring/scheduled-tasks',
        component: 'ScheduledTasks',
        type: 1,
        sort_order: 3,
        permission: 'monitoring:tasks',
        visible: 1,
        status: 1
      },
      {
        name: '数据监控',
        path: '/monitoring/database',
        component: 'Database',
        type: 1,
        sort_order: 4,
        permission: 'monitoring:database',
        visible: 1,
        status: 1
      },
      {
        name: '服务状态',
        path: '/monitoring/service-status',
        component: 'ServiceStatus',
        type: 1,
        sort_order: 5,
        permission: 'monitoring:service',
        visible: 1,
        status: 1
      },
      {
        name: '缓存状态',
        path: '/monitoring/cache-status',
        component: 'CacheStatus',
        type: 1,
        sort_order: 6,
        permission: 'monitoring:cache',
        visible: 1,
        status: 1
      }
    ]
  },
  {
    name: '系统管理',
    path: '/system',
    component: 'System',
    icon: 'Settings',
    type: 1,
    sort_order: 10,
    permission: 'system:view',
    visible: 1,
    status: 1,
    children: [
      {
        name: '部门管理',
        path: '/system/departments',
        component: 'Departments',
        type: 1,
        sort_order: 1,
        permission: 'system:dept:list',
        visible: 1,
        status: 1
      },
      {
        name: '岗位管理',
        path: '/system/positions',
        component: 'Positions',
        type: 1,
        sort_order: 2,
        permission: 'system:position:list',
        visible: 1,
        status: 1
      },
      {
        name: '角色管理',
        path: '/system/roles',
        component: 'Roles',
        type: 1,
        sort_order: 3,
        permission: 'system:role:list',
        visible: 1,
        status: 1
      },
      {
        name: '菜单管理',
        path: '/system/menus',
        component: 'Menus',
        type: 1,
        sort_order: 4,
        permission: 'system:menu:list',
        visible: 1,
        status: 1
      },
      {
        name: '管理员管理',
        path: '/system/user-roles',
        component: 'AdminRoles',
        type: 1,
        sort_order: 5,
        permission: 'system:user:list',
        visible: 1,
        status: 1
      },
      {
        name: '日志管理',
        path: '/system/logs',
        component: 'Logs',
        type: 1,
        sort_order: 6,
        permission: 'system:log:view',
        visible: 1,
        status: 1,
        children: [
          {
            name: '登录日志',
            path: '/system/logs/login',
            component: 'LoginLogs',
            type: 1,
            sort_order: 1,
            permission: 'system:log:login:list',
            visible: 1,
            status: 1
          },
          {
            name: '操作日志',
            path: '/system/logs/operation',
            component: 'OperationLogs',
            type: 1,
            sort_order: 2,
            permission: 'system:log:operation:list',
            visible: 1,
            status: 1
          }
        ]
      },
      {
        name: '系统设置',
        path: '/system/settings',
        component: 'Settings',
        type: 1,
        sort_order: 7,
        permission: 'system:settings:list',
        visible: 1,
        status: 1
      }
    ]
  }
];

/**
 * 清空现有菜单数据
 */
async function clearExistingMenus() {
  try {
    // 先删除角色权限关联
    await query('DELETE FROM role_permissions');
    console.log('✅ 已清空角色权限关联');
    
    // 删除所有菜单
    await query('DELETE FROM menus');
    console.log('✅ 已清空现有菜单数据');
    
    // 重置序列
    await query('ALTER SEQUENCE menus_id_seq RESTART WITH 1');
    console.log('✅ 已重置菜单ID序列');
  } catch (error) {
    console.error('❌ 清空菜单数据失败:', error);
    throw error;
  }
}

/**
 * 插入菜单数据
 */
async function insertMenu(menu: any, parentId: number | null = null): Promise<number> {
  const sql = `
    INSERT INTO menus (name, parent_id, type, path, component, permission, icon, sort_order, visible, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `;
  
  const values = [
    menu.name,
    parentId,
    menu.type,
    menu.path,
    menu.component,
    menu.permission,
    menu.icon || null,
    menu.sort_order,
    menu.visible,
    menu.status
  ];
  
  const result = await query(sql, values);
  return result.rows[0].id;
}

/**
 * 递归插入菜单树
 */
async function insertMenuTree(menus: any[], parentId: number | null = null) {
  for (const menu of menus) {
    console.log(`📝 插入菜单: ${menu.name}`);
    
    const menuId = await insertMenu(menu, parentId);
    
    if (menu.children && menu.children.length > 0) {
      await insertMenuTree(menu.children, menuId);
    }
  }
}

/**
 * 为超级管理员角色分配所有菜单权限
 */
async function assignPermissionsToSuperAdmin() {
  try {
    // 获取超级管理员角色ID
    const roleResult = await query(`
      SELECT id FROM roles WHERE code = 'super_admin' OR name = 'super_admin' OR name = '超级管理员'
      LIMIT 1
    `);
    
    if (roleResult.rows.length === 0) {
      console.log('⚠️ 未找到超级管理员角色，跳过权限分配');
      return;
    }
    
    const roleId = roleResult.rows[0].id;
    console.log(`📋 找到超级管理员角色 ID: ${roleId}`);
    
    // 获取所有菜单ID
    const menusResult = await query('SELECT id FROM menus ORDER BY id');
    const menuIds = menusResult.rows.map(row => row.id);
    
    // 为超级管理员角色分配所有菜单权限
    for (const menuId of menuIds) {
      await query(`
        INSERT INTO role_permissions (role_id, menu_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, menu_id) DO NOTHING
      `, [roleId, menuId]);
    }
    
    console.log(`✅ 为超级管理员角色分配了 ${menuIds.length} 个菜单权限`);
  } catch (error) {
    console.error('❌ 分配权限失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始同步菜单数据...\n');
    
    // 1. 清空现有数据
    console.log('1️⃣ 清空现有菜单数据...');
    await clearExistingMenus();
    console.log('');
    
    // 2. 插入新菜单数据
    console.log('2️⃣ 插入新菜单数据...');
    await insertMenuTree(menuData);
    console.log('');
    
    // 3. 分配权限
    console.log('3️⃣ 为超级管理员分配权限...');
    await assignPermissionsToSuperAdmin();
    console.log('');
    
    // 4. 验证结果
    console.log('4️⃣ 验证同步结果...');
    const result = await query(`
      SELECT 
        COUNT(*) as total_menus,
        COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_menus,
        COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as child_menus
      FROM menus
    `);
    
    const stats = result.rows[0];
    console.log(`📊 同步完成统计:`);
    console.log(`   - 总菜单数: ${stats.total_menus}`);
    console.log(`   - 根菜单数: ${stats.root_menus}`);
    console.log(`   - 子菜单数: ${stats.child_menus}`);
    
    console.log('\n✅ 菜单同步完成！');
    console.log('\n📋 接下来需要修改前端组件使其从数据库获取菜单数据');
    
  } catch (error) {
    console.error('\n❌ 菜单同步失败:', error);
    process.exit(1);
  }
}

// 执行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { menuData, main as syncMenus };
