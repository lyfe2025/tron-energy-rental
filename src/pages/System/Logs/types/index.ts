// 登录状态枚举
export enum LoginStatus {
  SUCCESS = 1,
  FAILED = 0
}

// 操作类型枚举
export enum OperationAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout'
}

// 资源类型枚举
export enum ResourceType {
  USER = 'user',
  ROLE = 'role',
  DEPARTMENT = 'department',
  POSITION = 'position',
  MENU = 'menu'
}

// 登录日志接口
export interface LoginLog {
  id: number
  user_id: string
  username: string
  email?: string
  ip_address: string
  user_agent: string
  status: number // 1表示成功，0表示失败
  failure_reason?: string
  created_at: string
}

// 操作日志接口
export interface OperationLog {
  id: number
  user_id: number
  username: string
  action: OperationAction
  resource: ResourceType
  resource_id?: number
  description?: string
  details?: Record<string, any>
  ip_address: string
  user_agent: string
  created_at: string
}

// 登录日志查询参数
export interface LoginLogQuery {
  username?: string
  ip?: string
  status?: LoginStatus | ''
  timeRange?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

// 操作日志查询参数
export interface OperationLogQuery {
  username?: string
  action?: OperationAction | ''
  resource?: ResourceType | ''
  resourceId?: number
  timeRange?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

// API响应接口
export interface LoginLogListResponse {
  code: number
  message: string
  data: {
    list: LoginLog[]
    total: number
    page: number
    pageSize: number
  }
}

export interface OperationLogListResponse {
  code: number
  message: string
  data: {
    list: OperationLog[]
    total: number
    page: number
    pageSize: number
  }
}

// 日志统计接口
export interface LogStats {
  totalLoginLogs: number
  totalOperationLogs: number
  todayLoginLogs: number
  todayOperationLogs: number
  successLoginRate: number
  topUsers: Array<{
    username: string
    loginCount: number
    operationCount: number
  }>
  topActions: Array<{
    action: string
    count: number
  }>
  topResources: Array<{
    resource: string
    count: number
  }>
}

export interface LogStatsResponse {
  code: number
  message: string
  data: LogStats
}

// 日志导出参数
export interface LogExportRequest {
  type: 'login' | 'operation'
  format: 'csv' | 'excel'
  query?: LoginLogQuery | OperationLogQuery
}

export interface LogExportResponse {
  code: number
  message: string
  data: {
    downloadUrl: string
    filename: string
  }
}

// 分页接口
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

// 错误响应接口
export interface ErrorResponse {
  code: number
  message: string
  data?: any
}

// 日志详情对话框数据
export interface LogDetailsData {
  log: OperationLog
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  relatedLogs?: OperationLog[]
}

// 日志清理配置
export interface LogCleanupConfig {
  loginLogRetentionDays: number
  operationLogRetentionDays: number
  autoCleanup: boolean
  cleanupTime: string // HH:mm 格式
}

export interface LogCleanupConfigResponse {
  code: number
  message: string
  data: LogCleanupConfig
}

export interface LogCleanupRequest {
  type: 'login' | 'operation' | 'all'
  beforeDate: string
}

export interface LogCleanupResponse {
  code: number
  message: string
  data: {
    deletedCount: number
  }
}

// 日志监控告警
export interface LogAlert {
  id: number
  name: string
  type: 'login_failure' | 'operation_frequency' | 'suspicious_activity'
  condition: Record<string, any>
  threshold: number
  enabled: boolean
  notificationMethods: string[]
  created_at: string
  updated_at: string
}

export interface LogAlertResponse {
  code: number
  message: string
  data: LogAlert
}

export interface LogAlertListResponse {
  code: number
  message: string
  data: {
    list: LogAlert[]
    total: number
  }
}

// 日志分析报告
export interface LogAnalysisReport {
  period: string
  loginStats: {
    totalLogins: number
    successLogins: number
    failedLogins: number
    uniqueUsers: number
    peakHour: string
  }
  operationStats: {
    totalOperations: number
    operationsByAction: Record<string, number>
    operationsByResource: Record<string, number>
    topUsers: Array<{
      username: string
      operationCount: number
    }>
  }
  securityEvents: {
    suspiciousLogins: number
    multipleFailedLogins: number
    unusualOperations: number
  }
  trends: {
    loginTrend: Array<{
      date: string
      count: number
    }>
    operationTrend: Array<{
      date: string
      count: number
    }>
  }
}

export interface LogAnalysisReportResponse {
  code: number
  message: string
  data: LogAnalysisReport
}