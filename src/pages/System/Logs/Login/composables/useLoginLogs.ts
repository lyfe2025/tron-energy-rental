/**
 * 登录日志数据管理组合式函数
 * 从 Login/index.vue 中分离的数据处理逻辑
 */

import { reactive, ref } from 'vue'
import type { LoginLog, LoginLogPagination, LoginLogSearchParams } from '../types/login-logs.types'

export function useLoginLogs() {
  const loading = ref(false)
  const error = ref('')
  const logs = ref<LoginLog[]>([])

  const searchForm = reactive<LoginLogSearchParams>({
    username: '',
    status: '',
    ip_address: '',
    timeRange: ''
  })

  const pagination = reactive<LoginLogPagination>({
    current: 1,
    pageSize: 20,
    total: 0
  })

  const fetchLogs = async () => {
    loading.value = true
    error.value = ''
    try {
      // 调用API获取登录日志数据
      const { loginLogApi } = await import('@/api/system/logs')
      const requestParams = {
        ...searchForm,
        page: pagination.current,
        limit: pagination.pageSize
      }
      
      const response = await loginLogApi.getList(requestParams)
      
      if (response.success && response.data) {
        // request工具双重包装问题：需要访问 response.data.data
        const actualData = response.data.data || response.data
        const logsData = actualData.logs || []
        
        logs.value = logsData.map((log: any) => ({
          id: log.id.toString(),
          username: log.username,
          user_id: log.user_id,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          status: log.status, // 保持原始数字格式
          login_time: log.created_at,
          created_at: log.created_at,
          location: log.location || '-',
          device_type: 'Desktop', // 后端暂无此字段，使用默认值
          failure_reason: log.failure_reason
        }))
        
        pagination.total = actualData.pagination?.total || 0
      } else {
        throw new Error(response.error || response.message || '获取登录日志失败')
      }
    } catch (err: any) {
      console.error('获取登录日志失败:', err)
      error.value = err.message || '获取登录日志失败'
    } finally {
      loading.value = false
    }
  }

  const handleSearch = () => {
    pagination.current = 1
    fetchLogs()
  }

  const handleReset = () => {
    Object.assign(searchForm, {
      username: '',
      status: '',
      ip_address: '',
      timeRange: ''
    })
    handleSearch()
  }

  const prevPage = () => {
    if (pagination.current > 1) {
      pagination.current--
      fetchLogs()
    }
  }

  const nextPage = () => {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize)
    if (pagination.current < totalPages) {
      pagination.current++
      fetchLogs()
    }
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('zh-CN')
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs}秒`
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`
    } else {
      return `${secs}秒`
    }
  }

  return {
    // 状态
    loading,
    error,
    logs,
    searchForm,
    pagination,
    
    // 方法
    fetchLogs,
    handleSearch,
    handleReset,
    prevPage,
    nextPage,
    formatDate,
    formatDuration
  }
}
