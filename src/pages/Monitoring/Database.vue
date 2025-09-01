<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">数据库监控</h1>
      <div class="flex items-center space-x-3">
        <button
          @click="refreshData"
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
      </div>
    </div>

    <!-- 数据库连接状态 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <Database class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <h2 class="text-lg font-semibold text-gray-900">数据库连接状态</h2>
            <p class="text-sm text-gray-600">PostgreSQL 数据库连接信息</p>
          </div>
        </div>
        <div class="flex items-center">
          <div 
            class="h-3 w-3 rounded-full mr-2"
            :class="dbStatus?.connected ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          <span 
            class="text-sm font-medium"
            :class="dbStatus?.connected ? 'text-green-600' : 'text-red-600'"
          >
            {{ dbStatus?.connected ? '已连接' : '连接失败' }}
          </span>
        </div>
      </div>
      
      <div v-if="dbStatus" class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label class="text-sm font-medium text-gray-600">数据库版本</label>
          <p class="text-lg font-semibold text-gray-900">{{ dbStatus.version }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600">活跃连接数</label>
          <p class="text-lg font-semibold text-gray-900">{{ dbStatus.activeConnections }}</p>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600">最大连接数</label>
          <p class="text-lg font-semibold text-gray-900">{{ dbStatus.maxConnections }}</p>
        </div>
      </div>
    </div>

    <!-- 数据库统计信息 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <Table class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">数据表数量</p>
            <p class="text-2xl font-bold text-gray-900">{{ dbStats?.tableCount || 0 }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <Users class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">用户总数</p>
            <p class="text-2xl font-bold text-gray-900">{{ dbStats?.userCount || 0 }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 rounded-lg">
            <ShoppingCart class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">订单总数</p>
            <p class="text-2xl font-bold text-gray-900">{{ dbStats?.orderCount || 0 }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-orange-100 rounded-lg">
            <HardDrive class="h-6 w-6 text-orange-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">数据库大小</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatSize(typeof dbStats?.databaseSize === 'number' ? dbStats.databaseSize : 0) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 表统计信息 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">数据表统计</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                表名
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                记录数
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                表大小
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                索引大小
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后更新
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                <div class="flex items-center justify-center">
                  <RefreshCw class="h-5 w-5 animate-spin mr-2" />
                  加载中...
                </div>
              </td>
            </tr>
            <tr v-else-if="!dbStats?.tables || dbStats.tables.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                暂无数据表信息
              </td>
            </tr>
            <tr v-else v-for="table in dbStats.tables" :key="table.tableName" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <Table class="h-4 w-4 text-gray-400 mr-2" />
                  <span class="text-sm font-medium text-gray-900">{{ table.tableName }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatNumber(table.rowCount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatSize(table.tableSize) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatSize(typeof table.indexSize === 'string' ? 0 : (table.indexSize || 0)) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ table.lastUpdated ? formatDateTime(table.lastUpdated) : '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="showTableDetails(table as TableInfo)"
                  class="text-indigo-600 hover:text-indigo-900 mr-3"
                  title="查看详情"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  @click="analyzeTable(table.tableName)"
                  class="text-green-600 hover:text-green-900"
                  title="分析表"
                >
                  <BarChart3 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页控件 -->
      <div v-if="dbStats?.tables && dbStats.tables.length > 0 && tablePagination.total > tablePagination.pageSize" 
           class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="previousPage"
            :disabled="tablePagination.current <= 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <button
            @click="nextPage"
            :disabled="tablePagination.current >= Math.ceil(tablePagination.total / tablePagination.pageSize)"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              显示第 <span class="font-medium">{{ (tablePagination.current - 1) * tablePagination.pageSize + 1 }}</span> 到 
              <span class="font-medium">{{ Math.min(tablePagination.current * tablePagination.pageSize, tablePagination.total) }}</span> 条，
              共 <span class="font-medium">{{ tablePagination.total }}</span> 条记录
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="previousPage"
                :disabled="tablePagination.current <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft class="h-5 w-5" />
              </button>
              <button
                @click="nextPage"
                :disabled="tablePagination.current >= Math.ceil(tablePagination.total / tablePagination.pageSize)"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight class="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- 慢查询日志 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">慢查询日志</h2>
      </div>
      
      <div class="p-6">
        <div v-if="!dbStats?.slowQueries || (Array.isArray(dbStats.slowQueries) && dbStats.slowQueries.length === 0) || (typeof dbStats.slowQueries === 'number')" class="text-center py-8 text-gray-500">
          暂无慢查询记录
        </div>
        
        <div v-else-if="Array.isArray(dbStats.slowQueries)" class="space-y-4">
          <div 
            v-for="query in dbStats.slowQueries" 
            :key="query.id" 
            class="border rounded-lg p-4 hover:bg-gray-50"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <Clock class="h-4 w-4 text-gray-400" />
                <span class="text-sm text-gray-600">{{ formatDateTime(query.timestamp) }}</span>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600">执行时间: {{ query.duration }}ms</span>
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="query.duration > 5000 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'"
                >
                  {{ query.duration > 5000 ? '严重' : '警告' }}
                </span>
              </div>
            </div>
            
            <div class="mt-2">
              <p class="text-sm font-medium text-gray-700 mb-1">SQL语句:</p>
              <pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{{ query.query || '' }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 表详情对话框 -->
    <div v-if="showTableDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">表详情 - {{ selectedTable?.tableName }}</h3>
            <button @click="closeTableDialog" class="text-gray-400 hover:text-gray-600">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="mt-4" v-if="selectedTable">
            <div class="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label class="text-sm font-medium text-gray-600">记录数</label>
                <p class="text-lg font-semibold text-gray-900">{{ formatNumber(selectedTable.rowCount) }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">表大小</label>
                <p class="text-lg font-semibold text-gray-900">{{ formatSize(selectedTable.tableSize) }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">索引大小</label>
                <p class="text-lg font-semibold text-gray-900">{{ formatSize(typeof selectedTable.indexSize === 'string' ? parseInt(selectedTable.indexSize) || 0 : selectedTable.indexSize || 0) }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">最后更新</label>
                <p class="text-lg font-semibold text-gray-900">
                  {{ selectedTable.lastUpdated ? formatDateTime(selectedTable.lastUpdated) : '-' }}
                </p>
              </div>
            </div>
            
            <div v-if="selectedTable.columns" class="mt-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">字段信息</h4>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">字段名</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">可空</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">默认值</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="column in selectedTable.columns" :key="column.name">
                      <td class="px-4 py-2 text-sm font-medium text-gray-900">{{ column.name }}</td>
                      <td class="px-4 py-2 text-sm text-gray-900">{{ column.type }}</td>
                      <td class="px-4 py-2 text-sm text-gray-900">{{ column.nullable ? '是' : '否' }}</td>
                      <td class="px-4 py-2 text-sm text-gray-900">{{ column.default || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { monitoringApi, type DatabaseStats, type TableInfo } from '@/api/monitoring'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Eye,
  HardDrive,
  RefreshCw,
  ShoppingCart,
  Table,
  Users,
  X
} from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

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
  } catch (error) {
    console.error('获取数据库统计失败:', error)
    // 错误时设置默认数据
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
  } finally {
    loading.value = false
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

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化数字
const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
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
onMounted(() => {
  fetchDatabaseStats()
  
  // 设置定时刷新（每60秒）
  refreshTimer = setInterval(() => {
    fetchDatabaseStats()
  }, 60000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>