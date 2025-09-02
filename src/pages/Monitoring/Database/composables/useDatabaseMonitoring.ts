import { monitoringApi, type DatabaseStats, type TableInfo } from '@/api/monitoring'
import { ref } from 'vue'

export function useDatabaseMonitoring() {
  // 响应式数据
  const loading = ref(false)
  const dbStatus = ref<any>(null)
  const dbStats = ref<DatabaseStats | null>(null)
  const selectedTable = ref<TableInfo | null>(null)
  const showTableDialog = ref(false)

  // 分页状态
  const tablePagination = ref({
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

  // 显示表详情
  const showTableDetails = (table: TableInfo) => {
    selectedTable.value = table
    showTableDialog.value = true
  }

  // 关闭表详情对话框
  const closeTableDialog = () => {
    showTableDialog.value = false
    selectedTable.value = null
  }

  // 分析表
  const analyzeTable = async (tableName: string) => {
    try {
      loading.value = true
      const response = await monitoringApi.analyzeTable(tableName)
      
      if (response.success && response.data) {
        // 显示分析结果
        showAnalysisResult(response.data)
      } else {
        console.error('表分析失败:', response.message)
        alert('表分析失败: ' + (response.message || '未知错误'))
      }
    } catch (error) {
      console.error('表分析失败:', error)
      alert('表分析失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }

  // 显示分析结果
  const showAnalysisResult = (analysisData: any) => {
    const result = [
      `=== 表分析报告: ${analysisData.tableName} ===`,
      `分析时间: ${new Date(analysisData.analyzedAt).toLocaleString('zh-CN')}`,
      `健康度评分: ${analysisData.healthScore}/100`,
      '',
      '=== 基本信息 ===',
      `表所有者: ${analysisData.tableInfo.tableowner || '-'}`,
      `是否有索引: ${analysisData.tableInfo.hasindexes ? '是' : '否'}`,
      `是否有触发器: ${analysisData.tableInfo.hastriggers ? '是' : '否'}`,
      '',
      '=== 大小信息 ===',
      `总大小: ${analysisData.sizeInfo.total_size || '-'}`,
      `表大小: ${analysisData.sizeInfo.table_size || '-'}`,
      `索引大小: ${analysisData.sizeInfo.index_size || '-'}`,
      '',
      '=== 统计信息 ===',
      `活跃元组: ${analysisData.statistics.live_tuples || 0}`,
      `死元组: ${analysisData.statistics.dead_tuples || 0}`,
      `插入次数: ${analysisData.statistics.inserts || 0}`,
      `更新次数: ${analysisData.statistics.updates || 0}`,
      `删除次数: ${analysisData.statistics.deletes || 0}`,
      `最后清理: ${analysisData.statistics.last_vacuum || analysisData.statistics.last_autovacuum || '从未'}`,
      `最后分析: ${analysisData.statistics.last_analyze || analysisData.statistics.last_autoanalyze || '从未'}`,
      '',
      '=== 索引信息 ===',
      ...analysisData.indexes.map((idx: any) => `- ${idx.indexname}: ${idx.indexdef}`),
      '',
      '=== 字段信息 ===',
      ...analysisData.columns.map((col: any) => 
        `- ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`
      ),
      '',
      '=== 优化建议 ===',
      ...analysisData.recommendations.map((rec: string) => `• ${rec}`)
    ].join('\n')
    
    // 创建一个新窗口显示分析结果
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes')
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>表分析报告 - ${analysisData.tableName}</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; line-height: 1.6; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <pre>${result}</pre>
            <br>
            <button onclick="window.print()">打印报告</button>
            <button onclick="window.close()">关闭</button>
          </body>
        </html>
      `)
      newWindow.document.close()
    } else {
      // 如果无法打开新窗口，则使用alert显示
      alert(result)
    }
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

  // 启动定时刷新
  const startAutoRefresh = () => {
    // 设置定时刷新（每60秒）
    refreshTimer = setInterval(() => {
      fetchDatabaseStats()
    }, 60000)
  }

  // 停止定时刷新
  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  // 初始化
  const initialize = () => {
    fetchDatabaseStats()
    startAutoRefresh()
  }

  // 清理
  const cleanup = () => {
    stopAutoRefresh()
  }

  return {
    // 状态
    loading,
    dbStatus,
    dbStats,
    selectedTable,
    showTableDialog,
    tablePagination,
    
    // 方法
    fetchDatabaseStats,
    refreshData,
    showTableDetails,
    closeTableDialog,
    analyzeTable,
    previousPage,
    nextPage,
    initialize,
    cleanup
  }
}
