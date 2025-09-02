<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-green-100 rounded-lg">
          <Table class="h-6 w-6 text-green-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">数据表数量</p>
          <p class="text-2xl font-bold text-gray-900">{{ dbStats?.tableCount || 0 }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-blue-100 rounded-lg">
          <Users class="h-6 w-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">用户总数</p>
          <p class="text-2xl font-bold text-gray-900">{{ dbStats?.userCount || 0 }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-purple-100 rounded-lg">
          <ShoppingCart class="h-6 w-6 text-purple-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">订单总数</p>
          <p class="text-2xl font-bold text-gray-900">{{ dbStats?.orderCount || 0 }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-orange-100 rounded-lg">
          <HardDrive class="h-6 w-6 text-orange-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">数据库大小</p>
          <p class="text-2xl font-bold text-gray-900">{{ formatSize(typeof dbStats?.databaseSize === 'number' ? dbStats.databaseSize : 0) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DatabaseStats } from '@/api/monitoring';
import { HardDrive, ShoppingCart, Table, Users } from 'lucide-vue-next';

defineProps<{
  dbStats: DatabaseStats | null;
}>()

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
