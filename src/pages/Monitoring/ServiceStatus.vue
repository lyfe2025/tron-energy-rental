<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">服务状态监控</h1>
      <div class="flex items-center space-x-3">
        <button
          @click="refreshData"
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
      </div>
    </div>

    <!-- 服务概览 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <CheckCircle class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">正常服务</p>
            <p class="text-2xl font-bold text-gray-900">{{ healthyCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-yellow-100 rounded-lg">
            <AlertTriangle class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">警告服务</p>
            <p class="text-2xl font-bold text-gray-900">{{ warningCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-red-100 rounded-lg">
            <XCircle class="h-6 w-6 text-red-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">异常服务</p>
            <p class="text-2xl font-bold text-gray-900">{{ errorCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <Server class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总服务数</p>
            <p class="text-2xl font-bold text-gray-900">{{ services.length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 核心服务状态 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">核心服务状态</h2>
      </div>
      
      <div class="p-6">
        <div v-if="loading" class="text-center py-8">
          <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
          <p class="text-gray-500">检查服务状态中...</p>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="service in services" 
            :key="service.name" 
            class="border rounded-lg p-4"
            :class="{
              'border-green-200 bg-green-50': service.status === 'healthy',
              'border-yellow-200 bg-yellow-50': service.status === 'warning',
              'border-red-200 bg-red-50': service.status === 'error'
            }"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <component 
                  :is="getServiceIcon(service.type)" 
                  class="h-5 w-5 mr-2"
                  :class="getServiceIconColor(service.status)"
                />
                <h3 class="text-sm font-medium text-gray-900">{{ service.name }}</h3>
              </div>
              <span 
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                :class="getStatusBadgeClass(service.status)"
              >
                {{ getStatusDisplayName(service.status) }}
              </span>
            </div>
            
            <div class="space-y-2 text-xs text-gray-600">
              <div class="flex justify-between">
                <span>响应时间:</span>
                <span class="font-medium">{{ service.responseTime }}ms</span>
              </div>
              <div class="flex justify-between">
                <span>最后检查:</span>
                <span class="font-medium">{{ formatDateTime(service.lastCheck) }}</span>
              </div>
              <div v-if="service.uptime" class="flex justify-between">
                <span>运行时间:</span>
                <span class="font-medium">{{ formatUptime(service.uptime) }}</span>
              </div>
              <div v-if="service.version" class="flex justify-between">
                <span>版本:</span>
                <span class="font-medium">{{ service.version }}</span>
              </div>
            </div>
            
            <div v-if="service.error" class="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
              {{ service.error }}
            </div>
            
            <div class="mt-3 flex justify-end space-x-2">
              <button
                @click="checkService(service.name)"
                class="text-blue-600 hover:text-blue-900 text-xs"
                title="立即检查"
              >
                <RefreshCw class="h-3 w-3" />
              </button>
              <button
                @click="showServiceDetails(service)"
                class="text-gray-600 hover:text-gray-900 text-xs"
                title="查看详情"
              >
                <Eye class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统资源监控 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">系统资源监控</h2>
      </div>
      
      <div class="p-6">
        <div v-if="systemStats" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- CPU 使用率 -->
          <div class="text-center">
            <div class="relative inline-flex items-center justify-center w-24 h-24 mb-3">
              <svg class="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  stroke-width="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  :stroke="getCpuColor(systemStats.cpu.usage)"
                  stroke-width="8"
                  fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="`${2 * Math.PI * 40}`"
                  :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - (systemStats.cpu?.usage || 0) / 100)}`"
                  class="transition-all duration-300"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-lg font-bold text-gray-900">{{ Math.round(systemStats.cpu?.usage || 0) }}%</span>
              </div>
            </div>
            <h3 class="text-sm font-medium text-gray-900 mb-1">CPU 使用率</h3>
            <p class="text-xs text-gray-500">{{ systemStats.cpu?.cores || '-' }} 核心</p>
          </div>
          
          <!-- 内存使用率 -->
          <div class="text-center">
            <div class="relative inline-flex items-center justify-center w-24 h-24 mb-3">
              <svg class="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  stroke-width="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  :stroke="getMemoryColor(systemStats.memory?.usage || 0)"
                  stroke-width="8"
                  fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="`${2 * Math.PI * 40}`"
                  :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - (systemStats.memory?.usage || 0) / 100)}`"
                  class="transition-all duration-300"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-lg font-bold text-gray-900">{{ Math.round(systemStats.memory?.usage || 0) }}%</span>
              </div>
            </div>
            <h3 class="text-sm font-medium text-gray-900 mb-1">内存使用率</h3>
            <p class="text-xs text-gray-500">{{ formatSize(systemStats.memory?.used || 0) }} / {{ formatSize(systemStats.memory?.total || 0) }}</p>
          </div>
          
          <!-- 磁盘使用率 -->
          <div class="text-center">
            <div class="relative inline-flex items-center justify-center w-24 h-24 mb-3">
              <svg class="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  stroke-width="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  :stroke="getDiskColor(systemStats.disk?.usage || 0)"
                  stroke-width="8"
                  fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="`${2 * Math.PI * 40}`"
                  :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - (systemStats.disk?.usage || 0) / 100)}`"
                  class="transition-all duration-300"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-lg font-bold text-gray-900">{{ Math.round(systemStats.disk?.usage || 0) }}%</span>
              </div>
            </div>
            <h3 class="text-sm font-medium text-gray-900 mb-1">磁盘使用率</h3>
            <p class="text-xs text-gray-500">{{ formatSize(systemStats.disk?.used || 0) }} / {{ formatSize(systemStats.disk?.total || 0) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务详情对话框 -->
    <div v-if="showDetailsDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">服务详情 - {{ selectedService?.name }}</h3>
            <button @click="closeDetailsDialog" class="text-gray-400 hover:text-gray-600">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="mt-4" v-if="selectedService">
            <div class="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label class="text-sm font-medium text-gray-600">服务名称</label>
                <p class="text-sm text-gray-900">{{ selectedService.name }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">服务类型</label>
                <p class="text-sm text-gray-900">{{ selectedService.type }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">状态</label>
                <p class="text-sm text-gray-900">{{ getStatusDisplayName(selectedService.status) }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">响应时间</label>
                <p class="text-sm text-gray-900">{{ selectedService.responseTime }}ms</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">运行时间</label>
                <p class="text-sm text-gray-900">{{ selectedService.uptime ? formatUptime(selectedService.uptime) : '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">版本</label>
                <p class="text-sm text-gray-900">{{ selectedService.version || '-' }}</p>
              </div>
            </div>
            
            <div v-if="selectedService.healthChecks" class="mt-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">健康检查</h4>
              <div class="space-y-2">
                <div 
                  v-for="check in selectedService.healthChecks" 
                  :key="check.name"
                  class="flex items-center justify-between p-2 border rounded"
                >
                  <span class="text-sm text-gray-900">{{ check.name }}</span>
                  <span 
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="check.status === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ check.status === 'pass' ? '通过' : '失败' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div v-if="selectedService.error" class="mt-6">
              <h4 class="text-md font-medium text-red-700 mb-3">错误信息</h4>
              <pre class="text-sm bg-red-50 p-3 rounded border border-red-200 text-red-800">{{ selectedService.error }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { monitoringApi, type ServiceStatus } from '@/api/monitoring'
import {
    AlertTriangle,
    CheckCircle,
    Database,
    Eye,
    Globe,
    RefreshCw,
    Server,
    X,
    XCircle
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'

// 响应式数据
const loading = ref(false)
const services = ref<ServiceStatus[]>([])
const systemStats = ref<any>({
  cpu: { usage: 0 },
  memory: { usage: 0, used: 0, total: 0 },
  disk: { usage: 0, used: 0, total: 0 }
})
const selectedService = ref<ServiceStatus | null>(null)
const showDetailsDialog = ref(false)

// 定时器
let refreshTimer: NodeJS.Timeout | null = null

// 计算属性
const healthyCount = computed(() => {
  return services.value.filter(service => service.status === 'healthy').length
})

const warningCount = computed(() => {
  return services.value.filter(service => service.status === 'warning').length
})

const errorCount = computed(() => {
  return services.value.filter(service => service.status === 'error').length
})

// 获取服务状态数据
const fetchServiceStatus = async () => {
  try {
    loading.value = true
    const response = await monitoringApi.getServiceStatus()
    
    if (response.success && response.data) {
      services.value = response.data.services || []
      systemStats.value = response.data.systemStats
    }
  } catch (error) {
    console.error('获取服务状态失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  fetchServiceStatus()
}

// 检查单个服务
const checkService = async (serviceName: string) => {
  try {
    console.log('检查服务:', serviceName)
    // 这里可以实现单个服务检查功能
    await fetchServiceStatus()
  } catch (error) {
    console.error('检查服务失败:', error)
  }
}

// 显示服务详情
const showServiceDetails = (service: ServiceStatus) => {
  selectedService.value = service
  showDetailsDialog.value = true
}

// 关闭服务详情对话框
const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  selectedService.value = null
}

// 获取服务图标
const getServiceIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    'database': Database,
    'api': Server,
    'web': Globe,
    'cache': Server
  }
  return iconMap[type] || Server
}

// 获取服务图标颜色
const getServiceIconColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'healthy': 'text-green-600',
    'warning': 'text-yellow-600',
    'error': 'text-red-600'
  }
  return colorMap[status] || 'text-gray-600'
}

// 获取状态显示名称
const getStatusDisplayName = (status: string): string => {
  const statusMap: Record<string, string> = {
    'healthy': '正常',
    'warning': '警告',
    'error': '异常'
  }
  return statusMap[status] || status
}

// 获取状态徽章样式
const getStatusBadgeClass = (status: string): string => {
  const classMap: Record<string, string> = {
    'healthy': 'bg-green-100 text-green-800',
    'warning': 'bg-yellow-100 text-yellow-800',
    'error': 'bg-red-100 text-red-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

// 获取CPU颜色
const getCpuColor = (usage: number): string => {
  if (usage > 80) return '#ef4444' // red
  if (usage > 60) return '#f59e0b' // yellow
  return '#10b981' // green
}

// 获取内存颜色
const getMemoryColor = (usage: number): string => {
  if (usage > 85) return '#ef4444' // red
  if (usage > 70) return '#f59e0b' // yellow
  return '#10b981' // green
}

// 获取磁盘颜色
const getDiskColor = (usage: number): string => {
  if (usage > 90) return '#ef4444' // red
  if (usage > 75) return '#f59e0b' // yellow
  return '#10b981' // green
}

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化运行时间
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}天 ${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  fetchServiceStatus()
  
  // 设置定时刷新（每30秒）
  refreshTimer = setInterval(() => {
    fetchServiceStatus()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>