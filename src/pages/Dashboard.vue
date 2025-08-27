<template>
  <div class="space-y-6">
    <!-- 欢迎信息 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">
            欢迎回来，{{ user?.username || '管理员' }}！
          </h2>
          <p class="text-gray-600 mt-1">
            今天是 {{ currentDate }}，系统运行正常
          </p>
        </div>
        <div class="flex items-center space-x-2">
          <div class="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-sm text-gray-500">系统在线</span>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="stat in stats" 
        :key="stat.name"
        class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">{{ stat.name }}</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">
              {{ formatNumber(stat.value) }}
            </p>
            <div class="flex items-center mt-2">
              <component 
                :is="stat.trend === 'up' ? TrendingUp : TrendingDown"
                :class="[
                  'h-4 w-4 mr-1',
                  stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                ]"
              />
              <span 
                :class="[
                  'text-sm font-medium',
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                ]"
              >
                {{ stat.change }}%
              </span>
              <span class="text-sm text-gray-500 ml-1">vs 昨日</span>
            </div>
          </div>
          <div 
            :class="[
              'h-12 w-12 rounded-lg flex items-center justify-center',
              stat.bgColor
            ]"
          >
            <component :is="stat.icon" :class="['h-6 w-6', stat.iconColor]" />
          </div>
        </div>
      </div>
    </div>

    <!-- 图表和数据 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 订单趋势图 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">订单趋势</h3>
          <select 
            v-model="orderTrendPeriod"
            class="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
        </div>
        <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div class="text-center">
            <BarChart3 class="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p class="text-gray-500">图表组件待集成</p>
          </div>
        </div>
      </div>

      <!-- 收入分析 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">收入分析</h3>
          <select 
            v-model="revenuePeriod"
            class="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="today">今日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
        </div>
        <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div class="text-center">
            <PieChart class="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p class="text-gray-500">图表组件待集成</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近活动和快速操作 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 最近订单 -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">最近订单</h3>
          <router-link 
            to="/orders"
            class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            查看全部
          </router-link>
        </div>
        <div class="space-y-4">
          <div 
            v-for="order in recentOrders" 
            :key="order.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center space-x-4">
              <div class="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <ShoppingCart class="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p class="font-medium text-gray-900">订单 #{{ order.id.slice(-8) }}</p>
                <p class="text-sm text-gray-500">{{ order.user_id }} · {{ formatTime(order.created_at) }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-medium text-gray-900">{{ order.amount }} TRX</p>
              <span 
                :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                  getStatusColor(order.status)
                ]"
              >
                {{ getStatusText(order.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-6">快速操作</h3>
        <div class="space-y-3">
          <router-link
            v-for="action in quickActions"
            :key="action.name"
            :to="action.href"
            class="flex items-center p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
          >
            <component 
              :is="action.icon" 
              class="h-5 w-5 text-gray-400 group-hover:text-indigo-600 mr-3"
            />
            <span class="text-sm font-medium text-gray-700 group-hover:text-indigo-700">
              {{ action.name }}
            </span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { statisticsAPI, ordersAPI } from '@/services/api'
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Users,
  Bot,
  Battery,
  BarChart3,
  PieChart,
  Plus,
  Settings,
  FileText
} from 'lucide-vue-next'

// 状态管理
const authStore = useAuthStore()

// 响应式数据
const orderTrendPeriod = ref('7d')
const revenuePeriod = ref('today')
const stats = ref([
  {
    name: '总订单数',
    value: 0,
    change: 0,
    trend: 'up' as 'up' | 'down',
    icon: ShoppingCart,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    name: '总收入',
    value: 0,
    change: 0,
    trend: 'up' as 'up' | 'down',
    icon: DollarSign,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    name: '活跃用户',
    value: 0,
    change: 0,
    trend: 'up' as 'up' | 'down',
    icon: Users,
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    name: '在线机器人',
    value: 0,
    change: 0,
    trend: 'up' as 'up' | 'down',
    icon: Bot,
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600'
  }
])

const recentOrders = ref<any[]>([])
const isLoading = ref(false)

// 计算属性
const user = computed(() => authStore.user)

const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

// 快速操作配置
const quickActions = [
  {
    name: '创建订单',
    href: '/orders/create',
    icon: Plus
  },
  {
    name: '价格设置',
    href: '/pricing',
    icon: DollarSign
  },
  {
    name: '机器人配置',
    href: '/bots',
    icon: Bot
  },
  {
    name: '系统设置',
    href: '/settings',
    icon: Settings
  },
  {
    name: '查看报表',
    href: '/statistics',
    icon: FileText
  }
]

// 方法
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败',
    'cancelled': '已取消'
  }
  return texts[status] || status
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    const response = await statisticsAPI.getOverview()
    if (response?.data?.success && response?.data?.data) {
      const data = response.data.data
      
      // 更新统计数据 - 添加完善的空值检查
      if (stats.value[0]) {
        stats.value[0].value = Number(data.total_orders) || 0
        stats.value[0].change = Number(data.orders_change) || 0
        stats.value[0].trend = (Number(data.orders_change) || 0) >= 0 ? 'up' : 'down'
      }
      
      if (stats.value[1]) {
        stats.value[1].value = Number(data.total_revenue) || 0
        stats.value[1].change = Number(data.revenue_change) || 0
        stats.value[1].trend = (Number(data.revenue_change) || 0) >= 0 ? 'up' : 'down'
      }
      
      if (stats.value[2]) {
        stats.value[2].value = Number(data.active_users) || 0
        stats.value[2].change = Number(data.users_change) || 0
        stats.value[2].trend = (Number(data.users_change) || 0) >= 0 ? 'up' : 'down'
      }
      
      if (stats.value[3]) {
        stats.value[3].value = Number(data.online_bots) || 0
        stats.value[3].change = Number(data.bots_change) || 0
        stats.value[3].trend = (Number(data.bots_change) || 0) >= 0 ? 'up' : 'down'
      }
    } else {
      console.warn('统计数据响应格式异常:', response)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 保持默认值，不影响页面显示
  }
}

// 加载最近订单
const loadRecentOrders = async () => {
  try {
    const response = await ordersAPI.getOrders({ page: 1, limit: 5 })
    if (response.data.success && response.data.data?.items) {
      recentOrders.value = response.data.data.items
    }
  } catch (error) {
    console.error('加载最近订单失败:', error)
  }
}

// 初始化数据
const initializeDashboard = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      loadStatistics(),
      loadRecentOrders()
    ])
  } catch (error) {
    console.error('初始化仪表板失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  initializeDashboard()
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>