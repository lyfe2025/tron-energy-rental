<!--
管理员页面网络状态组件
从 Admins/index.vue 中安全分离的网络状态和错误提示
-->

<template>
  <div v-if="!isOnline || hasError" class="mb-6">
    <!-- 网络状态提示 -->
    <div v-if="!isOnline" class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
      <div class="flex items-center">
        <WifiOff class="h-5 w-5 text-yellow-400 mr-3" />
        <div>
          <h3 class="text-sm font-medium text-yellow-800">网络连接异常</h3>
          <p class="text-sm text-yellow-700 mt-1">请检查网络设置，网络恢复后将自动重新加载数据</p>
        </div>
      </div>
    </div>
    
    <!-- 错误状态提示 -->
    <div v-if="hasError && isOnline" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <AlertCircle class="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 class="text-sm font-medium text-red-800">数据加载失败</h3>
            <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
          </div>
        </div>
        <button
          @click="$emit('refresh')"
          :disabled="refreshing"
          class="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': refreshing }" />
          重试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-vue-next'

interface Props {
  isOnline: boolean
  hasError: boolean
  errorMessage: string
  refreshing: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  refresh: []
}>()
</script>
