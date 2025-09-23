import { useToast } from '@/composables/useToast'
import { reactive, ref } from 'vue'
import type {
    AnalyticsResponse,
    DetailedStat,
    DetailedStatsResponse,
    Metrics,
    NotificationDetailsResponse,
    Pagination
} from '../types/analytics.types'

export function useAnalyticsData(botId: string) {
  const { error } = useToast()
  
  const loading = ref(false)
  const dateRange = ref<[string, string]>(['', ''])
  
  // 关键指标
  const metrics = reactive<Metrics>({
    totalSent: 0,
    sentChange: 0,
    successRate: 0,
    successRateChange: 0,
    activeUsers: 0,
    activeUsersChange: 0,
    avgResponseTime: 0,
    responseTimeChange: 0
  })

  // 详细统计数据
  const detailedStats = ref<DetailedStat[]>([])
  const selectedNotification = ref<DetailedStat | null>(null)
  const notificationErrors = ref<any[]>([])

  // 分页
  const pagination = reactive<Pagination>({
    page: 1,
    limit: 20,
    total: 0
  })

  // 图表数据
  const trendData = ref<any>(null)
  const distributionData = ref<any[]>([])
  const performanceData = ref<any>(null)
  const hourlyHeatmap = ref<any[]>([])

  const loadAnalyticsData = async () => {
    loading.value = true
    try {
      const params = new URLSearchParams({
        start_date: dateRange.value[0],
        end_date: dateRange.value[1]
      })
      
      const response = await fetch(`/api/telegram-bot-notifications/${botId}/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const data: AnalyticsResponse = await response.json()
        
        // 更新关键指标
        Object.assign(metrics, data.data.metrics)
        
        // 更新图表数据
        trendData.value = data.data.trendData
        distributionData.value = data.data.distributionData
        performanceData.value = data.data.performanceData
        
        // 更新热力图
        hourlyHeatmap.value = data.data.hourlyHeatmap || []
        
        // 加载详细统计
        await loadDetailedStats()
      }
    } catch (error) {
      console.error('加载分析数据失败:', error)
      error('加载分析数据失败')
    } finally {
      loading.value = false
    }
  }

  const loadDetailedStats = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        start_date: dateRange.value[0],
        end_date: dateRange.value[1]
      })
      
      const response = await fetch(`/api/telegram-bot-notifications/${botId}/analytics/detailed?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const data: DetailedStatsResponse = await response.json()
        detailedStats.value = data.data.stats
        pagination.total = data.data.total
      }
    } catch (error) {
      console.error('加载详细统计失败:', error)
    }
  }

  const loadNotificationDetails = async (notificationType: string) => {
    try {
      const response = await fetch(`/api/telegram-bot-notifications/${botId}/analytics/notification/${notificationType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const data: NotificationDetailsResponse = await response.json()
        notificationErrors.value = data.data.errors || []
        return data.data.trendData
      }
    } catch (error) {
      console.error('加载通知详情失败:', error)
    }
    return null
  }

  const setQuickRange = (range: string) => {
    const now = new Date()
    const end = new Date(now)
    let start = new Date(now)
    
    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'yesterday':
        start.setDate(now.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(now.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setDate(now.getDate() - 30)
        break
      case 'quarter':
        start.setDate(now.getDate() - 90)
        break
    }
    
    dateRange.value = [
      start.toISOString().slice(0, 19).replace('T', ' '),
      end.toISOString().slice(0, 19).replace('T', ' ')
    ]
    
    loadAnalyticsData()
  }

  return {
    // 状态
    loading,
    dateRange,
    metrics,
    detailedStats,
    selectedNotification,
    notificationErrors,
    pagination,
    trendData,
    distributionData,
    performanceData,
    hourlyHeatmap,
    
    // 方法
    loadAnalyticsData,
    loadDetailedStats,
    loadNotificationDetails,
    setQuickRange
  }
}
