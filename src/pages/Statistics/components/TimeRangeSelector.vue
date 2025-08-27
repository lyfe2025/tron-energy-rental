<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
      <!-- 时间范围选择 -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <Calendar class="w-5 h-5 text-gray-400" />
          <span class="text-sm font-medium text-gray-700">时间范围:</span>
        </div>
        <select
          :value="filters.timeRange"
          @change="handleTimeRangeChange"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="today">今日</option>
          <option value="yesterday">昨日</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
          <option value="year">本年</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <!-- 自定义日期范围 -->
      <div v-if="filters.timeRange === 'custom'" class="flex items-center space-x-2">
        <input
          :value="customStartDate"
          @change="handleStartDateChange"
          type="date"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <span class="text-gray-500">至</span>
        <input
          :value="customEndDate"
          @change="handleEndDateChange"
          type="date"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          @click="applyCustomRange"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          应用
        </button>
      </div>

      <!-- 其他筛选选项 -->
      <div class="flex items-center space-x-4">
        <!-- 分类筛选 -->
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-700">分类:</span>
          <select
            :value="filters.category"
            @change="handleCategoryChange"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">全部</option>
            <option value="energy">能量</option>
            <option value="bandwidth">带宽</option>
          </select>
        </div>

        <!-- 用户类型筛选 -->
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-700">用户类型:</span>
          <select
            :value="filters.userType"
            @change="handleUserTypeChange"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">全部</option>
            <option value="premium">高级用户</option>
            <option value="regular">普通用户</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 当前选择的时间范围显示 -->
    <div v-if="filters.dateRange" class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center space-x-2 text-sm text-gray-600">
        <Clock class="w-4 h-4" />
        <span>
          当前时间范围: {{ formatDate(filters.dateRange.start) }} 至 {{ formatDate(filters.dateRange.end) }}
        </span>
        <span v-if="lastUpdated" class="text-gray-400">
          | 最后更新: {{ formatDateTime(lastUpdated) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Calendar, Clock } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { StatisticsFilters } from '../types/statistics.types'

interface Props {
  filters: StatisticsFilters
  lastUpdated: Date | null
}

interface Emits {
  (e: 'update:filters', filters: Partial<StatisticsFilters>): void
  (e: 'setTimeRange', timeRange: StatisticsFilters['timeRange']): void
  (e: 'setCustomDateRange', dateRange: { start: string; end: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 自定义日期范围
const customStartDate = ref('')
const customEndDate = ref('')

// 计算属性
const currentDateRange = computed(() => props.filters.dateRange)

// 事件处理
const handleTimeRangeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const timeRange = target.value as StatisticsFilters['timeRange']
  
  if (timeRange === 'custom') {
    // 设置默认的自定义日期范围为最近7天
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    
    customStartDate.value = start.toISOString().split('T')[0]
    customEndDate.value = end.toISOString().split('T')[0]
  } else {
    emit('setTimeRange', timeRange)
  }
}

const handleStartDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  customStartDate.value = target.value
}

const handleEndDateChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  customEndDate.value = target.value
}

const applyCustomRange = () => {
  if (customStartDate.value && customEndDate.value) {
    emit('setCustomDateRange', {
      start: customStartDate.value,
      end: customEndDate.value
    })
  }
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:filters', { category: target.value as StatisticsFilters['category'] })
}

const handleUserTypeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:filters', { userType: target.value as StatisticsFilters['userType'] })
}

// 格式化函数
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (date: Date) => {
  return date.toLocaleString('zh-CN')
}
</script>
