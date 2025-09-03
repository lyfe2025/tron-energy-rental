import { monitoringApi } from '@/api/monitoring'
import { ref } from 'vue'
import type { DatabaseStats, DatabaseStatus, TablePagination } from '../types/database.types'

export function useDatabaseMonitoring() {
  // 响应式数据
  const loading = ref(false)
  const dbStatus = ref<DatabaseStatus | null>(null)
  const dbStats = ref<DatabaseStats | null>(null)

  // 分页状态
  const tablePagination = ref<TablePagination>({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 定时器
  let refreshTimer: NodeJS.Timeout | null = null

  // 获取数据库监控数据
  const fetchDatabaseStats = async () => {
    try {
      loading.value = true
      const response = await monitoringApi.getDatabaseStats(tablePagination.value.current, tablePagination.value.pageSize)
      
      if (response.success && response.data) {
        // 确保数据结构完整
        const data = response.data
        dbStats.value = {
          ...data,
          // 新的字段结构
          totalTables: data.totalTables || data.tableCount || 0,
          totalRecords: data.totalRecords || data.userCount || 0,
          connectionCount: data.connectionCount || 0,
          databaseSize: data.databaseSize || 0,
          tableStats: Array.isArray(data.tableStats) ? data.tableStats : (Array.isArray(data.tables) ? data.tables : []),
          slowQueries: Array.isArray(data.slowQueries) ? data.slowQueries : 
                      typeof data.slowQueries === 'number' ? data.slowQueries : [],
          // 保持向后兼容
          tables: Array.isArray(data.tables) ? data.tables : 
                  Array.isArray(data.tableStats) ? data.tableStats : [],
          tableCount: data.tableCount || data.totalTables || 0,
          userCount: data.userCount || 0,
          orderCount: data.orderCount || 0
        }
        
        dbStatus.value = {
          connected: true,
          version: data.version || 'PostgreSQL 14.x',
          activeConnections: data.activeConnections || data.connectionCount || 5,
          maxConnections: data.maxConnections || 100
        }
        
        // 更新分页信息
        if (response.data.pagination) {
          tablePagination.value = {
            current: response.data.pagination.page,
            pageSize: response.data.pagination.limit,
            total: response.data.pagination.total
          }
        }
      } else {
        // 初始化默认数据
        initializeDefaultData()
      }
    } catch (error) {
      console.error('获取数据库统计失败:', error)
      // 错误时设置默认数据
      initializeDefaultData()
    } finally {
      loading.value = false
    }
  }

  // 初始化默认数据
  const initializeDefaultData = () => {
    dbStats.value = {
      totalTables: 0,
      totalRecords: 0,
      connectionCount: 0,
      databaseSize: 0,
      tableStats: [],
      slowQueries: [],
      // 保持向后兼容
      tableCount: 0,
      userCount: 0,
      orderCount: 0,
      tables: []
    }
    dbStatus.value = {
      connected: false,
      version: '-',
      activeConnections: 0,
      maxConnections: 0
    }
  }

  // 刷新数据
  const refreshData = () => {
    fetchDatabaseStats()
  }

  // 分页方法
  const previousPage = () => {
    if (tablePagination.value.current > 1) {
      tablePagination.value.current--
      fetchDatabaseStats()
    }
  }

  const nextPage = () => {
    const totalPages = Math.ceil(tablePagination.value.total / tablePagination.value.pageSize)
    if (tablePagination.value.current < totalPages) {
      tablePagination.value.current++
      fetchDatabaseStats()
    }
  }

  // 生命周期
  const startMonitoring = () => {
    fetchDatabaseStats()
    
    // 设置定时刷新（每60秒）
    refreshTimer = setInterval(() => {
      fetchDatabaseStats()
    }, 60000)
  }

  const stopMonitoring = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  return {
    // 状态
    loading,
    dbStatus,
    dbStats,
    tablePagination,
    
    // 方法
    fetchDatabaseStats,
    refreshData,
    previousPage,
    nextPage,
    startMonitoring,
    stopMonitoring
  }
}