/**
 * 系统统计数据管理组合式函数
 * 从 ServiceStatus.vue 中分离的系统统计逻辑
 */

import { monitoringApi } from '@/api/monitoring'
import { ref } from 'vue'
import type { SystemStats } from '../types/service-status.types'

export function useSystemStats() {
  const systemStats = ref<SystemStats>({
    cpu: { usage: 0 },
    memory: { usage: 0, used: 0, total: 0 },
    disk: { usage: 0, used: 0, total: 0 }
  })

  // 获取系统统计数据
  const fetchSystemStats = async () => {
    try {
      const response = await monitoringApi.getServiceStatus()
      
      if (response.success && response.data) {
        systemStats.value = response.data.systemStats || systemStats.value
      }
    } catch (error) {
      console.error('获取系统统计失败:', error)
    }
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

  return {
    // 状态
    systemStats,
    
    // 方法
    fetchSystemStats,
    getCpuColor,
    getMemoryColor,
    getDiskColor,
    formatSize
  }
}
