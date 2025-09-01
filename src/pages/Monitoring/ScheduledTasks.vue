<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">定时任务管理</h1>
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

    <!-- 统计信息 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 rounded-lg">
            <Clock class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总任务数</p>
            <p class="text-2xl font-bold text-gray-900">{{ tasks.length }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-lg">
            <Play class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">运行中</p>
            <p class="text-2xl font-bold text-gray-900">{{ runningCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-yellow-100 rounded-lg">
            <Pause class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">已暂停</p>
            <p class="text-2xl font-bold text-gray-900">{{ pausedCount }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center">
          <div class="p-3 bg-red-100 rounded-lg">
            <AlertCircle class="h-6 w-6 text-red-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">异常任务</p>
            <p class="text-2xl font-bold text-gray-900">{{ errorCount }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 定时任务列表 -->
    <div class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">任务列表</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                任务信息
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cron表达式
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                下次执行
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后执行
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
            <tr v-else-if="tasks.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                暂无定时任务
              </td>
            </tr>
            <tr v-else v-for="task in tasks" :key="task.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ task.name }}</div>
                  <div class="text-sm text-gray-500">{{ task.description }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="getStatusBadgeClass(task.status)"
                >
                  {{ getStatusDisplayName(task.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                {{ task.cronExpression }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ task.nextRun ? formatDateTime(task.nextRun) : '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ task.lastRun ? formatDateTime(task.lastRun) : '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex items-center space-x-2">
                  <button
                    v-if="task.status === 'running'"
                    @click="pauseTask(task.id)"
                    class="text-yellow-600 hover:text-yellow-900"
                    title="暂停任务"
                  >
                    <Pause class="h-4 w-4" />
                  </button>
                  <button
                    v-else-if="task.status === 'paused'"
                    @click="resumeTask(task.id)"
                    class="text-green-600 hover:text-green-900"
                    title="恢复任务"
                  >
                    <Play class="h-4 w-4" />
                  </button>
                  <button
                    @click="executeTask(task.id)"
                    class="text-blue-600 hover:text-blue-900"
                    title="立即执行"
                  >
                    <PlayCircle class="h-4 w-4" />
                  </button>
                  <button
                    @click="viewTaskLogs(task.id)"
                    class="text-indigo-600 hover:text-indigo-900"
                    title="查看日志"
                  >
                    <FileText class="h-4 w-4" />
                  </button>
                  <button
                    @click="showTaskDetails(task)"
                    class="text-gray-600 hover:text-gray-900"
                    title="查看详情"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 执行日志 -->
    <div v-if="showLogs" class="bg-white rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">执行日志</h2>
        <button
          @click="closeLogs"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <div class="p-6">
        <div v-if="logsLoading" class="text-center py-8">
          <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
          <p class="text-gray-500">加载日志中...</p>
        </div>
        
        <div v-else-if="logs.length === 0" class="text-center py-8 text-gray-500">
          暂无执行日志
        </div>
        
        <div v-else class="space-y-4">
          <div 
            v-for="log in logs" 
            :key="log.id" 
            class="border rounded-lg p-4"
            :class="{
              'border-green-200 bg-green-50': log.status === 'success',
              'border-red-200 bg-red-50': log.status === 'error',
              'border-yellow-200 bg-yellow-50': log.status === 'running'
            }"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="getLogStatusBadgeClass(log.status)"
                >
                  {{ getLogStatusDisplayName(log.status) }}
                </span>
                <span class="text-sm text-gray-600">{{ formatDateTime(log.startTime) }}</span>
              </div>
              <div class="text-sm text-gray-500">
                耗时: {{ log.duration || 0 }}ms
              </div>
            </div>
            
            <div v-if="log.output" class="mt-2">
              <p class="text-sm font-medium text-gray-700 mb-1">输出:</p>
              <pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{{ log.output }}</pre>
            </div>
            
            <div v-if="log.error" class="mt-2">
              <p class="text-sm font-medium text-red-700 mb-1">错误:</p>
              <pre class="text-xs bg-red-100 p-2 rounded overflow-x-auto text-red-800">{{ log.error }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务详情对话框 -->
    <div v-if="showDetailsDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">任务详情</h3>
            <button @click="closeDetailsDialog" class="text-gray-400 hover:text-gray-600">
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="mt-4 space-y-3" v-if="selectedTask">
            <div>
              <label class="text-sm font-medium text-gray-600">任务名称</label>
              <p class="text-sm text-gray-900">{{ selectedTask.name }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">描述</label>
              <p class="text-sm text-gray-900">{{ selectedTask.description }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">状态</label>
              <p class="text-sm text-gray-900">{{ getStatusDisplayName(selectedTask.status) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">Cron表达式</label>
              <p class="text-sm text-gray-900 font-mono">{{ selectedTask.cronExpression }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">创建时间</label>
              <p class="text-sm text-gray-900">{{ formatDateTime(selectedTask.createdAt) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">更新时间</label>
              <p class="text-sm text-gray-900">{{ formatDateTime(selectedTask.updatedAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { monitoringApi, type ScheduledTask, type TaskExecutionLog } from '@/api/monitoring'
import {
  AlertCircle,
  Clock,
  Eye,
  FileText,
  Pause,
  Play,
  PlayCircle,
  RefreshCw,
  X
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'

// 响应式数据
const loading = ref(false)
const logsLoading = ref(false)
const tasks = ref<ScheduledTask[]>([])
const logs = ref<TaskExecutionLog[]>([])
const selectedTask = ref<ScheduledTask | null>(null)
const showLogs = ref(false)
const showDetailsDialog = ref(false)
const currentTaskId = ref<number | null>(null)

// 定时器
let refreshTimer: NodeJS.Timeout | null = null

// 计算属性
const runningCount = computed(() => {
  if (!Array.isArray(tasks.value)) return 0
  return tasks.value.filter(task => task.status === 'running').length
})

const pausedCount = computed(() => {
  if (!Array.isArray(tasks.value)) return 0
  return tasks.value.filter(task => task.status === 'paused').length
})

const errorCount = computed(() => {
  if (!Array.isArray(tasks.value)) return 0
  return tasks.value.filter(task => task.status === 'error').length
})

// 获取定时任务数据
const fetchTasks = async () => {
  try {
    loading.value = true
    const response = await monitoringApi.getScheduledTasks()
    
    if (response.success && response.data) {
      // 确保数据是数组类型
      if (Array.isArray(response.data)) {
        tasks.value = response.data
      } else {
        console.warn('定时任务数据不是数组格式:', response.data)
        tasks.value = []
      }
    } else {
      tasks.value = []
    }
  } catch (error) {
    console.error('获取定时任务失败:', error)
    tasks.value = []
  } finally {
    loading.value = false
  }
}

// 获取任务执行日志
const fetchTaskLogs = async (taskId: number) => {
  try {
    logsLoading.value = true
    const response = await monitoringApi.getTaskExecutionLogs(taskId.toString())
    
    if (response.success && response.data) {
      logs.value = response.data
    }
  } catch (error) {
    console.error('获取任务日志失败:', error)
  } finally {
    logsLoading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  fetchTasks()
  if (showLogs.value && currentTaskId.value) {
    fetchTaskLogs(currentTaskId.value)
  }
}

// 暂停任务
const pauseTask = async (taskId: string) => {
  try {
    // 这里应该调用暂停任务的API
    console.log('暂停任务:', taskId)
    // 刷新任务列表
    fetchTasks()
  } catch (error) {
    console.error('暂停任务失败:', error)
  }
}

// 恢复任务
const resumeTask = async (taskId: string) => {
  try {
    // 这里应该调用恢复任务的API
    console.log('恢复任务:', taskId)
    // 刷新任务列表
    fetchTasks()
  } catch (error) {
    console.error('恢复任务失败:', error)
  }
}

// 立即执行任务
const executeTask = async (taskId: string) => {
  try {
    // 这里应该调用立即执行任务的API
    console.log('立即执行任务:', taskId)
    // 刷新任务列表
    fetchTasks()
  } catch (error) {
    console.error('执行任务失败:', error)
  }
}

// 查看任务日志
const viewTaskLogs = (taskId: string) => {
  currentTaskId.value = parseInt(taskId)
  showLogs.value = true
  fetchTaskLogs(parseInt(taskId))
}

// 关闭日志
const closeLogs = () => {
  showLogs.value = false
  currentTaskId.value = null
  logs.value = []
}

// 显示任务详情
const showTaskDetails = (task: ScheduledTask) => {
  selectedTask.value = task
  showDetailsDialog.value = true
}

// 关闭任务详情对话框
const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  selectedTask.value = null
}

// 获取状态显示名称
const getStatusDisplayName = (status: string): string => {
  const statusMap: Record<string, string> = {
    'running': '运行中',
    'paused': '已暂停',
    'error': '异常',
    'stopped': '已停止'
  }
  return statusMap[status] || status
}

// 获取状态徽章样式
const getStatusBadgeClass = (status: string): string => {
  const classMap: Record<string, string> = {
    'running': 'bg-green-100 text-green-800',
    'paused': 'bg-yellow-100 text-yellow-800',
    'error': 'bg-red-100 text-red-800',
    'stopped': 'bg-gray-100 text-gray-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

// 获取日志状态显示名称
const getLogStatusDisplayName = (status: string): string => {
  const statusMap: Record<string, string> = {
    'success': '成功',
    'error': '失败',
    'running': '运行中'
  }
  return statusMap[status] || status
}

// 获取日志状态徽章样式
const getLogStatusBadgeClass = (status: string): string => {
  const classMap: Record<string, string> = {
    'success': 'bg-green-100 text-green-800',
    'error': 'bg-red-100 text-red-800',
    'running': 'bg-yellow-100 text-yellow-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
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

// 生命周期
onMounted(() => {
  fetchTasks()
  
  // 设置定时刷新（每30秒）
  refreshTimer = setInterval(() => {
    fetchTasks()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>