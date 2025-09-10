import { onUnmounted, reactive, ref } from 'vue'
import type { RealtimeData, RealtimeLog } from '../types/analytics.types'

export function useRealtimeData(botId: string) {
  const realtimeEnabled = ref(false)
  let realtimeTimer: number | null = null

  // 实时数据
  const realtimeData = reactive<RealtimeData>({
    queueSize: 0,
    messagesPerMinute: 0,
    errorRate: 0
  })

  const realtimeLogs = ref<RealtimeLog[]>([])

  const startRealtimeUpdates = () => {
    realtimeTimer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/telegram-bot-notifications/${botId}/realtime`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          Object.assign(realtimeData, data.data.metrics)
          realtimeLogs.value = data.data.logs.slice(0, 50) // 只保留最新50条
        }
      } catch (error) {
        console.error('获取实时数据失败:', error)
      }
    }, 5000) // 每5秒更新一次
  }

  const stopRealtimeUpdates = () => {
    if (realtimeTimer) {
      clearInterval(realtimeTimer)
      realtimeTimer = null
    }
  }

  const toggleRealtime = (enabled: boolean) => {
    realtimeEnabled.value = enabled
    if (enabled) {
      startRealtimeUpdates()
    } else {
      stopRealtimeUpdates()
    }
  }

  // 清理定时器
  onUnmounted(() => {
    stopRealtimeUpdates()
  })

  return {
    realtimeEnabled,
    realtimeData,
    realtimeLogs,
    toggleRealtime
  }
}
