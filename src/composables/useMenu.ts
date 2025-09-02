/**
 * 菜单管理组合式函数
 * 提供菜单数据的获取、处理和导航功能
 */

import { get } from '@/lib/request'
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'

// 菜单项接口
interface MenuItem {
  id: number
  name: string
  path?: string
  icon?: string
  permission?: string
  children?: MenuItem[]
}

// 导航项接口
interface NavigationItem {
  name: string
  href: string
  icon?: any
  permission?: string
  roles?: string[]
  children?: NavigationItem[]
}

// 图标映射
const iconMap: Record<string, () => Promise<any>> = {
  LayoutDashboard: () => import('lucide-vue-next').then(m => m.LayoutDashboard),
  ShoppingCart: () => import('lucide-vue-next').then(m => m.ShoppingCart),
  Users: () => import('lucide-vue-next').then(m => m.Users),
  DollarSign: () => import('lucide-vue-next').then(m => m.DollarSign),
  Bot: () => import('lucide-vue-next').then(m => m.Bot),
  Fuel: () => import('lucide-vue-next').then(m => m.Fuel),
  Zap: () => import('lucide-vue-next').then(m => m.Zap),
  UserCheck: () => import('lucide-vue-next').then(m => m.UserCheck),
  BarChart3: () => import('lucide-vue-next').then(m => m.BarChart3),
  Monitor: () => import('lucide-vue-next').then(m => m.Monitor),
  Settings: () => import('lucide-vue-next').then(m => m.Settings)
}

