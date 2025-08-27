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
          :value="getTimeRangeValue()"
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
import type { OrderFilters, OrderStatus } from '../types/order.types'

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
  const status = target.value as OrderStatus | ''
  const newFilters: OrderFilters = { ...props.filters, status }
  emit('update:filters', newFilters)
  emit('filter')
}

// 获取时间范围值（简化处理）
const getTimeRangeValue = () => {
  // 这里可以根据dateRange计算出对应的时间范围值
  // 暂时返回空字符串
  return ''
}

// 处理时间范围变更
const handleTimeRangeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const timeRange = target.value
  
  // 根据时间范围设置dateRange
  let dateRange = { start: '', end: '' }
  const now = new Date()
  
  switch (timeRange) {
    case 'today':
      dateRange.start = now.toISOString().split('T')[0]
      dateRange.end = now.toISOString().split('T')[0]
      break
    case 'week':
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      dateRange.start = weekStart.toISOString().split('T')[0]
      dateRange.end = new Date().toISOString().split('T')[0]
      break
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      dateRange.start = monthStart.toISOString().split('T')[0]
      dateRange.end = new Date().toISOString().split('T')[0]
      break
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      dateRange.start = quarterStart.toISOString().split('T')[0]
      dateRange.end = new Date().toISOString().split('T')[0]
      break
    default:
      dateRange = { start: '', end: '' }
  }
  
  const newFilters = { ...props.filters, dateRange }
  emit('update:filters', newFilters)
  emit('filter')
}
</script>