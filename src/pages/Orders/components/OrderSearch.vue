<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- 搜索框 -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">搜索订单</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400" />
          </div>
          <input
            :value="searchQuery"
            type="text"
            placeholder="搜索订单ID、用户ID或交易哈希"
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            @input="handleSearchInput"
          />
        </div>
      </div>

      <!-- 状态过滤 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">订单状态</label>
        <select
          :value="filters.status"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @change="handleStatusChange"
        >
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <!-- 时间范围 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
        <select
          :value="filters.timeRange"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          @change="handleTimeRangeChange"
        >
          <option value="">全部时间</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import type { OrderFilters } from '../types/order.types'

interface Props {
  searchQuery: string
  filters: OrderFilters
}

interface Emits {
  'update:searchQuery': [value: string]
  'update:filters': [filters: OrderFilters]
  'search': []
  'filter': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 处理搜索输入
const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:searchQuery', target.value)
  emit('search')
}

// 处理状态变更
const handleStatusChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newFilters = { ...props.filters, status: target.value }
  emit('update:filters', newFilters)
  emit('filter')
}

// 处理时间范围变更
const handleTimeRangeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newFilters = { ...props.filters, timeRange: target.value }
  emit('update:filters', newFilters)
  emit('filter')
}
</script>