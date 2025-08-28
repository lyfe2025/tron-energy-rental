<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
      <div class="flex-1 max-w-lg">
        <div class="relative">
          <Search class="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            :value="searchQuery"
            @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="搜索用户名、邮箱或电话"
            class="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <select
          :value="statusFilter"
          @change="$emit('update:statusFilter', ($event.target as HTMLSelectElement).value)"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">所有状态</option>
          <option value="active">活跃</option>
          <option value="inactive">停用</option>
          <option value="banned">封禁</option>
        </select>
        
        <select
          :value="typeFilter"
          @change="$emit('update:typeFilter', ($event.target as HTMLSelectElement).value)"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">所有类型</option>
          <option value="normal">普通用户</option>
          <option value="vip">VIP用户</option>
          <option value="premium">套餐用户</option>
          <option value="agent">代理商</option>
          <option value="admin">管理员</option>
        </select>
        
        <button
          @click="$emit('export')"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download class="h-4 w-4 mr-2" />
          导出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, Download } from 'lucide-vue-next'

interface Props {
  searchQuery: string
  statusFilter: string
  typeFilter: string
}

interface Emits {
  'update:searchQuery': [value: string]
  'update:statusFilter': [value: string]
  'update:typeFilter': [value: string]
  'export': []
}

defineProps<Props>()
defineEmits<Emits>()
</script>