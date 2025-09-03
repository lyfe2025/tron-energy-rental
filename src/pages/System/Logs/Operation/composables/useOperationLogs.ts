import { reactive, ref } from 'vue'
import { useLogs } from '../../composables/useLogs'
import type { OperationLog, OperationLogQuery, Pagination, SearchForm } from '../types/operation-logs.types'

export function useOperationLogs() {
  const logs = ref<OperationLog[]>([])
  const error = ref('')
  const detailVisible = ref(false)
  const selectedLog = ref<OperationLog | null>(null)

  const searchForm = reactive<SearchForm>({
    username: '',
    module: '',
    operation: '',
    timeRange: ''
  })

  const pagination = reactive<Pagination>({
    current: 1,
    pageSize: 20,
    total: 0
  })

  // 使用useLogs composable
  const { loadOperationLogs, operationLogs, operationPagination, operationLoading, operationError } = useLogs()

  const fetchLogs = async () => {
    try {
      error.value = ''
      
      const query: OperationLogQuery = {
        username: searchForm.username || undefined,
        action: (searchForm.operation as any) || '',
        resource: (searchForm.module as any) || '',
        startDate: searchForm.timeRange || undefined,
        endDate: searchForm.timeRange || undefined
      }
      
      await loadOperationLogs(query)
      
      // 映射后端数据结构到前端期望的结构
      if (operationLogs.value && Array.isArray(operationLogs.value)) {
        logs.value = operationLogs.value.map((log: any) => ({
          id: log.id.toString(),
          username: log.username,
          module: log.module || 'System',
          operation: log.operation,
          method: log.method,
          url: log.url,
          description: log.operation,
          ip_address: log.ip_address,
          status: (log.status >= 200 && log.status < 300) ? 'success' : 'failed',
          execution_time: log.execution_time || 0,
          request_params: log.request_params || '',
          response_data: log.response_data || '',
          error_message: log.error_message || '',
          created_at: log.created_at
        }))
      } else {
        logs.value = []
      }
      pagination.total = operationPagination.total
      pagination.current = operationPagination.page
    } catch (err: any) {
      error.value = err.message || '获取操作日志失败'
      console.error('获取操作日志失败:', err)
    }
  }

  const handleSearch = () => {
    pagination.current = 1
    fetchLogs()
  }

  const handleReset = () => {
    Object.assign(searchForm, {
      username: '',
      module: '',
      operation: '',
      timeRange: ''
    })
    handleSearch()
  }

  const handleRefresh = () => {
    fetchLogs()
  }

  const viewDetails = (record: OperationLog) => {
    selectedLog.value = record
    detailVisible.value = true
  }

  const closeDetails = () => {
    detailVisible.value = false
    selectedLog.value = null
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

  return {
    // 状态
    logs,
    error,
    detailVisible,
    selectedLog,
    searchForm,
    pagination,
    loading: operationLoading,
    
    // 方法
    fetchLogs,
    handleSearch,
    handleReset,
    handleRefresh,
    viewDetails,
    closeDetails,
    prevPage,
    nextPage
  }
}
