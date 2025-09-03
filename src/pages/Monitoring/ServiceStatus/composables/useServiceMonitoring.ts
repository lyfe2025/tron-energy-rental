/**
 * 服务监控数据管理组合式函数
 * 从 ServiceStatus.vue 中分离的服务监控逻辑
 */

import { monitoringApi } from '@/api/monitoring'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ServiceStatus } from '../types/service-status.types'

export function useServiceMonitoring() {
  // 响应式数据
  const loading = ref(false)
  const services = ref<ServiceStatus[]>([])

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

  // 获取服务图标
  const getServiceIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      'database': 'Database',
      'api': 'Server',
      'web': 'Globe',
      'cache': 'Server'
    }
    return iconMap[type] || 'Server'
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

  return {
    // 状态
    loading,
    services,
    
    // 计算属性
    healthyCount,
    warningCount,
    errorCount,
    
    // 方法
    fetchServiceStatus,
    refreshData,
    checkService,
    getServiceIcon,
    getServiceIconColor,
    getStatusDisplayName,
    getStatusBadgeClass,
    formatDateTime,
    formatUptime
  }
}
