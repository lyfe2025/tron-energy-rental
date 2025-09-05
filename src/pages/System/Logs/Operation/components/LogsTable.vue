<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3 text-gray-500">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span>加载操作日志中...</span>
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
                  <div class="text-sm font-medium text-gray-900">
                    {{ log.username || '系统' }}
                  </div>
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
                @click="$emit('view-details', log)"
                class="text-blue-600 hover:text-blue-900"
              >
                查看详情
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 空状态 -->
      <div v-if="logs.length === 0" class="text-center py-12">
        <div class="text-gray-500 mb-2">暂无操作日志</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { User } from 'lucide-vue-next'
import { useLogFilters } from '../composables/useLogFilters'
import type { OperationLog } from '../types/operation-logs.types'

interface Props {
  logs: OperationLog[]
  loading: boolean
  error: string
}

interface Emits {
  'view-details': [log: OperationLog]
  retry: []
}

defineProps<Props>()
defineEmits<Emits>()

const { getOperationColor, getOperationText, formatDate } = useLogFilters()
</script>
