<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div class="flex items-center">
        <div class="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Network class="h-6 w-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">总网络数</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div class="flex items-center">
        <div class="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
          <CheckCircle class="h-6 w-6 text-green-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">在线网络</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.online }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div class="flex items-center">
        <div class="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
          <Clock class="h-6 w-6 text-yellow-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">连接中</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.connecting }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div class="flex items-center">
        <div class="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
          <XCircle class="h-6 w-6 text-red-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">离线网络</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.offline }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, Clock, Network, XCircle } from 'lucide-vue-next'

interface NetworkStats {
  total: number
  online: number
  connecting: number
  offline: number
}

defineProps<{
  stats: NetworkStats
}>()
</script>

