export interface AnalyticsProps {
  botId: string
}

export interface Metrics {
  totalSent: number
  sentChange: number
  successRate: number
  successRateChange: number
  activeUsers: number
  activeUsersChange: number
  avgResponseTime: number
  responseTimeChange: number
}

export interface DetailedStat {
  notification_type: string
  sent_count: number
  success_count: number
  failed_count: number
  success_rate: number
  avg_response_time: number
  click_count: number
  click_rate: number
  last_sent: string
  pending_count?: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
}

export interface RealtimeData {
  queueSize: number
  messagesPerMinute: number
  errorRate: number
}

export interface RealtimeLog {
  id: string
  timestamp: number
  notification_type: string
  status: string
  message: string
}

export interface HourlyHeatmapItem {
  hour: number
  value: number
}

export interface NotificationError {
  error_type: string
  error_count: number
  last_occurrence: string
  error_message: string
}

export interface ChartData {
  labels: string[]
  sent?: number[]
  success?: number[]
  failed?: number[]
  values?: number[]
}

export interface PerformanceData {
  responseTime: ChartData
  engagement: ChartData
}

export interface AnalyticsResponse {
  success: boolean
  data: {
    metrics: Metrics
    trendData: ChartData
    distributionData: Array<{name: string, value: number}>
    performanceData: PerformanceData
    hourlyHeatmap: HourlyHeatmapItem[]
  }
}

export interface DetailedStatsResponse {
  success: boolean
  data: {
    stats: DetailedStat[]
    total: number
  }
}

export interface NotificationDetailsResponse {
  success: boolean
  data: {
    errors: NotificationError[]
    trendData: ChartData
  }
}
