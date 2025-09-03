<template>
  <!-- 服务详情对话框 -->
  <div v-if="visible" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">服务详情 - {{ service?.name }}</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="mt-4" v-if="service">
          <div class="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label class="text-sm font-medium text-gray-600">服务名称</label>
              <p class="text-sm text-gray-900">{{ service.name }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">服务类型</label>
              <p class="text-sm text-gray-900">{{ service.type }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">状态</label>
              <p class="text-sm text-gray-900">{{ getStatusDisplayName(service.status) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">响应时间</label>
              <p class="text-sm text-gray-900">{{ service.responseTime }}ms</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">运行时间</label>
              <p class="text-sm text-gray-900">{{ service.uptime ? formatUptime(service.uptime) : '-' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">版本</label>
              <p class="text-sm text-gray-900">{{ service.version || '-' }}</p>
            </div>
          </div>
          
          <div v-if="service.healthChecks" class="mt-6">
            <h4 class="text-md font-medium text-gray-900 mb-3">健康检查</h4>
            <div class="space-y-2">
              <div 
                v-for="check in service.healthChecks" 
                :key="check.name"
                class="flex items-center justify-between p-2 border rounded"
              >
                <span class="text-sm text-gray-900">{{ check.name }}</span>
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="check.status === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ check.status === 'pass' ? '通过' : '失败' }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-if="service.error" class="mt-6">
            <h4 class="text-md font-medium text-red-700 mb-3">错误信息</h4>
            <pre class="text-sm bg-red-50 p-3 rounded border border-red-200 text-red-800">{{ service.error }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { ServiceStatus } from '../types/service-status.types'

interface Props {
  visible: boolean
  service: ServiceStatus | null
  getStatusDisplayName: (status: string) => string
  formatUptime: (seconds: number) => string
}

interface Emits {
  (e: 'close'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
