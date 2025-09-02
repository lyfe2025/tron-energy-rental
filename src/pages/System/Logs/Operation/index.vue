<template>
  <div class="operation-logs p-6">
    <!-- 页面头部 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">操作日志</h1>
      <p class="text-gray-600">查看系统操作记录</p>
    </div>

    <!-- 搜索表单 -->
    <div class="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <!-- 用户名 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
          <input
            v-model="searchForm.username"
            type="text"
            placeholder="请输入用户名"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- 操作模块 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">操作模块</label>
          <select
            v-model="searchForm.module"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部模块</option>
            <option value="user">用户管理</option>
            <option value="role">角色管理</option>
            <option value="menu">菜单管理</option>
            <option value="system">系统设置</option>
            <option value="order">订单管理</option>
            <option value="energy">能量管理</option>
          </select>
        </div>

        <!-- 操作类型 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
          <select
            v-model="searchForm.operation"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部类型</option>
            <option value="create">新增</option>
            <option value="update">修改</option>
            <option value="delete">删除</option>
            <option value="query">查询</option>
          </select>
        </div>

        <!-- 时间范围 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
          <input
            v-model="searchForm.timeRange"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-end gap-2 col-span-full lg:col-span-2">
          <button
            @click="handleSearch"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Search class="w-4 h-4" />
            搜索
          </button>
          <button
            @click="handleReset"
            class="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <RotateCcw class="w-4 h-4" />
            重置
          </button>
          <button
            @click="handleRefresh"
            class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <RefreshCw class="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>
    </div>

    <!-- 操作日志表格 -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- 加载状态 -->
      <div v-if="operationLoading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-500">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>加载操作日志中...</span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
        <div class="text-red-500 mb-2">{{ error }}</div>
        <button
          @click="fetchLogs"
          class="text-blue-600 hover:text-blue-700 underline"
        >
          重试
        </button>
      </div>

      <!-- 表格内容 -->
      <div v-else>
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作人
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                请求信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                时间
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User class="w-5 h-5 text-gray-500" />
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-900">{{ log.username }}</div>
                    <div class="text-sm text-gray-500">{{ log.ip_address }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getOperationColor(log.operation)"
                    >
                      {{ getOperationText(log.operation) }}
                    </span>
                    <span class="text-gray-600">{{ log.module }}</span>
                  </div>
                  <div class="text-sm text-gray-500">{{ log.description }}</div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium">{{ log.method }}</span>
                    <span class="text-gray-500">{{ log.url }}</span>
                  </div>
                  <div class="text-xs text-gray-500">
                    耗时: {{ log.execution_time }}ms
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="log.status === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'"
                >
                  {{ log.status === 'success' ? '成功' : '失败' }}
                </span>
                <div v-if="log.error_message" class="text-xs text-red-600 mt-1">
                  {{ log.error_message }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(log.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="viewDetails(log)"
                  class="text-blue-600 hover:text-blue-900"
                >
                  查看详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页 -->
        <div v-if="logs.length > 0" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              @click="prevPage"
              :disabled="pagination.current <= 1"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              @click="nextPage"
              :disabled="pagination.current >= Math.ceil(pagination.total / pagination.pageSize)"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                显示第 <span class="font-medium">{{ (pagination.current - 1) * pagination.pageSize + 1 }}</span> 到 
                <span class="font-medium">{{ Math.min(pagination.current * pagination.pageSize, pagination.total) }}</span> 条，
                共 <span class="font-medium">{{ pagination.total }}</span> 条记录
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="prevPage"
                  :disabled="pagination.current <= 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft class="h-5 w-5" />
                </button>
                <button
                  @click="nextPage"
                  :disabled="pagination.current >= Math.ceil(pagination.total / pagination.pageSize)"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight class="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-12">
          <div class="text-gray-500 mb-2">暂无操作日志</div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detailVisible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between pb-3 border-b">
          <h3 class="text-lg font-medium text-gray-900">操作日志详情</h3>
          <button
            @click="detailVisible = false"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- 弹窗内容 -->
        <div v-if="selectedLog" class="mt-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 基本信息 -->
            <div class="space-y-3">
              <div class="border-b pb-2">
                <h4 class="text-sm font-medium text-gray-900 mb-2">基本信息</h4>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">操作人:</span>
                <span class="text-sm text-gray-900">{{ selectedLog.username }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">IP地址:</span>
                <span class="text-sm text-gray-900">{{ selectedLog.ip_address }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">操作模块:</span>
                <span class="text-sm text-gray-900">{{ selectedLog.module }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">操作类型:</span>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getOperationColor(selectedLog.operation)"
                >
                  {{ getOperationText(selectedLog.operation) }}
                </span>
              </div>
            </div>

            <!-- 请求信息 -->
            <div class="space-y-3">
              <div class="border-b pb-2">
                <h4 class="text-sm font-medium text-gray-900 mb-2">请求信息</h4>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">请求方法:</span>
                <span class="text-sm text-gray-900 font-mono">{{ selectedLog.method }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">请求URL:</span>
                <span class="text-sm text-gray-900 font-mono break-all">{{ selectedLog.url }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">执行时间:</span>
                <span class="text-sm text-gray-900">{{ selectedLog.execution_time }}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-500">状态:</span>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="selectedLog.status === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'"
                >
                  {{ selectedLog.status === 'success' ? '成功' : '失败' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作时间 -->
          <div class="mt-4 pt-4 border-t">
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">操作时间:</span>
              <span class="text-sm text-gray-900">{{ formatDate(selectedLog.created_at) }}</span>
            </div>
          </div>

          <!-- 请求参数 -->
          <div class="mt-4 pt-4 border-t">
            <h4 class="text-sm font-medium text-gray-900 mb-2">请求参数</h4>
            <div class="bg-gray-50 rounded-md p-3">
              <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ selectedLog.request_params || '无' }}</pre>
            </div>
          </div>

          <!-- 响应数据 -->
          <div class="mt-4 pt-4 border-t">
            <h4 class="text-sm font-medium text-gray-900 mb-2">响应数据</h4>
            <div class="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
              <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ selectedLog.response_data || '无' }}</pre>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="selectedLog.error_message" class="mt-4 pt-4 border-t">
            <h4 class="text-sm font-medium text-gray-900 mb-2">错误信息</h4>
            <div class="bg-red-50 border border-red-200 rounded-md p-3">
              <pre class="text-xs text-red-700 whitespace-pre-wrap">{{ selectedLog.error_message }}</pre>
            </div>
          </div>
        </div>

        <!-- 弹窗底部 -->
        <div class="flex justify-end pt-4 border-t mt-4">
          <button
            @click="detailVisible = false"
            class="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Search, User, X } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { useLogs } from '../composables/useLogs'
import type { OperationLogQuery } from '../types'

interface OperationLog {
  id: string
  username: string
  module: string
  operation: string
  method: string
  url: string
  description: string
  ip_address: string
  status: 'success' | 'failed'
  execution_time: number
  request_params?: any
  response_data?: any
  error_message?: string
  created_at: string
}

const logs = ref<OperationLog[]>([])
const detailVisible = ref(false)
const selectedLog = ref<OperationLog | null>(null)
const error = ref('')

const searchForm = reactive({
  username: '',
  module: '',
  operation: '',
  timeRange: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 获取操作类型颜色
const getOperationColor = (operation: string) => {
  const colorMap: Record<string, string> = {
    'create': 'bg-green-100 text-green-800',
    'update': 'bg-blue-100 text-blue-800',
    'delete': 'bg-red-100 text-red-800',
    'query': 'bg-gray-100 text-gray-800'
  }
  return colorMap[operation] || 'bg-gray-100 text-gray-800'
}

// 获取操作类型文本
const getOperationText = (operation: string) => {
  const textMap: Record<string, string> = {
    'create': '新增',
    'update': '修改',
    'delete': '删除',
    'query': '查询'
  }
  return textMap[operation] || operation
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
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

// 使用useLogs composable
const { loadOperationLogs, operationLogs, operationPagination, operationLoading, operationError } = useLogs()

const fetchLogs = async () => {
  try {
    error.value = ''
    
    const query: OperationLogQuery = {
      username: searchForm.username || undefined,
      action: (searchForm.operation as any) || undefined,
      resource: (searchForm.module as any) || undefined,
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

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.operation-logs {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #666;
}

.search-form {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>