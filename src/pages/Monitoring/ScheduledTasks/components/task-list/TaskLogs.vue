<template>
  <div v-if="visible" class="bg-white rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">执行日志</h2>
      <button
        @click="$emit('close')"
        class="text-gray-400 hover:text-gray-600"
      >
        <X class="h-5 w-5" />
      </button>
    </div>
    
    <div class="p-6">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-8">
        <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
        <p class="text-gray-500">加载日志中...</p>
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="logs.length === 0" class="text-center py-8 text-gray-500">
        暂无执行日志
      </div>
      
      <!-- 日志列表 -->
      <div v-else class="space-y-4">
        <div 
          v-for="log in logs" 
          :key="log.id" 
          class="border rounded-lg p-4"
          :class="getLogContainerClass(log.status)"
        >
          <!-- 日志头部 -->
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
          
          <!-- 输出内容 -->
          <div v-if="log.output" class="mt-2">
            <p class="text-sm font-medium text-gray-700 mb-1">输出:</p>
            <pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{{ log.output }}</pre>
          </div>
          
          <!-- 错误信息 -->
          <div v-if="log.error" class="mt-2">
            <p class="text-sm font-medium text-red-700 mb-1">错误:</p>
            <pre class="text-xs bg-red-100 p-2 rounded overflow-x-auto text-red-800">{{ log.error }}</pre>
          </div>
        </div>
        
        <!-- 加载更多 -->
        <div v-if="hasMore" class="text-center mt-4">
          <button
            @click="$emit('load-more')"
            :disabled="loadingMore"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw v-if="loadingMore" class="h-4 w-4 mr-2 animate-spin" />
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, X } from 'lucide-vue-next'

import type { TaskExecutionLog } from '@/api/monitoring'

interface Props {
  visible: boolean
  logs: TaskExecutionLog[]
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'load-more'): void
}

defineProps<Props>()
defineEmits<Emits>()

// 获取日志容器样式
const getLogContainerClass = (status: string) => {
  switch (status) {
    case 'success':
      return 'border-green-200 bg-green-50'
    case 'error':
      return 'border-red-200 bg-red-50'
    case 'running':
      return 'border-yellow-200 bg-yellow-50'
    default:
      return 'border-gray-200 bg-gray-50'
  }
}

// 获取日志状态样式
const getLogStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    case 'running':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// 获取日志状态显示名称
const getLogStatusDisplayName = (status: string) => {
  switch (status) {
    case 'success':
      return '成功'
    case 'error':
      return '失败'
    case 'running':
      return '运行中'
    default:
      return '未知'
  }
}

// 格式化时间
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('zh-CN')
}
</script>

<style scoped>
/* 日志组件特定样式 */
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
