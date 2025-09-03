<template>
  <div v-if="visible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
      <!-- 弹窗头部 -->
      <div class="flex items-center justify-between pb-3 border-b">
        <h3 class="text-lg font-medium text-gray-900">操作日志详情</h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- 弹窗内容 -->
      <div v-if="selectedLog" class="mt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 基本信息 -->
          <div class="space-y-3">
            <div class="border-b pb-2">
              <h4 class="text-sm font-medium text-gray-900 mb-2">基本信息</h4>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">操作人:</span>
              <span class="text-sm text-gray-900">{{ selectedLog.username }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">IP地址:</span>
              <span class="text-sm text-gray-900">{{ selectedLog.ip_address }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">操作模块:</span>
              <span class="text-sm text-gray-900">{{ selectedLog.module }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">操作类型:</span>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getOperationColor(selectedLog.operation)"
              >
                {{ getOperationText(selectedLog.operation) }}
              </span>
            </div>
          </div>

          <!-- 请求信息 -->
          <div class="space-y-3">
            <div class="border-b pb-2">
              <h4 class="text-sm font-medium text-gray-900 mb-2">请求信息</h4>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">请求方法:</span>
              <span class="text-sm text-gray-900 font-mono">{{ selectedLog.method }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">请求URL:</span>
              <span class="text-sm text-gray-900 font-mono break-all">{{ selectedLog.url }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">执行时间:</span>
              <span class="text-sm text-gray-900">{{ selectedLog.execution_time }}ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">状态:</span>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="selectedLog.status === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'"
              >
                {{ selectedLog.status === 'success' ? '成功' : '失败' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 操作时间 -->
        <div class="mt-4 pt-4 border-t">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">操作时间:</span>
            <span class="text-sm text-gray-900">{{ formatDate(selectedLog.created_at) }}</span>
          </div>
        </div>

        <!-- 请求参数 -->
        <div class="mt-4 pt-4 border-t">
          <h4 class="text-sm font-medium text-gray-900 mb-2">请求参数</h4>
          <div class="bg-gray-50 rounded-md p-3">
            <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ selectedLog.request_params || '无' }}</pre>
          </div>
        </div>

        <!-- 响应数据 -->
        <div class="mt-4 pt-4 border-t">
          <h4 class="text-sm font-medium text-gray-900 mb-2">响应数据</h4>
          <div class="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
            <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ selectedLog.response_data || '无' }}</pre>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="selectedLog.error_message" class="mt-4 pt-4 border-t">
          <h4 class="text-sm font-medium text-gray-900 mb-2">错误信息</h4>
          <div class="bg-red-50 border border-red-200 rounded-md p-3">
            <pre class="text-xs text-red-700 whitespace-pre-wrap">{{ selectedLog.error_message }}</pre>
          </div>
        </div>
      </div>

      <!-- 弹窗底部 -->
      <div class="flex justify-end pt-4 border-t mt-4">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useLogFilters } from '../composables/useLogFilters'
import type { OperationLog } from '../types/operation-logs.types'

interface Props {
  visible: boolean
  selectedLog: OperationLog | null
}

interface Emits {
  close: []
}

defineProps<Props>()
defineEmits<Emits>()

const { getOperationColor, getOperationText, formatDate } = useLogFilters()
</script>
