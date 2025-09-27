<template>
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
          <!-- 加载状态 -->
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
              <div class="flex items-center justify-center">
                <RefreshCw class="h-5 w-5 animate-spin mr-2" />
                加载中...
              </div>
            </td>
          </tr>
          
          <!-- 空状态 -->
          <tr v-else-if="tasks.length === 0">
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
              暂无定时任务
            </td>
          </tr>
          
          <!-- 任务列表 -->
          <tr v-else v-for="task in tasks" :key="task.id" class="hover:bg-gray-50">
            <!-- 任务信息 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div>
                <div class="text-sm font-medium text-gray-900">{{ task.name }}</div>
                <div class="text-sm text-gray-500">{{ task.description }}</div>
              </div>
            </td>
            
            <!-- 状态 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                :class="getStatusBadgeClass(task.status)"
              >
                {{ getStatusDisplayName(task.status) }}
              </span>
            </td>
            
            <!-- Cron表达式 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
              {{ task.cronExpression }}
            </td>
            
            <!-- 下次执行 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ task.nextRun ? formatDateTime(task.nextRun) : '-' }}
            </td>
            
            <!-- 最后执行 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ task.lastRun ? formatDateTime(task.lastRun) : '-' }}
            </td>
            
            <!-- 操作 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2">
                <!-- 暂停/恢复 -->
                <button
                  v-if="task.status === 'active'"
                  @click="$emit('pause-task', task.id)"
                  class="text-yellow-600 hover:text-yellow-900"
                  title="暂停任务"
                >
                  <Pause class="h-4 w-4" />
                </button>
                <button
                  v-else-if="task.status === 'inactive'"
                  @click="$emit('resume-task', task.id)"
                  class="text-green-600 hover:text-green-900"
                  title="恢复任务"
                >
                  <Play class="h-4 w-4" />
                </button>
                
                <!-- 立即执行 -->
                <button
                  @click="$emit('execute-task', task.id)"
                  class="text-blue-600 hover:text-blue-900"
                  title="立即执行"
                >
                  <PlayCircle class="h-4 w-4" />
                </button>
                
                <!-- 查看日志 -->
                <button
                  @click="$emit('view-logs', task.id)"
                  class="text-indigo-600 hover:text-indigo-900"
                  title="查看日志"
                >
                  <FileText class="h-4 w-4" />
                </button>
                
                <!-- 编辑任务 -->
                <button
                  @click="$emit('edit-task', task)"
                  class="text-orange-600 hover:text-orange-900"
                  title="编辑任务"
                >
                  <Edit class="h-4 w-4" />
                </button>
                
                <!-- 查看详情 -->
                <button
                  @click="$emit('view-details', task)"
                  class="text-gray-600 hover:text-gray-900"
                  title="查看详情"
                >
                  <Eye class="h-4 w-4" />
                </button>
                
                <!-- 删除任务 -->
                <button
                  @click="$emit('delete-task', task)"
                  class="text-red-600 hover:text-red-900"
                  title="删除任务"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScheduledTask } from '@/api/monitoring'
import { Edit, Eye, FileText, Pause, Play, PlayCircle, RefreshCw, Trash2 } from 'lucide-vue-next'

interface Props {
  tasks: ScheduledTask[]
  loading: boolean
}

interface Emits {
  (e: 'pause-task', taskId: string): void
  (e: 'resume-task', taskId: string): void
  (e: 'execute-task', taskId: string): void
  (e: 'view-logs', taskId: string): void
  (e: 'view-details', task: ScheduledTask): void
  (e: 'edit-task', task: ScheduledTask): void
  (e: 'delete-task', task: ScheduledTask): void
}

defineProps<Props>()
defineEmits<Emits>()

// 状态样式映射
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-yellow-100 text-yellow-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// 状态显示名称
const getStatusDisplayName = (status: string) => {
  switch (status) {
    case 'active':
      return '运行中'
    case 'inactive':
      return '已暂停'
    case 'error':
      return '异常'
    default:
      return '未知'
  }
}

// 时间格式化
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('zh-CN')
}
</script>

<style scoped>
/* 任务表格特定样式 */
</style>
