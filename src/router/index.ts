import Layout from '@/components/Layout.vue'
import Dashboard from '@/pages/Dashboard.vue'
import Login from '@/pages/Login.vue'
import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: Layout,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: Dashboard
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/pages/Orders/index.vue')
        },
        {
          path: 'price-config',
          name: 'PriceConfig',
          component: () => import('@/pages/PriceConfig/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/pages/Users/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'agents',
          name: 'agents',
          component: () => import('@/pages/Agents/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },

        {
          path: 'bots',
          name: 'bots',
          component: () => import('@/pages/Bots/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },

        {
          path: 'energy-pool',
          name: 'energy-pool',
          component: () => import('@/pages/EnergyPool.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: () => import('@/pages/Statistics.vue'),
          meta: { roles: ['super_admin', 'admin', 'agent'] }
        },

        // 系统管理路由
        {
          path: 'system',
          name: 'system',
          component: () => import('@/pages/System/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/departments',
          name: 'system-departments',
          component: () => import('@/pages/System/Departments/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/positions',
          name: 'system-positions',
          component: () => import('@/pages/System/Positions/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/roles',
          name: 'system-roles',
          component: () => import('@/pages/System/Roles/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/menus',
          name: 'system-menus',
          component: () => import('@/pages/System/Menus/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/user-roles',
          name: 'system-user-roles',
          component: () => import('@/pages/System/AdminRoles/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/logs',
          name: 'system-logs',
          component: () => import('@/pages/System/Logs/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/logs/operation',
          name: 'system-logs-operation',
          component: () => import('@/pages/System/Logs/OperationLogs.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/logs/login',
          name: 'system-logs-login',
          component: () => import('@/pages/System/Logs/LoginLogs.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'system/settings',
          name: 'system-settings',
          component: () => import('@/pages/Settings/index.vue'),
          meta: { roles: ['super_admin'] }
        },
        {
          path: 'admins',
          name: 'admins',
          component: () => import('@/pages/Admins/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        
        // 监控中心路由
        {
          path: 'monitoring',
          name: 'monitoring',
          component: () => import('@/pages/Monitoring/index.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'monitoring/overview',
          name: 'monitoring-overview',
          component: () => import('@/pages/Monitoring/Overview.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'monitoring/online-users',
          name: 'monitoring-online-users',
          component: () => import('@/pages/Monitoring/OnlineUsers.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'monitoring/scheduled-tasks',
          name: 'monitoring-scheduled-tasks',
          component: () => import('@/pages/Monitoring/ScheduledTasks.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'monitoring/database',
          name: 'monitoring-database',
          component: () => import('@/pages/Monitoring/Database.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'monitoring/service-status',
          name: 'monitoring-service-status',
          component: () => import('@/pages/Monitoring/ServiceStatus.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        },
        {
          path: 'monitoring/cache-status',
          name: 'monitoring-cache-status',
          component: () => import('@/pages/Monitoring/CacheStatus.vue'),
          meta: { roles: ['super_admin', 'admin'] }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 检查路由是否需要认证
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false)
  
  if (requiresAuth) {
    // 需要认证的路由
    if (!authStore.token) {
      // 没有token，跳转到登录页
      next('/login')
      return
    }
    
    // 有token但没有用户信息，尝试验证token
    if (!authStore.user) {
      try {
        await authStore.initializeAuth()
        if (!authStore.isAuthenticated) {
          next('/login')
          return
        }
      } catch (error) {
        next('/login')
        return
      }
    }
    
    // 检查角色权限
    const requiredRoles = to.meta.roles as string[] | undefined
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = authStore.user?.role
      if (!userRole || !requiredRoles.includes(userRole)) {
        // 权限不足，跳转到仪表板或显示403页面
        next('/dashboard')
        return
      }
    }
  } else {
    // 不需要认证的路由（如登录页）
    if (to.path === '/login' && authStore.isAuthenticated) {
      // 已登录用户访问登录页，跳转到仪表板
      next('/dashboard')
      return
    }
  }
  
  next()
})

export default router
