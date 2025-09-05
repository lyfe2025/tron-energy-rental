import { systemLogsApi } from '@/api/system/system-logs'
import { reactive, ref } from 'vue'
import type { SystemLog, SystemLogPagination, SystemLogSearchForm } from '../types/system-logs.types'

export function useSystemLogs() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const logs = ref<SystemLog[]>([])
  
  const searchForm = reactive<SystemLogSearchForm>({
    level: '',
    module: '',
    message: '',
    start_date: '',
    end_date: '',
    user_id: undefined
  })
  
  const pagination = reactive<SystemLogPagination>({
    current: 1,
    pageSize: 20,
    total: 0,
    hasNext: false,
    hasPrev: false
  })
  
  // 获取系统日志列表
  const fetchLogs = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await systemLogsApi.getList({
        ...searchForm,
        page: pagination.current,
        pageSize: pagination.pageSize
      })
      
      if (response.success && response.data) {
        const data = response.data
        logs.value = data.list || []
        
        // 更新分页信息
        if (data.pagination) {
          pagination.total = data.pagination.total || 0
          pagination.current = data.pagination.current || 1
          pagination.pageSize = data.pagination.pageSize || 20
          pagination.hasNext = data.pagination.hasNext || false
          pagination.hasPrev = data.pagination.hasPrev || false
        }
      } else {
        throw new Error(response.message || '获取系统日志失败')
      }
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取系统日志失败'
      console.error('获取系统日志失败:', err)
      
      // 如果API调用失败，清空日志列表
      logs.value = []
      pagination.total = 0
      pagination.hasNext = false
      pagination.hasPrev = false
    } finally {
      loading.value = false
    }
  }
  
  // 搜索处理
  const handleSearch = async (form: SystemLogSearchForm) => {
    Object.assign(searchForm, form)
    pagination.current = 1
    await fetchLogs()
  }
  
  // 重置搜索
  const handleReset = async () => {
    Object.assign(searchForm, {
      level: '',
      module: '',
      message: '',
      start_date: '',
      end_date: '',
      user_id: undefined
    })
    pagination.current = 1
    await fetchLogs()
  }
  
  // 上一页
  const prevPage = async () => {
    if (pagination.current > 1) {
      pagination.current--
      await fetchLogs()
    }
  }
  
  // 下一页
  const nextPage = async () => {
    if (pagination.hasNext) {
      pagination.current++
      await fetchLogs()
    }
  }
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }
  
  return {
    loading,
    error,
    logs,
    searchForm,
    pagination,
    fetchLogs,
    handleSearch,
    handleReset,
    prevPage,
    nextPage,
    formatDate
  }
}