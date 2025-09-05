<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 侧边栏 -->
    <div 
      class="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col"
      :class="{
        '-translate-x-full': !sidebarOpen,
        'translate-x-0': sidebarOpen
      }"
    >
      <!-- 侧边栏头部 -->
      <div class="flex items-center justify-between h-16 px-6 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap class="h-5 w-5 text-white" />
          </div>
          <span class="text-xl font-bold text-gray-900">TRON能量</span>
        </div>
        <button
          @click="toggleSidebar"
          class="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 mt-6 px-3 overflow-hidden">
        <div class="h-full overflow-y-auto space-y-1">
          <template v-for="item in navigation" :key="item.name">
            <!-- 有子菜单的项目 -->
            <div v-if="item.children && item.children.length > 0">
              <button
                @click="toggleMenu(item.name)"
                class="group flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <component 
                  :is="item.icon" 
                  class="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                />
                <span class="flex-1 text-left">{{ item.name }}</span>
                <ChevronDown 
                  class="h-4 w-4 transition-transform"
                  :class="{ 'rotate-180': expandedMenus.has(item.name) }"
                />
              </button>
              
              <!-- 子菜单 -->
              <div 
                v-show="expandedMenus.has(item.name)"
                class="ml-6 mt-1 space-y-1"
              >
                <router-link
                  v-for="child in item.children"
                  :key="child.name"
                  :to="child.href"
                  class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                  :class="{
                    'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700': $route.path === child.href,
                    'text-gray-600 hover:bg-gray-50 hover:text-gray-900': $route.path !== child.href
                  }"
                >
                  <div class="mr-3 h-2 w-2 rounded-full bg-gray-300"></div>
                  {{ child.name }}
                </router-link>
              </div>
            </div>
            
            <!-- 没有子菜单的项目 -->
            <router-link
              v-else
              :to="item.href"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="{
                'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700': $route.path === item.href,
                'text-gray-700 hover:bg-gray-50 hover:text-gray-900': $route.path !== item.href
              }"
            >
              <component 
                :is="item.icon" 
                class="mr-3 h-5 w-5 flex-shrink-0"
                :class="{
                  'text-indigo-500': $route.path === item.href,
                  'text-gray-400 group-hover:text-gray-500': $route.path !== item.href
                }"
              />
              {{ item.name }}
            </router-link>
          </template>
        </div>
      </nav>

      <!-- 用户信息 -->
      <div class="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
        <div class="flex items-center space-x-3">
          <div class="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User class="h-4 w-4 text-gray-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ user?.username || '管理员' }}
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ user?.role || 'admin' }}
            </p>
          </div>
          <button
            @click="handleLogout"
            class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="退出登录"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 移动端遮罩 -->
    <div 
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
      @click="closeSidebar"
    ></div>

    <!-- 主内容区域 -->
    <div class="lg:pl-64">
      <!-- 顶部导航栏 -->
      <div class="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
        <div class="flex items-center justify-between h-16 px-4 sm:px-6">
          <!-- 移动端菜单按钮 -->
          <button
            @click="toggleSidebar"
            class="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Menu class="h-5 w-5" />
          </button>

          <!-- 页面标题 -->
          <div class="flex-1 lg:flex-none">
            <h1 class="text-xl font-semibold text-gray-900">
              {{ currentPageTitle }}
            </h1>
          </div>

          <!-- 右侧操作区 -->
          <div class="flex items-center space-x-4">
            <!-- 通知按钮 -->
            <button class="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <Bell class="h-5 w-5" />
            </button>
            
            <!-- 设置按钮 -->
            <button class="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <Settings class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- 页面内容 -->
      <main class="p-4 sm:p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMenu } from '@/composables/useMenu'
import { useAuthStore } from '@/stores/auth'
import {
    Bell,
    ChevronDown,
    LogOut,
    Menu,
    Settings,
    User,
    X,
    Zap
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 路由和状态管理
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 菜单管理
const { navigation, loading: menuLoading, error: menuError, initializeMenus } = useMenu()

// 响应式数据
const sidebarOpen = ref(false)
const expandedMenus = ref<Set<string>>(new Set())

// 计算属性
const user = computed(() => authStore.user)

// 方法
const toggleMenu = (menuName: string) => {
  if (expandedMenus.value.has(menuName)) {
    expandedMenus.value.delete(menuName)
  } else {
    expandedMenus.value.add(menuName)
  }
}

// 注意：菜单数据现在从数据库获取，已移除硬编码的菜单配置

// 页面标题映射
const pageTitleMap: Record<string, string> = {
  '/dashboard': '仪表板',
  '/orders': '订单管理',
  '/pricing': '价格配置',
  '/users': '用户管理',
  '/agents': '代理商管理',
  '/bots': '机器人管理',
  '/energy': '能量包管理',
  '/energy-pool': '能量池管理',
  '/statistics': '统计分析',
  '/settings': '系统设置',
  '/monitoring': '监控中心',
  '/monitoring/overview': '监控概览',
  '/monitoring/online-users': '在线用户',
  '/monitoring/scheduled-tasks': '定时任务',
  '/monitoring/database': '数据监控',
  '/monitoring/service-status': '服务状态',
  '/monitoring/cache-status': '缓存状态',
  
  // 配置管理页面标题
  '/config': '配置管理',
  '/config/networks': 'TRON网络管理',
  '/config/energy-pools': '能量池配置管理',
  '/config/history': '配置变更历史',
  '/config/monitoring': '系统监控'
}

// 当前页面标题
const currentPageTitle = computed(() => {
  return pageTitleMap[route.path] || '管理后台'
})

// 方法
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    await router.push('/login')
  } catch (error) {
    console.error('退出登录失败:', error)
  }
}

// 响应式设计处理
const handleResize = () => {
  if (window.innerWidth >= 1024) {
    sidebarOpen.value = true
  } else {
    sidebarOpen.value = false
  }
}

// 监听认证状态变化，初始化菜单
watch(() => authStore.isAuthenticated, async (isAuthenticated) => {
  if (isAuthenticated) {
    try {
      await initializeMenus()
    } catch (error) {
      console.error('初始化菜单失败:', error)
    }
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  // 初始化侧边栏状态
  handleResize()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 验证用户认证状态
  if (!authStore.isAuthenticated) {
    router.push('/login')
  } else {
    // 如果已经认证，立即初始化菜单
    try {
      await initializeMenus()
    } catch (error) {
      console.error('初始化菜单失败:', error)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
/* 确保侧边栏在移动端正确显示 */
@media (min-width: 1024px) {
  .lg\:pl-64 {
    padding-left: 16rem;
  }
}

/* 自定义滚动条样式 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #f9fafb;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f9fafb;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>