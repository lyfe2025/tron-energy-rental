<template>
  <div class="space-y-6">
    <!-- 页面标题和操作 -->
    <TaskPageHeader
      :loading="loading"
      @create-task="showCreateTaskDialog"
      @refresh="refreshData"
    />

    <!-- 统计信息 -->
    <TaskStatsCards :stats="taskStats" />

    <!-- 定时任务列表 -->
    <TasksTable
      :tasks="tasks"
      :loading="loading"
      @pause-task="pauseTask"
      @resume-task="resumeTask"
      @execute-task="executeTask"
      @view-logs="viewTaskLogs"
      @view-details="showTaskDetails"
      @delete-task="showDeleteTaskDialog"
    />

    <!-- 执行日志 -->
    <TaskLogs
      :visible="showLogs"
      :logs="logs"
      :loading="logsLoading"
      @close="closeLogs"
    />

    <!-- 任务详情对话框 -->
    <TaskDetailsDialog
      :visible="showDetailsDialog"
      :task="selectedTask"
      @close="closeDetailsDialog"
      @pause-task="pauseTask"
      @resume-task="resumeTask"
      @execute-task="executeTask"
      @view-logs="viewTaskLogs"
    />

    <!-- 新增任务对话框 -->
    <CreateTaskDialog
      :visible="showCreateDialog"
      :loading="createLoading"
      @close="closeCreateDialog"
      @submit="createTask"
    />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="showDeleteDialog"
      type="danger"
      title="删除定时任务"
      :message="`确定要删除定时任务「${taskToDelete?.name}」吗？`"
      warning="删除后无法恢复，请谨慎操作。"
      confirm-text="删除"
      cancel-text="取消"
      loading-text="删除中..."
      :loading="deleteLoading"
      @confirm="confirmDeleteTask"
      @cancel="closeDeleteDialog"
    />
  </div>
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'

// 导入拆分后的组件
import TaskPageHeader from './components/TaskPageHeader.vue'
import TaskDetailsDialog from './components/dialogs/TaskDetailsDialog.vue'
import CreateTaskDialog from './components/task-forms/CreateTaskDialog.vue'
import TaskLogs from './components/task-list/TaskLogs.vue'
import TasksTable from './components/task-list/TasksTable.vue'
import TaskStatsCards from './components/task-stats/TaskStatsCards.vue'

// 导入业务逻辑
import { useScheduledTasks } from './composables/useScheduledTasks'

// Toast 通知
const { success, error } = useToast()

// 使用定时任务管理逻辑
const {
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
  refreshData,
  pauseTask: _pauseTask,
  resumeTask: _resumeTask,
  executeTask: _executeTask,
  viewTaskLogs,
  closeLogs,
  showTaskDetails,
  closeDetailsDialog,
  showCreateTaskDialog,
  closeCreateDialog,
  createTask: _createTask,
  showDeleteTaskDialog,
  closeDeleteDialog,
  confirmDeleteTask: _confirmDeleteTask
} = useScheduledTasks()

// 包装方法，添加消息提示
const pauseTask = async (taskId: string) => {
  try {
    await _pauseTask(taskId)
    success('任务已暂停')
  } catch (error) {
    error('暂停任务失败')
  }
}

const resumeTask = async (taskId: string) => {
  try {
    await _resumeTask(taskId)
    success('任务已恢复')
  } catch (error) {
    error('恢复任务失败')
  }
}

const executeTask = async (taskId: string) => {
  try {
    await _executeTask(taskId)
    success('任务已开始执行')
  } catch (error) {
    error('执行任务失败')
  }
}

const createTask = async (form: any) => {
  try {
    await _createTask(form)
    success('任务创建成功')
  } catch (error) {
    error('创建任务失败')
  }
}

const confirmDeleteTask = async () => {
  try {
    await _confirmDeleteTask()
    success('任务删除成功')
  } catch (error) {
    error('删除任务失败')
  }
}
</script>

<style scoped>
/* 页面特定样式 */
</style>
