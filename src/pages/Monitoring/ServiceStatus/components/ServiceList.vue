<template>
  <!-- 核心服务状态 -->
  <div class="bg-white rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">核心服务状态</h2>
    </div>
    
    <div class="p-6">
      <div v-if="loading" class="text-center py-8">
        <RefreshCw class="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
        <p class="text-gray-500">检查服务状态中...</p>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="service in services" 
          :key="service.name" 
          class="border rounded-lg p-4"
          :class="{
            'border-green-200 bg-green-50': service.status === 'healthy',
            'border-yellow-200 bg-yellow-50': service.status === 'warning',
            'border-red-200 bg-red-50': service.status === 'error'
          }"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <component 
                :is="getServiceIcon(service.type)" 
                class="h-5 w-5 mr-2"
                :class="getServiceIconColor(service.status)"
              />
              <h3 class="text-sm font-medium text-gray-900">{{ service.name }}</h3>
            </div>
            <span 
              class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
              :class="getStatusBadgeClass(service.status)"
            >
              {{ getStatusDisplayName(service.status) }}
            </span>
          </div>
          
          <div class="space-y-2 text-xs text-gray-600">
            <div class="flex justify-between">
              <span>响应时间:</span>
              <span class="font-medium">{{ service.responseTime }}ms</span>
            </div>
            <div class="flex justify-between">
              <span>最后检查:</span>
              <span class="font-medium">{{ formatDateTime(service.lastCheck) }}</span>
            </div>
            <div v-if="service.uptime" class="flex justify-between">
              <span>运行时间:</span>
              <span class="font-medium">{{ formatUptime(service.uptime) }}</span>
            </div>
            <div v-if="service.version" class="flex justify-between">
              <span>版本:</span>
              <span class="font-medium">{{ service.version }}</span>
            </div>
          </div>
          
          <div v-if="service.error" class="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
            {{ service.error }}
          </div>
          
          <div class="mt-3 flex justify-end space-x-2">
            <button
              @click="$emit('check-service', service.name)"
              class="text-blue-600 hover:text-blue-900 text-xs"
              title="立即检查"
            >
              <RefreshCw class="h-3 w-3" />
            </button>
            <button
              @click="$emit('show-details', service)"
              class="text-gray-600 hover:text-gray-900 text-xs"
              title="查看详情"
            >
              <Eye class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, Eye, Globe, RefreshCw, Server } from 'lucide-vue-next'
import type { ServiceStatus } from '../types/service-status.types'

interface Props {
  services: ServiceStatus[]
  loading: boolean
  getServiceIconColor: (status: string) => string
  getStatusDisplayName: (status: string) => string
  getStatusBadgeClass: (status: string) => string
  formatDateTime: (dateString: string) => string
  formatUptime: (seconds: number) => string
}

interface Emits {
  (e: 'check-service', serviceName: string): void
  (e: 'show-details', service: ServiceStatus): void
}

defineProps<Props>()
defineEmits<Emits>()

// 获取服务图标
const getServiceIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    'database': Database,
    'api': Server,
    'web': Globe,
    'cache': Server
  }
  return iconMap[type] || Server
}
</script>
