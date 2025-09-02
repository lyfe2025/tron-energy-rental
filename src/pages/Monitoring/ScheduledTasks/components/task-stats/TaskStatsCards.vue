<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <!-- 总任务数 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-blue-100 rounded-lg">
          <Clock class="h-6 w-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">总任务数</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
        </div>
      </div>
    </div>
    
    <!-- 激活任务 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-green-100 rounded-lg">
          <Play class="h-6 w-6 text-green-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">激活任务</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.running }}</p>
        </div>
      </div>
    </div>
    
    <!-- 非激活 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-yellow-100 rounded-lg">
          <Pause class="h-6 w-6 text-yellow-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">非激活</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.paused }}</p>
        </div>
      </div>
    </div>
    
    <!-- 异常任务 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-red-100 rounded-lg">
          <AlertCircle class="h-6 w-6 text-red-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">异常任务</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, Clock, Pause, Play } from 'lucide-vue-next'

interface TaskStats {
  total: number
  running: number
  paused: number
  error: number
}

interface Props {
  stats: TaskStats
}

defineProps<Props>()
</script>

<style scoped>
/* 统计卡片特定样式 */
</style>
