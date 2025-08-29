import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Login from '@/pages/Login.vue'
import Layout from '@/components/Layout.vue'
import Dashboard from '@/pages/Dashboard.vue'

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
          component: () => import('@/pages/PriceConfig.vue'),
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
          path: 'admins',
          name: 'admins',
          component: () => import('@/pages/Admins/index.vue'),
          meta: { roles: ['super_admin'] }
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
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/Settings.vue'),
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
