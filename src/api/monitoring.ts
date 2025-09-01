import { request } from '@/lib/request'

/**
 * API响应包装器类型
 */
export interface ApiResponseWrapper<T> {
  success?: boolean
  data?: T | any
  message?: string
}

export interface MonitoringOverview {
  systemInfo: {
    platform: string
    arch: string
    nodeVersion: string
    uptime: number
  }
  performance: {
    cpuUsage: number
    memoryUsage: {
      used: number
      total: number
      percentage: number
    }
    diskUsage: {
      used: number
      total: number
      percentage: number
    }
  }
  onlineUsers: number
  runningTasks: number
  systemLoad: string
}

export interface OnlineUser {
  id: string
  username: string
  role: string
  loginTime: string
  lastActivity: string
  ipAddress: string
  userAgent: string
}

export interface ScheduledTask {
  id: string
  name: string
  description: string
  cronExpression: string
  status: 'active' | 'inactive' | 'running' | 'paused' | 'error'
  lastRun: string | null
  nextRun: string | null
  createdAt: string
  updatedAt?: string
}

export interface TaskExecutionLog {
  id: string
  taskId: string
  taskName: string
  status: 'success' | 'failed' | 'running' | 'error'
  startTime: string
  endTime: string | null
  duration: number | null
  errorMessage: string | null
  result: any
  output?: string
  error?: string
}

export interface DatabaseStats {
  totalTables: number
  totalRecords: number
  databaseSize: string | number
  connectionCount: number
  slowQueries: number | Array<{
    id: string
    query: string
    duration: number
    timestamp: string
  }>
  tableStats: Array<{
    tableName: string
    recordCount: number
    size: string
    lastUpdated?: string
    rowCount?: number
    tableSize?: number
    indexSize?: string
  }>
  // 为了向后兼容，添加其他可能的属性
  tableCount?: number
  userCount?: number
  orderCount?: number
  tables?: Array<{
    tableName: string
    recordCount: number
    size: string
    lastUpdated?: string
    rowCount?: number
    tableSize?: number
    indexSize?: string
  }>
  // API响应格式兼容性
  success?: boolean
  data?: any
  version?: string
  activeConnections?: number
  maxConnections?: number
}

export interface ServiceStatus {
  name: string
  status: 'healthy' | 'unhealthy' | 'warning' | 'error'
  uptime: number
  responseTime: number
  lastCheck: string
  details?: any
  type?: string
  version?: string
  error?: string
  healthChecks?: Array<{
    name: string
    status: 'healthy' | 'unhealthy' | 'warning' | 'pass' | 'fail'
    message?: string
    lastCheck: string
  }>
}

export interface CacheStatus {
  type: string
  status: 'connected' | 'disconnected'
  hitRate: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  keyCount: number
  operations: {
    gets: number
    sets: number
    deletes: number
  }
}

/**
 * 缓存实例信息
 */
export interface CacheInstance {
  id: string
  type: string
  host: string
  port: number
  status: 'connected' | 'disconnected' | 'error'
  uptime: number
  version: string
  connectionCount: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  keyCount: number
  hitRate: number
  operations: {
    gets: number
    sets: number
    deletes: number
    evictions: number
  }
  hotKeys: string[]
  // 为了向后兼容，添加其他可能的属性
  name?: string
  connections?: number
  config?: any
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  overview: {
    totalInstances: number
    connectedInstances: number
    totalMemoryUsed: number
    totalMemoryAvailable: number
    averageHitRate: number
    totalOperations: number
  }
  instances: CacheInstance[]
  hotKeys: HotKey[]
  performance: {
    avgResponseTime: number
    operationsPerSecond: number
    errorRate: number
  }
  // 为了向后兼容，添加顶级属性
  hitRate?: number
  totalRequests?: number
  memoryUsed?: number
  totalKeys?: number
  hits?: number
  memoryUsagePercent?: number
  memoryLimit?: number
  avgResponseTime?: number
}

/**
 * 热点键信息
 */
