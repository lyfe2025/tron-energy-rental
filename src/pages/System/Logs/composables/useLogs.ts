import { reactive, ref } from 'vue'
import type {
  LogCleanupConfig,
  LogCleanupConfigResponse,
  LogCleanupRequest,
  LogCleanupResponse,
  LogExportRequest,
  LogExportResponse,
  LoginLog,
  LoginLogListResponse,
  LoginLogQuery,
  LogStats,
  LogStatsResponse,
  OperationLog,
  OperationLogListResponse,
  OperationLogQuery,
  Pagination
} from '../types'

export function useLogs() {
  // 登录日志状态
  const loginLogs = ref<LoginLog[]>([])
  const loginLoading = ref(false)
  const loginError = ref<string | null>(null)
  const loginPagination = reactive<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // 操作日志状态
  const operationLogs = ref<OperationLog[]>([])
  const operationLoading = ref(false)
  const operationError = ref<string | null>(null)
  const operationPagination = reactive<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // 统计数据状态
  const stats = ref<LogStats | null>(null)
  const statsLoading = ref(false)
  const statsError = ref<string | null>(null)

  // 通用请求函数
  const request = async <T>(url: string, options: RequestInit = {}): Promise<T | null> => {
    try {
      // 从 localStorage 获取 token
      const token = localStorage.getItem('admin_token')
      
      // 添加API基础URL
      const baseURL = 'http://localhost:3001/api'
      const fullURL = url.startsWith('http') ? url : `${baseURL}${url}`
      
      const response = await fetch(fullURL, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        },
        ...options
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || result.message || '请求失败')
      }

      return result
    } catch (error) {
      console.error('Request failed:', error)
      throw error
    }
  }

  // 加载登录日志列表
  const loadLoginLogs = async (query: LoginLogQuery = {}) => {
    try {
      loginLoading.value = true
      loginError.value = null

      const params = new URLSearchParams()
      if (query.username) params.append('username', query.username)
      if (query.ip) params.append('ip', query.ip)
      if (query.status !== undefined && query.status !== '') params.append('status', query.status.toString())
      if (query.timeRange) params.append('timeRange', query.timeRange)
      if (query.startDate) params.append('startDate', query.startDate)
      if (query.endDate) params.append('endDate', query.endDate)
      params.append('page', loginPagination.page.toString())
      params.append('pageSize', loginPagination.pageSize.toString())

      const result = await request<any>(`/system/logs/logins?${params}`)
      
      if (result) {
        // 处理后端实际返回的数据结构
        const responseData = result.data
        loginLogs.value = responseData.logs || responseData.list || []
        const paginationData = responseData.pagination || responseData
        loginPagination.total = paginationData.total || 0
        loginPagination.page = paginationData.page || 1
        loginPagination.pageSize = paginationData.limit || paginationData.pageSize || 20
      }
    } catch (error) {
      loginError.value = error instanceof Error ? error.message : '加载登录日志失败'
      console.error('加载登录日志失败:', error)
    } finally {
      loginLoading.value = false
    }
  }

  // 加载操作日志列表
  const loadOperationLogs = async (query: OperationLogQuery = {}) => {
    try {
      operationLoading.value = true
      operationError.value = null

      const params = new URLSearchParams()
      if (query.username) params.append('username', query.username)
      if (query.action) params.append('action', query.action)
      if (query.resource) params.append('resource', query.resource)
      if (query.resourceId) params.append('resourceId', query.resourceId.toString())
      if (query.timeRange) params.append('timeRange', query.timeRange)
      if (query.startDate) params.append('startDate', query.startDate)
      if (query.endDate) params.append('endDate', query.endDate)
      params.append('page', operationPagination.page.toString())
      params.append('pageSize', operationPagination.pageSize.toString())

      const result = await request<any>(`/system/logs/operations?${params}`)
      
      if (result) {
        // 处理后端实际返回的数据结构
        const responseData = result.data
        operationLogs.value = responseData.logs || responseData.list || []
        const paginationData = responseData.pagination || responseData
        operationPagination.total = paginationData.total || 0
        operationPagination.page = paginationData.page || 1
        operationPagination.pageSize = paginationData.limit || paginationData.pageSize || 20
      }
    } catch (error) {
      operationError.value = error instanceof Error ? error.message : '加载操作日志失败'
      console.error('加载操作日志失败:', error)
    } finally {
      operationLoading.value = false
    }
  }

  // 获取日志统计数据
  const loadStats = async () => {
    try {
      statsLoading.value = true
      statsError.value = null

      const result = await request<LogStatsResponse>('/system/logs/stats')
      
      if (result) {
        stats.value = result.data
      }
    } catch (error) {
      statsError.value = error instanceof Error ? error.message : '获取统计数据失败'
      console.error('获取统计数据失败:', error)
    } finally {
      statsLoading.value = false
    }
  }

  // 导出日志
  const exportLogs = async (exportRequest: LogExportRequest): Promise<string | null> => {
    try {
      const result = await request<LogExportResponse>('/system/logs/export', {
        method: 'POST',
        body: JSON.stringify(exportRequest)
      })
      
      if (result) {
        return result.data.downloadUrl
      }
      return null
    } catch (error) {
      console.error('导出日志失败:', error)
      throw error
    }
  }

  // 获取日志清理配置
  const getCleanupConfig = async (): Promise<LogCleanupConfig | null> => {
    try {
      const result = await request<LogCleanupConfigResponse>('/system/logs/cleanup/config')
      return result ? result.data : null
    } catch (error) {
      console.error('获取清理配置失败:', error)
      throw error
    }
  }

  // 更新日志清理配置
  const updateCleanupConfig = async (config: LogCleanupConfig): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean; message: string }>('/system/logs/cleanup/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      })
      return result?.success === true
    } catch (error) {
      console.error('更新清理配置失败:', error)
      throw error
    }
  }

  // 清理日志
  const cleanupLogs = async (cleanupRequest: LogCleanupRequest): Promise<number> => {
    try {
      const result = await request<LogCleanupResponse>('/system/logs/cleanup', {
        method: 'POST',
        body: JSON.stringify(cleanupRequest)
      })
      return result ? result.data.deletedCount : 0
    } catch (error) {
      console.error('清理日志失败:', error)
      throw error
    }
  }

  // 获取登录日志详情
  const getLoginLogDetail = async (id: number): Promise<LoginLog | null> => {
    try {
      const result = await request<{ code: number; message: string; data: LoginLog }>(`/system/logs/logins/${id}`)
      return result ? result.data : null
    } catch (error) {
      console.error('获取登录日志详情失败:', error)
      throw error
    }
  }

  // 获取操作日志详情
  const getOperationLogDetail = async (id: number): Promise<OperationLog | null> => {
    try {
      const result = await request<{ code: number; message: string; data: OperationLog }>(`/system/logs/operations/${id}`)
      return result ? result.data : null
    } catch (error) {
      console.error('获取操作日志详情失败:', error)
      throw error
    }
  }

  // 批量删除登录日志
  const deleteLoginLogs = async (ids: number[]): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean; message: string }>('/system/logs/logins/batch-delete', {
        method: 'DELETE',
        body: JSON.stringify({ ids })
      })
      return result?.success === true
    } catch (error) {
      console.error('删除登录日志失败:', error)
      throw error
    }
  }

  // 批量删除操作日志
  const deleteOperationLogs = async (ids: number[]): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean; message: string }>('/system/logs/operations/batch-delete', {
        method: 'DELETE',
        body: JSON.stringify({ ids })
      })
      return result?.success === true
    } catch (error) {
      console.error('删除操作日志失败:', error)
      throw error
    }
  }

  // 获取用户操作历史
  const getUserOperationHistory = async (userId: number, limit: number = 50): Promise<OperationLog[]> => {
    try {
      const result = await request<OperationLogListResponse>(`/system/logs/user/${userId}/operations?limit=${limit}`)
      return result ? result.data.list : []
    } catch (error) {
      console.error('获取用户操作历史失败:', error)
      throw error
    }
  }

  // 获取用户登录历史
  const getUserLoginHistory = async (userId: number, limit: number = 50): Promise<LoginLog[]> => {
    try {
      const result = await request<LoginLogListResponse>(`/api/logs/user/${userId}/logins?limit=${limit}`)
      return result ? result.data.list : []
    } catch (error) {
      console.error('获取用户登录历史失败:', error)
      throw error
    }
  }

  // 重置状态
  const resetState = () => {
    // 重置登录日志状态
    loginLogs.value = []
    loginError.value = null
    loginPagination.page = 1
    loginPagination.total = 0

    // 重置操作日志状态
    operationLogs.value = []
    operationError.value = null
    operationPagination.page = 1
    operationPagination.total = 0

    // 重置统计数据状态
    stats.value = null
    statsError.value = null
  }

  return {
    // 登录日志
    loginLogs,
    loginLoading,
    loginError,
    loginPagination,
    loadLoginLogs,
    getLoginLogDetail,
    deleteLoginLogs,
    getUserLoginHistory,

    // 操作日志
    operationLogs,
    operationLoading,
    operationError,
    operationPagination,
    loadOperationLogs,
    getOperationLogDetail,
    deleteOperationLogs,
    getUserOperationHistory,

    // 统计数据
    stats,
    statsLoading,
    statsError,
    loadStats,

    // 工具函数
    exportLogs,
    getCleanupConfig,
    updateCleanupConfig,
    cleanupLogs,
    resetState
  }
}