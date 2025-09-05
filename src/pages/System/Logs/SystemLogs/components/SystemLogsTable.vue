<template>
  <div class="overflow-hidden">
    <!-- 加载状态 -->
    <div v-if="loading" class="p-8 text-center">
      <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        加载中...
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="p-8 text-center">
      <div class="text-red-600 mb-4">{{ error }}</div>
      <button
        @click="$emit('retry')"
        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        重试
      </button>
    </div>

    <!-- 数据表格 -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">级别</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">模块</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">消息</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="logs.length === 0">
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
              暂无数据
            </td>
          </tr>
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
            <!-- 级别 -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getLevelClass(log.level)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                {{ getLevelText(log.level) }}
              </span>
            </td>
            
            <!-- 模块 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ log.module }}
            </td>
            
            <!-- 消息 -->
            <td class="px-6 py-4 text-sm text-gray-900">
              <div class="max-w-xs truncate" :title="log.message">
                {{ log.message }}
              </div>
            </td>
            
            <!-- 用户ID -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ log.user_id || '-' }}
            </td>
            
            <!-- 时间 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDate(log.created_at) }}
            </td>
            
            <!-- 操作 -->
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="$emit('view-details', log)"
                class="text-blue-600 hover:text-blue-900 mr-3"
              >
                查看详情
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="!loading && !error && logs.length > 0" class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
      <div class="flex items-center justify-between">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="$emit('prev-page')"
            :disabled="!pagination.hasPrev"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <button
            @click="$emit('next-page')"
            :disabled="!pagination.hasNext"
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
                @click="$emit('prev-page')"
                :disabled="!pagination.hasPrev"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft class="h-5 w-5" />
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                {{ pagination.current }}
              </span>
              <button
                @click="$emit('next-page')"
                :disabled="!pagination.hasNext"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight class="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { SystemLog, SystemLogPagination } from '../types/system-logs.types'

interface Props {
  logs: SystemLog[]
  loading: boolean
  error: string | null
  pagination: SystemLogPagination
  formatDate: (date: string) => string
}

interface Emits {
  'view-details': [log: SystemLog]
  'prev-page': []
  'next-page': []
  retry: []
}

defineProps<Props>()
defineEmits<Emits>()

// 获取级别样式
const getLevelClass = (level: string) => {
  const classes = {
    debug: 'bg-gray-100 text-gray-800',
    info: 'bg-blue-100 text-blue-800',
    warn: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  }
  return classes[level as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

// 获取级别文本
const getLevelText = (level: string) => {
  const texts = {
    debug: 'Debug',
    info: 'Info',
    warn: 'Warning',
    error: 'Error'
  }
  return texts[level as keyof typeof texts] || level
}
</script>