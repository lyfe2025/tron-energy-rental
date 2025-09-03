<template>
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
        @click="$emit('retry')"
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
                @click="$emit('view-details', log)"
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
            @click="$emit('prev-page')"
            :disabled="pagination.current <= 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <button
            @click="$emit('next-page')"
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
                @click="$emit('prev-page')"
                :disabled="pagination.current <= 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft class="h-5 w-5" />
              </button>
              <button
                @click="$emit('next-page')"
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
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, Globe, Monitor, User } from 'lucide-vue-next'
import type { LoginLog, LoginLogPagination } from '../types/login-logs.types'

interface Props {
  logs: LoginLog[]
  loading: boolean
  error: string
  pagination: LoginLogPagination
  formatDate: (date: string) => string
}

interface Emits {
  (e: 'view-details', log: LoginLog): void
  (e: 'prev-page'): void
  (e: 'next-page'): void
  (e: 'retry'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