export function useMenu() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const menuData = ref<MenuItem[]>([])
  const retryCount = ref(0)
  const maxRetries = 3

  /**
   * 从后端获取用户菜单
   */
  const fetchUserMenus = async () => {
    try {
      loading.value = true
      error.value = null

      // 检查认证状态
      if (!authStore.isAuthenticated) {
        console.warn('用户未认证，跳过菜单获取')
        menuData.value = getFallbackMenus()
        return
      }

      // 调试信息
      console.log('🔍 [useMenu] 认证状态:', {
        isAuthenticated: authStore.isAuthenticated,
        token: authStore.token,
        user: authStore.user
      })

      // 检查localStorage中的token
      const storedToken = localStorage.getItem('admin_token')
      console.log('🔍 [useMenu] localStorage中的token:', storedToken ? '存在' : '不存在')

      const response = await get('/api/system/menus/user-menus')
      console.log('🔍 [useMenu] API响应:', response)
      
      if (response.success) {
        menuData.value = response.data
        retryCount.value = 0 // 重置重试计数
        console.log('✅ [useMenu] 菜单获取成功:', response.data)
      } else {
        console.error('❌ [useMenu] API返回失败:', response)
        throw new Error(response.error || '获取菜单失败')
      }
    } catch (err) {
      console.error('❌ [useMenu] 获取用户菜单失败:', err)
      
      // 详细错误信息
      if (err instanceof Error) {
        console.error('❌ [useMenu] 错误详情:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        })
      } else {
        console.error('❌ [useMenu] 未知错误类型:', err)
      }
      
      error.value = err instanceof Error ? err.message : '获取菜单失败'
      
      // 如果API获取失败，使用备用硬编码菜单
      menuData.value = getFallbackMenus()
      
      // 重试机制
      if (retryCount.value < maxRetries) {
        retryCount.value++
        console.log(`🔄 [useMenu] 菜单获取失败，${3}秒后重试 (${retryCount.value}/${maxRetries})`)
        setTimeout(() => {
          fetchUserMenus()
        }, 3000)
      }
    } finally {
      loading.value = false
    }
    
    // 处理菜单数据
    await processMenuData()
  }

  /**
   * 获取图标组件
   */
  const getIconComponent = async (iconName?: string) => {
    if (!iconName || !iconMap[iconName]) {
      return null
    }
    
    try {
      const iconModule = await iconMap[iconName]()
      return iconModule
    } catch (err) {
      console.warn(`加载图标 ${iconName} 失败:`, err)
      return null
    }
  }

  /**
   * 将后端菜单数据转换为前端导航格式
   */
  const convertToNavigationItems = async (menus: MenuItem[]): Promise<NavigationItem[]> => {
    const items: NavigationItem[] = []

    for (const menu of menus) {
      const icon = await getIconComponent(menu.icon)
      
      const navItem: NavigationItem = {
        name: menu.name,
        href: menu.path || '#',
        icon,
        permission: menu.permission,
        roles: ['super_admin', 'admin'] // 默认角色，可根据需要调整
      }

      // 处理子菜单
      if (menu.children && menu.children.length > 0) {
        navItem.children = await convertToNavigationItems(menu.children)
      }

      items.push(navItem)
    }

    return items
  }

  /**
   * 获取备用硬编码菜单（当API失败时使用）
   */
  const getFallbackMenus = (): MenuItem[] => {
    return [
      {
        id: 1,
        name: '仪表板',
        path: '/dashboard',
        icon: 'LayoutDashboard',
        permission: 'dashboard:view'
      },
      {
        id: 2,
        name: '订单管理',
        path: '/orders',
        icon: 'ShoppingCart',
        permission: 'order:list'
      },
      {
        id: 3,
        name: '用户管理',
        path: '/users',
        icon: 'Users',
        permission: 'user:list'
      },
      {
        id: 4,
        name: '价格配置',
        path: '/price-config',
        icon: 'DollarSign',
        permission: 'price:config'
      },
      {
        id: 5,
        name: '机器人管理',
        path: '/bots',
        icon: 'Bot',
        permission: 'bot:list'
      },
      {
        id: 6,
        name: '能量池管理',
        path: '/energy-pool',
        icon: 'Fuel',
        permission: 'energy:pool',
        children: [
          {
            id: 61,
            name: '能量池账户管理',
            path: '/energy-pool/accounts',
            permission: 'energy:pool:accounts'
          },
          {
            id: 62,
            name: '账户质押管理',
            path: '/energy-pool/stake',
            permission: 'energy:pool:stake'
          }
        ]
      },
      {
        id: 7,
        name: '代理商管理',
        path: '/agents',
        icon: 'UserCheck',
        permission: 'agent:list'
      },
      {
        id: 8,
        name: '统计分析',
        path: '/statistics',
        icon: 'BarChart3',
        permission: 'statistics:view'
      },
      {
        id: 9,
        name: '监控中心',
        path: '/monitoring',
        icon: 'Monitor',
        permission: 'monitoring:view',
        children: [
          {
            id: 10,
            name: '监控概览',
            path: '/monitoring/overview',
            permission: 'monitoring:overview'
          },
          {
            id: 11,
            name: '在线用户',
            path: '/monitoring/online-users',
            permission: 'monitoring:users'
          },
          {
            id: 12,
            name: '定时任务',
            path: '/monitoring/scheduled-tasks',
            permission: 'monitoring:tasks'
          },
          {
            id: 13,
            name: '数据监控',
            path: '/monitoring/database',
            permission: 'monitoring:database'
          },
          {
            id: 14,
            name: '服务状态',
            path: '/monitoring/service-status',
            permission: 'monitoring:service'
          },
          {
            id: 15,
            name: '缓存状态',
            path: '/monitoring/cache-status',
            permission: 'monitoring:cache'
          }
        ]
      },
      {
        id: 16,
        name: '系统管理',
        path: '/system',
        icon: 'Settings',
        permission: 'system:view',
        children: [
          {
            id: 17,
            name: '部门管理',
            path: '/system/departments',
            permission: 'system:dept:list'
          },
          {
            id: 18,
            name: '岗位管理',
            path: '/system/positions',
            permission: 'system:position:list'
          },
          {
            id: 19,
            name: '角色管理',
            path: '/system/roles',
            permission: 'system:role:list'
          },
          {
            id: 20,
            name: '菜单管理',
            path: '/system/menus',
            permission: 'system:menu:list'
          },
          {
            id: 21,
            name: '管理员管理',
            path: '/system/user-roles',
            permission: 'system:user:list'
          },
          {
            id: 22,
            name: '系统设置',
            path: '/system/settings',
            permission: 'system:settings:list'
          }
        ]
      }
    ]
  }

  /**
   * 根据用户权限过滤菜单
   */
  const filterMenusByPermissions = (items: NavigationItem[], permissions: string[]): NavigationItem[] => {
    return items.filter(item => {
      // 检查权限
      if (item.permission && !permissions.includes(item.permission)) {
        return false
      }

      // 递归过滤子菜单
      if (item.children) {
        item.children = filterMenusByPermissions(item.children, permissions)
        // 如果所有子菜单都被过滤掉，则隐藏父菜单
        return item.children.length > 0
      }

      return true
    })
  }

  // 导航菜单数据
  const navigationItems = ref<NavigationItem[]>([])

  /**
   * 处理菜单数据并更新导航项
   */
  const processMenuData = async () => {
    if (!menuData.value.length) {
      navigationItems.value = []
      return
    }

    try {
      // 转换为导航格式
      const navItems = await convertToNavigationItems(menuData.value)
      
      // 获取用户权限
      const userPermissions = authStore.user?.permissions || []
      
      // 根据权限过滤菜单
      navigationItems.value = filterMenusByPermissions(navItems, userPermissions)
    } catch (err) {
      console.error('处理菜单数据失败:', err)
      navigationItems.value = []
    }
  }

  /**
   * 获取导航菜单（已过滤权限）
   */
  const navigation = computed(() => navigationItems.value)

  /**
   * 刷新菜单数据
   */
  const refreshMenus = async () => {
    await fetchUserMenus()
  }

  /**
   * 初始化菜单数据
   */
  const initializeMenus = async () => {
    if (authStore.isAuthenticated) {
      await fetchUserMenus()
    }
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    menuData: computed(() => menuData.value),
    navigation,
    refreshMenus,
    fetchUserMenus,
    initializeMenus
  }
}
