<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">监控概览</h1>
      <button
        @click="refreshData"
        :disabled="loading"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        刷新数据
      </button>
    </div>

    <!-- 系统信息卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- CPU 使用率 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">CPU 使用率</p>
            <p class="text-2xl font-bold text-gray-900">{{ cpuUsage }}%</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-lg">
            <Cpu class="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div class="mt-4">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${cpuUsage}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 内存使用率 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">内存使用率</p>
            <p class="text-2xl font-bold text-gray-900">{{ memoryUsage.percentage }}%</p>
          </div>
          <div class="p-3 bg-green-100 rounded-lg">
            <MemoryStick class="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div class="mt-4">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-green-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${memoryUsage.percentage}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ formatBytes(memoryUsage.used) }} / {{ formatBytes(memoryUsage.total) }}
          </p>
        </div>
      </div>

      <!-- 磁盘使用率 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">磁盘使用率</p>
            <p class="text-2xl font-bold text-gray-900">{{ diskUsage.percentage }}%</p>
          </div>
          <div class="p-3 bg-purple-100 rounded-lg">
            <HardDrive class="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div class="mt-4">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-purple-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${diskUsage.percentage}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ formatBytes(diskUsage.used) }} / {{ formatBytes(diskUsage.total) }}
          </p>
        </div>
      </div>

      <!-- 在线用户数 -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">在线用户</p>
            <p class="text-2xl font-bold text-gray-900">{{ onlineUsers }}</p>
          </div>
          <div class="p-3 bg-orange-100 rounded-lg">
            <Users class="h-6 w-6 text-orange-600" />
          </div>
        </div>
        <div class="mt-4">
          <router-link 
            to="/monitoring/online-users"
            class="text-sm text-indigo-600 hover:text-indigo-500"
          >
            查看详情 →
          </router-link>
        </div>
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">系统信息</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="space-y-1">
          <p class="text-sm font-medium text-gray-600">操作系统</p>
          <p class="text-sm text-gray-900">{{ systemInfo.platform }}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-gray-600">架构</p>
          <p class="text-sm text-gray-900">{{ systemInfo.arch }}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-gray-600">Node.js 版本</p>
          <p class="text-sm text-gray-900">{{ systemInfo.nodeVersion }}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-gray-600">运行时间</p>
          <p class="text-sm text-gray-900">{{ formatUptime(systemInfo.uptime) }}</p>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <router-link
          to="/monitoring/scheduled-tasks"
          class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
        >
          <Clock class="h-5 w-5 text-indigo-600 mr-3" />
          <span class="text-sm font-medium text-gray-900">管理定时任务</span>
        </router-link>
        
        <router-link
          to="/monitoring/database"
          class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
        >
          <Database class="h-5 w-5 text-green-600 mr-3" />
          <span class="text-sm font-medium text-gray-900">数据库监控</span>
        </router-link>
        
        <router-link
          to="/monitoring/service-status"
          class="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <Server class="h-5 w-5 text-blue-600 mr-3" />
          <span class="text-sm font-medium text-gray-900">服务状态</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { monitoringApi, type MonitoringOverview } from '@/api/monitoring'
import { Clock, Cpu, Database, HardDrive, MemoryStick, RefreshCw, Server, Users } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'

// 响应式数据
const loading = ref(false)
const overviewData = ref<MonitoringOverview | null>(null)

// 初始化默认数据
const initializeDefaultData = (): MonitoringOverview => ({
  systemInfo: {
    platform: 'Unknown',
    arch: 'Unknown',
    nodeVersion: 'Unknown',
    uptime: 0
  },
  performance: {
    cpuUsage: 0,
    memoryUsage: {
      used: 0,
      total: 0,
      percentage: 0
    },
    diskUsage: {
      used: 0,
      total: 0,
      percentage: 0
    }
  },
  onlineUsers: 0,
  runningTasks: 0,
  systemLoad: '0.00'
})

// 计算属性
const cpuUsage = computed(() => overviewData.value?.performance.cpuUsage || 0)
const memoryUsage = computed(() => overviewData.value?.performance.memoryUsage || { used: 0, total: 0, percentage: 0 })
const diskUsage = computed(() => overviewData.value?.performance.diskUsage || { used: 0, total: 0, percentage: 0 })
const systemInfo = computed(() => overviewData.value?.systemInfo || { platform: '', arch: '', nodeVersion: '', uptime: 0 })
const onlineUsers = computed(() => overviewData.value?.onlineUsers || 0)

// 定时器
let refreshTimer: NodeJS.Timeout | null = null

// 获取监控概览数据
const fetchOverviewData = async () => {
  try {
    loading.value = true
    const response = await monitoringApi.getOverview()
    
    if (response.success && response.data) {
      // 确保数据结构完整，合并默认值
      const defaultData = initializeDefaultData()
      overviewData.value = {
        systemInfo: {
          ...defaultData.systemInfo,
          ...response.data.systemInfo
        },
        performance: {
          ...defaultData.performance,
          ...response.data.performance,
          memoryUsage: {
            ...defaultData.performance.memoryUsage,
            ...response.data.performance?.memoryUsage
          },
          diskUsage: {
            ...defaultData.performance.diskUsage,
            ...response.data.performance?.diskUsage
          }
        },
        onlineUsers: response.data.onlineUsers || 0,
        runningTasks: response.data.runningTasks || 0,
        systemLoad: response.data.systemLoad || '0.00'
      }
    } else {
      // 如果API调用失败，使用默认数据
      overviewData.value = initializeDefaultData()
    }
  } catch (error) {
    console.error('获取监控数据失败:', error)
    // 出错时使用默认数据
    overviewData.value = initializeDefaultData()
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  fetchOverviewData()
}

// 格式化字节数
const formatBytes = (bytes: number): string => {
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
    return `${days}天 ${hours}小时 ${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 生命周期
onMounted(() => {
  // 先设置默认数据，避免初始渲染时的undefined错误
  overviewData.value = initializeDefaultData()
  
  fetchOverviewData()
  
  // 设置定时刷新（每30秒）
  refreshTimer = setInterval(() => {
    fetchOverviewData()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>