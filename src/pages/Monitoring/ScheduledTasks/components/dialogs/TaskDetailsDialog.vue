<template>
  <div v-if="visible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">任务详情</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        
        <div class="mt-4 space-y-3" v-if="task">
          <div>
            <label class="text-sm font-medium text-gray-600">任务名称</label>
            <p class="text-sm text-gray-900">{{ task.name }}</p>
          </div>
          
          <div>
            <label class="text-sm font-medium text-gray-600">描述</label>
            <p class="text-sm text-gray-900">{{ task.description }}</p>
          </div>
          
          <div>
            <label class="text-sm font-medium text-gray-600">状态</label>
            <span 
              class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
              :class="getStatusBadgeClass(task.status)"
            >
              {{ getStatusDisplayName(task.status) }}
            </span>
          </div>
          
          <div>
            <label class="text-sm font-medium text-gray-600">Cron表达式</label>
            <p class="text-sm text-gray-900 font-mono">{{ task.cronExpression || task.cron_expression }}</p>
          </div>
          
          <div>
            <label class="text-sm font-medium text-gray-600">执行命令</label>
            <p class="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">{{ task.command }}</p>
          </div>
          
          <div v-if="task.nextRun">
            <label class="text-sm font-medium text-gray-600">下次执行时间</label>
            <p class="text-sm text-gray-900">{{ formatDateTime(task.nextRun) }}</p>
          </div>
          
          <div v-if="task.lastRun">
            <label class="text-sm font-medium text-gray-600">最后执行时间</label>
            <p class="text-sm text-gray-900">{{ formatDateTime(task.lastRun) }}</p>
          </div>
          
          <div>
            <label class="text-sm font-medium text-gray-600">创建时间</label>
            <p class="text-sm text-gray-900">{{ formatDateTime(task.createdAt || task.created_at) }}</p>
          </div>
          
          <div>
            <label class="text-sm font-medium text-gray-600">更新时间</label>
            <p class="text-sm text-gray-900">{{ formatDateTime(task.updatedAt || task.updated_at) }}</p>
          </div>
          
          <!-- 操作按钮 -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              v-if="task.status === 'active'"
              @click="$emit('pause-task', task.id)"
              class="inline-flex items-center px-3 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
            >
              <Pause class="h-4 w-4 mr-2" />
              暂停任务
            </button>
            <button
              v-else-if="task.status === 'inactive'"
              @click="$emit('resume-task', task.id)"
              class="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
            >
              <Play class="h-4 w-4 mr-2" />
              恢复任务
            </button>
            
            <button
              @click="$emit('execute-task', task.id)"
              class="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <PlayCircle class="h-4 w-4 mr-2" />
              立即执行
            </button>
            
            <button
              @click="$emit('view-logs', task.id)"
              class="inline-flex items-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            >
              <FileText class="h-4 w-4 mr-2" />
              查看日志
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScheduledTask } from '@/api/monitoring'
import { FileText, Pause, Play, PlayCircle, X } from 'lucide-vue-next'

interface Props {
  visible: boolean
  task?: ScheduledTask | null
}

interface Emits {
  (e: 'close'): void
  (e: 'pause-task', taskId: string): void
  (e: 'resume-task', taskId: string): void
  (e: 'execute-task', taskId: string): void
  (e: 'view-logs', taskId: string): void
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
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}
</script>

<style scoped>
/* 对话框特定样式 */
</style>
