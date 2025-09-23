/**
 * 定时任务管理的组合式函数
 */
import { monitoringApi, type ScheduledTask, type TaskExecutionLog } from '@/api/monitoring'
import { useToast } from '@/composables/useToast'
import { computed, onMounted, onUnmounted, ref } from 'vue'

export interface TaskForm {
  name: string
  description: string
  cronExpression: string
  command: string
  isActive?: boolean
  timeout?: number
  maxRetries?: number
}

export function useScheduledTasks() {
  // Toast 通知
  const { error } = useToast()

  // 响应式数据
  const loading = ref(false)
  const logsLoading = ref(false)
  const createLoading = ref(false)
  const deleteLoading = ref(false)
  const tasks = ref<ScheduledTask[]>([])
  const logs = ref<TaskExecutionLog[]>([])
  const selectedTask = ref<ScheduledTask | null>(null)
  const showLogs = ref(false)
  const showDetailsDialog = ref(false)
  const showCreateDialog = ref(false)
  const showDeleteDialog = ref(false)
  const currentTaskId = ref<string | null>(null)
  const taskToDelete = ref<ScheduledTask | null>(null)

  // 定时器
  let refreshTimer: NodeJS.Timeout | null = null

  // 计算属性
  const taskStats = computed(() => ({
    total: tasks.value.length,
    running: tasks.value.filter(task => task.status === 'active').length,
    paused: tasks.value.filter(task => task.status === 'inactive').length,
    error: tasks.value.filter(task => task.status === 'error').length
  }))

  // 获取定时任务数据
  const fetchTasks = async () => {
    try {
      loading.value = true
      const response = await monitoringApi.getScheduledTasks()
      
      if (response.success && response.data) {
        if (response.data.tasks && Array.isArray(response.data.tasks)) {
          // 转换后端字段为前端期望格式
          tasks.value = response.data.tasks.map(task => ({
            ...task,
            cronExpression: task.cron_expression,
            status: task.is_active ? 'active' : 'inactive',
            nextRun: task.next_run,
            lastRun: task.last_run,
            createdAt: task.created_at,
            updatedAt: task.updated_at
          }))
        } else if (Array.isArray(response.data)) {
          // 向后兼容：如果直接返回数组
          tasks.value = response.data.map(task => ({
            ...task,
            cronExpression: task.cron_expression,
            status: task.is_active ? 'active' : 'inactive',
            nextRun: task.next_run,
            lastRun: task.last_run,
            createdAt: task.created_at,
            updatedAt: task.updated_at
          }))
        } else {
          console.warn('定时任务数据格式不正确:', response.data)
          tasks.value = []
        }
      } else {
        tasks.value = []
      }
    } catch (err) {
      console.error('获取定时任务失败:', err)
      error('获取定时任务失败')
      tasks.value = []
    } finally {
      loading.value = false
    }
  }

  // 获取任务执行日志
  const fetchTaskLogs = async (taskId: string) => {
    try {
      logsLoading.value = true
      const response = await monitoringApi.getTaskExecutionLogs(taskId)
      
      if (response.success && response.data) {
        if (response.data.logs && Array.isArray(response.data.logs)) {
          logs.value = response.data.logs.map(log => ({
            ...log,
            taskId: log.task_id,
            taskName: log.task_name,
            startTime: log.started_at,
            endTime: log.finished_at,
            error: log.error || log.error_message,
            duration: log.duration || 0
          }))
        } else if (Array.isArray(response.data)) {
          logs.value = response.data.map(log => ({
            ...log,
            taskId: log.task_id,
            taskName: log.task_name,
            startTime: log.started_at,
            endTime: log.finished_at,
            error: log.error || log.error_message,
            duration: log.duration || 0
          }))
        } else {
          console.warn('任务日志数据格式不正确:', response.data)
          logs.value = []
        }
      }
    } catch (err) {
      console.error('获取任务日志失败:', err)
      error('获取任务日志失败')
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
      const response = await monitoringApi.pauseTask(taskId)
      if (response.success) {
        await fetchTasks() // 刷新任务列表
      } else {
        throw new Error(response.message || '暂停任务失败')
      }
    } catch (err) {
      console.error('暂停任务失败:', err)
      throw err
    }
  }

  // 恢复任务
  const resumeTask = async (taskId: string) => {
    try {
      const response = await monitoringApi.resumeTask(taskId)
      if (response.success) {
        await fetchTasks() // 刷新任务列表
      } else {
        throw new Error(response.message || '恢复任务失败')
      }
    } catch (err) {
      console.error('恢复任务失败:', err)
      throw err
    }
  }

  // 立即执行任务
  const executeTask = async (taskId: string) => {
    try {
      const response = await monitoringApi.executeTask(taskId)
      if (response.success) {
        await fetchTasks() // 刷新任务列表
      } else {
        throw new Error(response.message || '执行任务失败')
      }
    } catch (err) {
      console.error('执行任务失败:', err)
      throw err
    }
  }

  // 查看任务日志
  const viewTaskLogs = async (taskId: string) => {
    currentTaskId.value = taskId
    showLogs.value = true
    await fetchTaskLogs(taskId)
  }

  // 关闭日志
  const closeLogs = () => {
    showLogs.value = false
    currentTaskId.value = null
    logs.value = []
  }

  // 查看任务详情
  const showTaskDetails = (task: ScheduledTask) => {
    selectedTask.value = task
    showDetailsDialog.value = true
  }

  // 关闭任务详情对话框
  const closeDetailsDialog = () => {
    showDetailsDialog.value = false
    selectedTask.value = null
  }

  // 显示新增任务对话框
  const showCreateTaskDialog = () => {
    showCreateDialog.value = true
  }

  // 关闭新增任务对话框
  const closeCreateDialog = () => {
    showCreateDialog.value = false
  }

  // 创建任务
  const createTask = async (form: TaskForm) => {
    try {
      createLoading.value = true
      const response = await monitoringApi.createTask({
        name: form.name,
        description: form.description,
        cron_expression: form.cronExpression,
        command: form.command
      })
      
      if (response.success) {
        await fetchTasks() // 重新获取任务列表
        closeCreateDialog()
        return response
      } else {
        throw new Error(response.message || '创建任务失败')
      }
    } catch (err) {
      console.error('创建任务失败:', err)
      throw err
    } finally {
      createLoading.value = false
    }
  }

  // 显示删除确认对话框
  const showDeleteTaskDialog = (task: ScheduledTask) => {
    taskToDelete.value = task
    showDeleteDialog.value = true
  }

  // 关闭删除确认对话框
  const closeDeleteDialog = () => {
    showDeleteDialog.value = false
    taskToDelete.value = null
  }

  // 确认删除任务
  const confirmDeleteTask = async () => {
    if (!taskToDelete.value) return

    try {
      deleteLoading.value = true
      const response = await monitoringApi.deleteTask(taskToDelete.value.id)
      
      if (response.success) {
        await fetchTasks() // 重新获取任务列表
        closeDeleteDialog()
      } else {
        throw new Error(response.message || '删除任务失败')
      }
    } catch (err) {
      console.error('删除任务失败:', err)
      throw err
    } finally {
      deleteLoading.value = false
    }
  }

  // 启动定时刷新
  const startAutoRefresh = (interval: number = 30000) => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
    refreshTimer = setInterval(refreshData, interval)
  }

  // 停止定时刷新
  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  // 组件挂载时初始化
  onMounted(() => {
    fetchTasks()
    startAutoRefresh()
  })

  // 组件卸载时清理
  onUnmounted(() => {
    stopAutoRefresh()
  })

  return {
    // 状态
    loading,
    logsLoading,
    createLoading,
    deleteLoading,
    tasks,
    logs,
    selectedTask,
    showLogs,
    showDetailsDialog,
    showCreateDialog,
    showDeleteDialog,
    taskToDelete,

    // 计算属性
    taskStats,

    // 方法
    fetchTasks,
    fetchTaskLogs,
    refreshData,
    pauseTask,
    resumeTask,
    executeTask,
    viewTaskLogs,
    closeLogs,
    showTaskDetails,
    closeDetailsDialog,
    showCreateTaskDialog,
    closeCreateDialog,
    createTask,
    showDeleteTaskDialog,
    closeDeleteDialog,
    confirmDeleteTask,
    startAutoRefresh,
    stopAutoRefresh
  }
}
