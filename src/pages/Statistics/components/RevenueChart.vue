<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">收入趋势</h3>
        <p class="text-sm text-gray-500">查看收入变化趋势和订单数量统计</p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          v-for="type in chartTypes"
          :key="type.value"
          @click="currentChartType = type.value"
          :class="[
            'px-3 py-1 text-sm rounded-md transition-colors',
            currentChartType === type.value
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          ]"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <!-- 图表容器 -->
    <div class="h-80 relative">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span class="ml-3 text-gray-600">加载图表数据...</span>
      </div>
      
      <div v-else-if="!hasData" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <BarChart3 class="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p class="text-gray-500">暂无数据</p>
        </div>
      </div>

      <!-- 简化的图表展示 -->
      <div v-else class="h-full">
        <!-- 收入折线图 -->
        <div v-if="currentChartType === 'revenue'" class="h-full">
          <div class="flex items-end space-x-1 h-full">
            <div
              v-for="(item, index) in revenueData.slice(-15)"
              :key="index"
              class="flex-1 bg-indigo-200 hover:bg-indigo-300 transition-colors rounded-t cursor-pointer relative group"
              :style="{ height: `${(item.revenue / maxRevenue) * 100}%` }"
              :title="`${item.date}: ${formatCurrency(item.revenue)}`"
            >
              <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {{ formatDate(item.date) }}<br/>
                {{ formatCurrency(item.revenue) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 订单数柱状图 -->
        <div v-if="currentChartType === 'orders'" class="h-full">
          <div class="flex items-end space-x-1 h-full">
            <div
              v-for="(item, index) in revenueData.slice(-15)"
              :key="index"
              class="flex-1 bg-blue-200 hover:bg-blue-300 transition-colors rounded-t cursor-pointer relative group"
              :style="{ height: `${(item.orders / maxOrders) * 100}%` }"
              :title="`${item.date}: ${item.orders}订单`"
            >
              <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {{ formatDate(item.date) }}<br/>
                {{ item.orders }} 订单
              </div>
            </div>
          </div>
        </div>

        <!-- 能量使用量 -->
        <div v-if="currentChartType === 'energy'" class="h-full">
          <div class="flex items-end space-x-1 h-full">
            <div
              v-for="(item, index) in revenueData.slice(-15)"
              :key="index"
              class="flex-1 bg-green-200 hover:bg-green-300 transition-colors rounded-t cursor-pointer relative group"
              :style="{ height: `${(item.energy / maxEnergy) * 100}%` }"
              :title="`${item.date}: ${formatEnergy(item.energy)}`"
            >
              <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {{ formatDate(item.date) }}<br/>
                {{ formatEnergy(item.energy) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center justify-center space-x-6 text-sm">
        <div v-if="currentChartType === 'revenue'" class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-indigo-500 rounded"></div>
          <span class="text-gray-600">收入</span>
        </div>
        <div v-if="currentChartType === 'orders'" class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-blue-500 rounded"></div>
          <span class="text-gray-600">订单数</span>
        </div>
        <div v-if="currentChartType === 'energy'" class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-green-500 rounded"></div>
          <span class="text-gray-600">能量使用</span>
        </div>
      </div>
    </div>

    <!-- 统计摘要 -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(totalRevenue) }}</p>
          <p class="text-sm text-gray-500">总收入</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900">{{ totalOrders }}</p>
          <p class="text-sm text-gray-500">总订单数</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(totalEnergy) }}</p>
          <p class="text-sm text-gray-500">总能量使用</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarChart3 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { RevenueData } from '../types/statistics.types'

interface Props {
  revenueData: RevenueData[]
  isLoading: boolean
  formatCurrency: (value: number) => string
}

const props = defineProps<Props>()

// 图表类型
const chartTypes = [
  { value: 'revenue', label: '收入' },
  { value: 'orders', label: '订单' },
  { value: 'energy', label: '能量' }
]

const currentChartType = ref('revenue')

// 计算属性
const hasData = computed(() => props.revenueData.length > 0)

const maxRevenue = computed(() => {
  return Math.max(...props.revenueData.map(item => item.revenue))
})

const maxOrders = computed(() => {
  return Math.max(...props.revenueData.map(item => item.orders))
})

const maxEnergy = computed(() => {
  return Math.max(...props.revenueData.map(item => item.energy))
})

const totalRevenue = computed(() => {
  return props.revenueData.reduce((sum, item) => sum + item.revenue, 0)
})

const totalOrders = computed(() => {
  return props.revenueData.reduce((sum, item) => sum + item.orders, 0)
})

const totalEnergy = computed(() => {
  return props.revenueData.reduce((sum, item) => sum + item.energy, 0)
})

// 格式化函数
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatEnergy = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}
</script>
