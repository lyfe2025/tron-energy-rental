<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <div class="p-3 bg-blue-100 rounded-lg">
          <Database class="h-6 w-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <h2 class="text-lg font-semibold text-gray-900">数据库连接状态</h2>
          <p class="text-sm text-gray-600">PostgreSQL 数据库连接信息</p>
        </div>
      </div>
      <div class="flex items-center">
        <div 
          class="h-3 w-3 rounded-full mr-2"
          :class="dbStatus?.connected ? 'bg-green-500' : 'bg-red-500'"
        ></div>
        <span 
          class="text-sm font-medium"
          :class="dbStatus?.connected ? 'text-green-600' : 'text-red-600'"
        >
          {{ dbStatus?.connected ? '已连接' : '连接失败' }}
        </span>
      </div>
    </div>
    
    <div v-if="dbStatus" class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <label class="text-sm font-medium text-gray-600">数据库版本</label>
        <p class="text-lg font-semibold text-gray-900">{{ dbStatus.version }}</p>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-600">活跃连接数</label>
        <p class="text-lg font-semibold text-gray-900">{{ dbStatus.activeConnections }}</p>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-600">最大连接数</label>
        <p class="text-lg font-semibold text-gray-900">{{ dbStatus.maxConnections }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database } from 'lucide-vue-next';
import type { DatabaseStatus } from '../types/database.types';

interface Props {
  dbStatus: DatabaseStatus | null
}

defineProps<Props>()
</script>