export interface HotKey {
  key: string
  accessCount: number
  lastAccessed: string
  size: number
  ttl: number
  type: string
  pattern?: string
}

/**
 * 数据库表信息
 */
export interface TableInfo {
  tableName: string
  recordCount: number
  size: string
  indexes: string[]
  lastUpdated: string
  schema: string
  estimatedRows: number
  dataSize: string
  indexSize: string
  // 为了向后兼容，添加其他可能的属性
  rowCount?: number
  tableSize?: number
  columns?: Array<{
    name: string
    type: string
    nullable: boolean
    default?: any
  }>
}

export const monitoringApi = {
  // 获取监控概览
  getOverview: () => {
    return request<ApiResponseWrapper<MonitoringOverview>>('/api/monitoring/overview')
  },

  // 获取在线用户列表
  getOnlineUsers: () => {
    return request<ApiResponseWrapper<OnlineUser[]>>('/api/monitoring/online-users')
  },

  // 强制用户下线
  forceLogout: (userId: string) => {
    return request('/api/monitoring/online-users/force-logout', {
      method: 'POST',
      data: { userId }
    })
  },

  // 获取定时任务列表
  getScheduledTasks: () => {
    return request<ApiResponseWrapper<ScheduledTask[]>>('/api/monitoring/scheduled-tasks')
  },

  // 获取任务执行日志
  getTaskExecutionLogs: (params?: {
    taskId?: string | number
    status?: string
    page?: number
    limit?: number
  } | string | number) => {
    // 兼容多种参数类型
    let searchParams = new URLSearchParams()
    
    if (typeof params === 'string' || typeof params === 'number') {
      // 如果参数是字符串或数字，则作为taskId处理
      searchParams.append('taskId', params.toString())
    } else if (params && typeof params === 'object') {
      // 如果参数是对象，则按对象处理
      if (params.taskId) searchParams.append('taskId', params.taskId.toString())
      if (params.status) searchParams.append('status', params.status)
      if (params.page) searchParams.append('page', params.page.toString())
      if (params.limit) searchParams.append('limit', params.limit.toString())
    }
    
    const queryString = searchParams.toString()
    const url = queryString ? `/api/monitoring/task-logs?${queryString}` : '/api/monitoring/task-logs'
    
    return request<ApiResponseWrapper<{
      logs: TaskExecutionLog[]
      total: number
      page: number
      limit: number
    }>>(url)
  },

  // 获取数据库监控信息
  getDatabaseStats: () => {
    return request<ApiResponseWrapper<DatabaseStats>>('/api/monitoring/database')
  },

  // 获取服务状态监控
  getServiceStatus: () => {
    return request<ApiResponseWrapper<{ services: ServiceStatus[]; systemStats?: any }>>('/api/monitoring/service-status')
  },

  // 获取缓存状态监控
  getCacheStatus: () => {
    return request<ApiResponseWrapper<{ stats: CacheStats; instances: CacheInstance[]; hotKeys: HotKey[] }>>('/api/monitoring/cache-status')
  },

  // 任务管理方法
  pauseTask: (taskId: string | number) => {
    return request(`/api/monitoring/scheduled-tasks/${taskId}/pause`, {
      method: 'POST'
    })
  },

  resumeTask: (taskId: string | number) => {
    return request(`/api/monitoring/scheduled-tasks/${taskId}/resume`, {
      method: 'POST'
    })
  },

  executeTask: (taskId: string | number) => {
    return request(`/api/monitoring/scheduled-tasks/${taskId}/execute`, {
      method: 'POST'
    })
  },

  // 服务管理方法
  checkService: (serviceName: string) => {
    return request(`/api/monitoring/services/${serviceName}/check`, {
      method: 'POST'
    })
  },

  testCacheConnection: () => {
    return request('/api/monitoring/cache/test-connection', {
      method: 'POST'
    })
  },

  clearCache: () => {
    return request('/api/monitoring/cache/clear', {
      method: 'POST'
    })
  },

  deleteCacheKey: (key: string) => {
    return request('/api/monitoring/cache/keys', {
      method: 'DELETE',
      data: { key }
    })
  }
}