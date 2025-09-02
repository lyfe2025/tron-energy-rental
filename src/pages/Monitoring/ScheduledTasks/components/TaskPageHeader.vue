<template>
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">定时任务管理</h1>
    
    <div class="flex items-center space-x-3">
      <!-- 新增任务按钮 -->
      <button
        @click="$emit('create-task')"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Plus class="h-4 w-4 mr-2" />
        新增任务
      </button>
      
      <!-- 刷新按钮 -->
      <button
        @click="$emit('refresh')"
        :disabled="loading"
        class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        刷新
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, RefreshCw } from 'lucide-vue-next';

interface Props {
  loading?: boolean
}

interface Emits {
  (e: 'create-task'): void
  (e: 'refresh'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
/* 页面头部特定样式 */
</style>
