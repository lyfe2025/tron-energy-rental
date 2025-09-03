<template>
  <!-- 服务概览 -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-green-100 rounded-lg">
          <CheckCircle class="h-6 w-6 text-green-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">正常服务</p>
          <p class="text-2xl font-bold text-gray-900">{{ healthyCount }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-yellow-100 rounded-lg">
          <AlertTriangle class="h-6 w-6 text-yellow-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">警告服务</p>
          <p class="text-2xl font-bold text-gray-900">{{ warningCount }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-red-100 rounded-lg">
          <XCircle class="h-6 w-6 text-red-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">异常服务</p>
          <p class="text-2xl font-bold text-gray-900">{{ errorCount }}</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 bg-blue-100 rounded-lg">
          <Server class="h-6 w-6 text-blue-600" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">总服务数</p>
          <p class="text-2xl font-bold text-gray-900">{{ totalCount }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle, Server, XCircle } from 'lucide-vue-next'

interface Props {
  healthyCount: number
  warningCount: number
  errorCount: number
  totalCount: number
}

defineProps<Props>()
</script>
