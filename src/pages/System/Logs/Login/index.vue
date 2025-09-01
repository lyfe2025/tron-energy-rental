<template>
  <div class="p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">登录日志</h1>
      <p class="text-gray-600 mt-1">查看用户登录记录和安全日志</p>
    </div>

    <!-- 搜索和筛选 -->
    <div class="mb-6 bg-white p-4 rounded-lg border border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- 用户名搜索 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="searchForm.username"
              type="text"
              placeholder="搜索用户名"
              class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <!-- 登录状态 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">登录状态</label>
          <select
            v-model="searchForm.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
        </div>

        <!-- IP地址搜索 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">IP地址</label>
          <input
            v-model="searchForm.ip_address"
            type="text"
            placeholder="搜索IP地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- 时间范围 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
          <select
            v-model="searchForm.timeRange"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
          </select>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-3 mt-4">
        <button
          @click="handleSearch"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          :disabled="loading"
        >
          <Search class="w-4 h-4" />
          <span>搜索</span>
        </button>
        <button
          @click="handleReset"
          class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RotateCcw class="w-4 h-4" />
          <span>重置</span>
        </button>
        <button
          @click="fetchLogs"
          class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw class="w-4 h-4" />
          <span>刷新</span>
        </button>
      </div>
    </div>

    <!-- 登录日志表格 -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-500">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>加载登录日志中...</span>
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
                用户信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登录信息
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
                    <div class="text-sm text-gray-500">ID: {{ log.user_id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">
                  <div class="flex items-center gap-2 mb-1">
                    <Globe class="w-4 h-4 text-gray-400" />
                    <span>{{ log.ip_address }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-gray-500">
                    <Monitor class="w-4 h-4 text-gray-400" />
                    <span class="truncate max-w-xs" :title="log.user_agent">{{ log.user_agent }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="log.status === 1 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'"
                >
                  {{ log.status === 1 ? '成功' : '失败' }}
                </span>
                <div v-if="log.failure_reason" class="text-xs text-red-600 mt-1">
                  {{ log.failure_reason }}
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
          <div class="text-gray-500 mb-2">暂无登录日志</div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detailVisible" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- 背景遮罩 -->
        <div 
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          @click="detailVisible = false"
        ></div>

        <!-- 弹窗内容 -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <!-- 弹窗头部 -->
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                登录日志详情
              </h3>
              <button
                @click="detailVisible = false"
                class="text-gray-400 hover:text-gray-600"
              >
                <X class="w-6 h-6" />
              </button>
            </div>

            <!-- 详情内容 -->
            <div v-if="currentLog" class="space-y-4">
              <div class="grid grid-cols-1 gap-4">
                <!-- 用户信息 -->
                <div class="border-b border-gray-200 pb-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">用户信息</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-500">用户名:</span>
                      <span class="text-sm text-gray-900">{{ currentLog.username }}</span>
                    </div>
                    <div v-if="currentLog.user_id" class="flex justify-between">
                      <span class="text-sm text-gray-500">用户ID:</span>
                      <span class="text-sm text-gray-900">{{ currentLog.user_id }}</span>
                    </div>
                  </div>
                </div>

                <!-- 登录信息 -->
                <div class="border-b border-gray-200 pb-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">登录信息</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-500">IP地址:</span>
                      <span class="text-sm text-gray-900">{{ currentLog.ip_address }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-500">登录状态:</span>
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="currentLog.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'"
                      >
                        {{ currentLog.status === 1 ? '成功' : '失败' }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-500">登录时间:</span>
                      <span class="text-sm text-gray-900">{{ currentLog.login_time }}</span>
                    </div>
                    <div v-if="currentLog.logout_time" class="flex justify-between">
                      <span class="text-sm text-gray-500">退出时间:</span>
                      <span class="text-sm text-gray-900">{{ currentLog.logout_time }}</span>
                    </div>
                    <div v-if="currentLog.session_duration" class="flex justify-between">
                      <span class="text-sm text-gray-500">会话时长:</span>
                      <span class="text-sm text-gray-900">{{ formatDuration(currentLog.session_duration) }}</span>
                    </div>
                  </div>
                </div>

                <!-- 设备信息 -->
                <div class="border-b border-gray-200 pb-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">设备信息</h4>
                  <div class="space-y-2">
                    <div>
                      <span class="text-sm text-gray-500">用户代理:</span>
                      <p class="text-sm text-gray-900 mt-1 break-all">{{ currentLog.user_agent }}</p>
                    </div>
                    <div v-if="currentLog.device_type" class="flex justify-between">
                      <span class="text-sm text-gray-500">设备类型:</span>
                      <span class="text-sm text-gray-900">{{ currentLog.device_type }}</span>
                    </div>
                    <div v-if="currentLog.location" class="flex justify-between">
                      <span class="text-sm text-gray-500">地理位置:</span>
                      <span class="text-sm text-gray-900">{{ currentLog.location }}</span>
                    </div>
                  </div>
                </div>

                <!-- 失败信息 -->
                <div v-if="currentLog.failure_reason" class="pb-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">失败信息</h4>
                  <div class="bg-red-50 border border-red-200 rounded-md p-3">
                    <p class="text-sm text-red-800">{{ currentLog.failure_reason }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 弹窗底部 -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="detailVisible = false"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, Globe, Monitor, RefreshCw, RotateCcw, Search, User, X } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'

interface LoginLog {
  id: string
  username: string
  user_id?: string
  ip_address: string
  user_agent: string
  status: number // 1表示成功，0表示失败
  login_time: string
  logout_time?: string
  session_duration?: number
  location?: string
  device_type?: string
  failure_reason?: string
  created_at: string
}

const loading = ref(false)
const error = ref('')
const logs = ref<LoginLog[]>([])
const detailVisible = ref(false)
const currentLog = ref<LoginLog | null>(null)

const searchForm = reactive({
  username: '',
  status: '',
  ip_address: '',
  timeRange: ''
})

const pagination = reactive({
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

const viewDetails = (record: LoginLog) => {
  currentLog.value = record
  detailVisible.value = true
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

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.login-logs {
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