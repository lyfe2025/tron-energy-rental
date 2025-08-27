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
          component: () => import('@/pages/Orders.vue')
        },
        {
          path: 'pricing',
          name: 'pricing',
          component: () => import('@/pages/Pricing.vue')
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/pages/Users.vue')
        },
        {
          path: 'bots',
          name: 'bots',
          component: () => import('@/pages/Bots.vue')
        },
        {
          path: 'energy',
          name: 'energy',
          component: () => import('@/pages/EnergyPackages.vue')
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: () => import('@/pages/Statistics.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/pages/Settings.vue')
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
        console.error('认证验证失败:', error)
        next('/login')
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
