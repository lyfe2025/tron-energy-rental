<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">缓存状态监控</h1>
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

    <!-- 缓存概览 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <Database class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">缓存命中率</p>
            <p class="text-2xl font-bold text-gray-900">{{ cacheStats?.hitRate || 0 }}%</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <TrendingUp class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总请求数</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatNumber(cacheStats?.totalRequests || 0) }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 rounded-lg">
            <HardDrive class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">内存使用</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatSize(cacheStats?.memoryUsed || 0) }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-orange-100 rounded-lg">
            <Key class="h-6 w-6 text-orange-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">缓存键数量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatNumber(cacheStats?.totalKeys || 0) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 缓存实例状态 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">缓存实例状态</h2>
      </div>
      
      <div class="p-6">
        <div v-if="loading" class="text-center py-8">
          <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
          <p class="text-gray-500">检查缓存状态中...</p>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            v-for="instance in cacheInstances" 
            :key="instance.name" 
            class="border rounded-lg p-4"
            :class="{
              'border-green-200 bg-green-50': instance.status === 'connected',
              'border-red-200 bg-red-50': instance.status === 'disconnected'
            }"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <Database class="h-5 w-5 mr-2" :class="instance.status === 'connected' ? 'text-green-600' : 'text-red-600'" />
                <h3 class="text-sm font-medium text-gray-900">{{ instance.name }}</h3>
              </div>
              <span 
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                :class="instance.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ instance.status === 'connected' ? '已连接' : '已断开' }}
              </span>
            </div>
            
            <div class="space-y-2 text-xs text-gray-600">
              <div class="flex justify-between">
                <span>类型:</span>
                <span class="font-medium">{{ instance.type }}</span>
              </div>
              <div class="flex justify-between">
                <span>版本:</span>
                <span class="font-medium">{{ instance.version || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>连接数:</span>
                <span class="font-medium">{{ instance.connections || 0 }}</span>
              </div>
              <div class="flex justify-between">
                <span>运行时间:</span>
                <span class="font-medium">{{ instance.uptime ? formatUptime(instance.uptime) : '-' }}</span>
              </div>
            </div>
            
            <div class="mt-3 flex justify-end space-x-2">
              <button
                @click="testConnection(instance.name)"
                class="text-blue-600 hover:text-blue-900 text-xs"
                title="测试连接"
              >
                <RefreshCw class="h-3 w-3" />
              </button>
              <button
                @click="showInstanceDetails(instance)"
                class="text-gray-600 hover:text-gray-900 text-xs"
                title="查看详情"
              >
                <Eye class="h-3 w-3" />
              </button>
              <button
                @click="clearCache(instance.name)"
                class="text-red-600 hover:text-red-900 text-xs"
                title="清空缓存"
              >
                <Trash2 class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 缓存性能统计 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">缓存性能统计</h2>
      </div>
      
      <div class="p-6">
        <div v-if="cacheStats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- 命中率图表 -->
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
                  :stroke="getHitRateColor(cacheStats.hitRate)"
                  stroke-width="8"
                  fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="`${2 * Math.PI * 40}`"
                  :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - cacheStats.hitRate / 100)}`"
                  class="transition-all duration-300"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-lg font-bold text-gray-900">{{ Math.round(cacheStats.hitRate) }}%</span>
              </div>
            </div>
            <h3 class="text-sm font-medium text-gray-900 mb-1">缓存命中率</h3>
            <p class="text-xs text-gray-500">{{ formatNumber(cacheStats.hits) }} / {{ formatNumber(cacheStats.totalRequests) }}</p>
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
                  :stroke="getMemoryUsageColor(cacheStats.memoryUsagePercent)"
                  stroke-width="8"
                  fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="`${2 * Math.PI * 40}`"
                  :stroke-dashoffset="`${2 * Math.PI * 40 * (1 - cacheStats.memoryUsagePercent / 100)}`"
                  class="transition-all duration-300"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-lg font-bold text-gray-900">{{ Math.round(cacheStats.memoryUsagePercent) }}%</span>
              </div>
            </div>
            <h3 class="text-sm font-medium text-gray-900 mb-1">内存使用率</h3>
            <p class="text-xs text-gray-500">{{ formatSize(cacheStats.memoryUsed) }} / {{ formatSize(cacheStats.memoryLimit) }}</p>
          </div>
          
          <!-- 平均响应时间 -->
          <div class="text-center">
            <div class="mb-3">
              <div class="text-3xl font-bold text-gray-900">{{ cacheStats.avgResponseTime }}ms</div>
            </div>
            <h3 class="text-sm font-medium text-gray-900 mb-1">平均响应时间</h3>
            <p class="text-xs text-gray-500">最近1小时</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 热点数据 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">热点数据</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">缓存键</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访问次数</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据大小</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">过期时间</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in hotKeys" :key="item.key">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ item.key }}</div>
                <div class="text-sm text-gray-500">{{ item.type }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatNumber(item.accessCount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatSize(item.size) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.ttl > 0 ? formatTTL(item.ttl) : '永不过期' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="viewCacheData(item.key)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  查看
                </button>
                <button
                  @click="deleteCacheKey(item.key)"
                  class="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 实例详情对话框 -->
    <div v-if="showDetailsDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">缓存实例详情 - {{ selectedInstance?.name }}</h3>
            <button @click="closeDetailsDialog" class="text-gray-400 hover:text-gray-600">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="mt-4" v-if="selectedInstance">
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label class="text-sm font-medium text-gray-600">实例名称</label>
                <p class="text-sm text-gray-900">{{ selectedInstance.name }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">类型</label>
                <p class="text-sm text-gray-900">{{ selectedInstance.type }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">状态</label>
                <p class="text-sm text-gray-900">{{ selectedInstance.status === 'connected' ? '已连接' : '已断开' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">版本</label>
                <p class="text-sm text-gray-900">{{ selectedInstance.version || '-' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">连接数</label>
                <p class="text-sm text-gray-900">{{ selectedInstance.connections || 0 }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">运行时间</label>
                <p class="text-sm text-gray-900">{{ selectedInstance.uptime ? formatUptime(selectedInstance.uptime) : '-' }}</p>
              </div>
            </div>
            
            <div v-if="selectedInstance.config" class="mt-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">配置信息</h4>
              <pre class="text-sm bg-gray-50 p-3 rounded border text-gray-800">{{ JSON.stringify(selectedInstance.config, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { monitoringApi, type CacheInstance, type CacheStats, type HotKey } from '@/api/monitoring'
import {
  Database,
  Eye,
  HardDrive,
  Key,
  RefreshCw,
  Trash2,
  TrendingUp,
  X
} from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

// 响应式数据
const loading = ref(false)
const cacheStats = ref<CacheStats | null>(null)
const cacheInstances = ref<CacheInstance[]>([])
const hotKeys = ref<HotKey[]>([])
const selectedInstance = ref<CacheInstance | null>(null)
const showDetailsDialog = ref(false)

// 定时器
let refreshTimer: NodeJS.Timeout | null = null

// 获取缓存状态数据
const fetchCacheStatus = async () => {
  try {
    loading.value = true
    const response = await monitoringApi.getCacheStatus()
    
    if (response.success && response.data) {
      cacheStats.value = response.data.stats
      cacheInstances.value = response.data.instances || []
      hotKeys.value = response.data.hotKeys || []
    }
  } catch (error) {
    console.error('获取缓存状态失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  fetchCacheStatus()
}

// 测试连接
const testConnection = async (instanceName: string) => {
  try {
    console.log('测试连接:', instanceName)
    // 这里可以实现测试连接功能
    await fetchCacheStatus()
  } catch (error) {
    console.error('测试连接失败:', error)
  }
}

// 显示实例详情
const showInstanceDetails = (instance: CacheInstance) => {
  selectedInstance.value = instance
  showDetailsDialog.value = true
}

// 关闭实例详情对话框
const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  selectedInstance.value = null
}

// 清空缓存
const clearCache = async (instanceName: string) => {
  if (confirm(`确定要清空 ${instanceName} 的所有缓存吗？`)) {
    try {
      console.log('清空缓存:', instanceName)
      // 这里可以实现清空缓存功能
      await fetchCacheStatus()
    } catch (error) {
      console.error('清空缓存失败:', error)
    }
  }
}

// 查看缓存数据
const viewCacheData = (key: string) => {
  console.log('查看缓存数据:', key)
  // 这里可以实现查看缓存数据功能
}

// 删除缓存键
const deleteCacheKey = async (key: string) => {
  if (confirm(`确定要删除缓存键 ${key} 吗？`)) {
    try {
      console.log('删除缓存键:', key)
      // 这里可以实现删除缓存键功能
      await fetchCacheStatus()
    } catch (error) {
      console.error('删除缓存键失败:', error)
    }
  }
}

// 获取命中率颜色
const getHitRateColor = (hitRate: number): string => {
  if (hitRate > 90) return '#10b981' // green
  if (hitRate > 70) return '#f59e0b' // yellow
  return '#ef4444' // red
}

// 获取内存使用率颜色
const getMemoryUsageColor = (usage: number): string => {
  if (usage > 85) return '#ef4444' // red
  if (usage > 70) return '#f59e0b' // yellow
  return '#10b981' // green
}

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
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

// 格式化TTL
const formatTTL = (seconds: number): string => {
  if (seconds > 86400) {
    return Math.floor(seconds / 86400) + '天'
  } else if (seconds > 3600) {
    return Math.floor(seconds / 3600) + '小时'
  } else if (seconds > 60) {
    return Math.floor(seconds / 60) + '分钟'
  } else {
    return seconds + '秒'
  }
}

// 生命周期
onMounted(() => {
  fetchCacheStatus()
  
  // 设置定时刷新（每30秒）
  refreshTimer = setInterval(() => {
    fetchCacheStatus()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>