<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">机器人管理</h1>
      <p class="text-gray-600 mt-1">管理和监控您的TRON机器人配置和网络设置</p>
    </div>
    
    <div class="flex gap-3 mt-4 sm:mt-0">
      <button
        @click="$emit('refresh')"
        :disabled="loading"
        class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <RefreshCw :class="{ 'animate-spin': loading }" class="w-4 h-4" />
        刷新
      </button>
      
      <ConnectivityChecker
        :connectivity-state="connectivityState"
        @check-connection="$emit('check-connectivity')"
      />
      
      <button
        @click="$emit('export-data')"
        class="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
      >
        <Download class="w-4 h-4" />
        导出
      </button>
      
      <button
        @click="$emit('create-bot')"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus class="w-4 h-4" />
        创建机器人
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download, Plus, RefreshCw } from 'lucide-vue-next'
import type { ConnectivityState } from '../../types/connectivity.types'
import ConnectivityChecker from './ConnectivityChecker.vue'

interface Props {
  loading: boolean
  connectivityState: ConnectivityState
}

defineProps<Props>()

defineEmits<{
  refresh: []
  'check-connectivity': []
  'export-data': []
  'create-bot': []
}>()
</script>
