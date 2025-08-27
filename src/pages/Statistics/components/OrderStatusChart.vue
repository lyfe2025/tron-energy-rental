<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">订单状态分布</h3>
        <p class="text-sm text-gray-500">查看不同状态订单的分布情况</p>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <span class="ml-3 text-gray-600">加载数据...</span>
    </div>

    <div v-else-if="!hasData" class="flex items-center justify-center h-64">
      <div class="text-center">
        <PieChart class="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p class="text-gray-500">暂无订单数据</p>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- 简化的饼图展示 -->
      <div class="flex items-center justify-center">
        <div class="relative w-48 h-48">
          <!-- 圆形进度条样式的饼图 -->
          <svg class="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              v-for="(item, index) in orderStatusData"
              :key="item.status"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              :stroke="item.color"
              :stroke-width="getStrokeWidth(index)"
              :stroke-dasharray="getStrokeDasharray(item.percentage)"
              :stroke-dashoffset="getStrokeDashoffset(index)"
              class="transition-all duration-300 hover:stroke-width-6"
            />
          </svg>
          
          <!-- 中心文字 -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <p class="text-2xl font-bold text-gray-900">{{ totalOrders }}</p>
              <p class="text-sm text-gray-500">总订单</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态列表 -->
      <div class="space-y-3">
        <div
          v-for="item in orderStatusData"
          :key="item.status"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <div
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: item.color }"
            ></div>
            <span class="font-medium text-gray-900">{{ item.status }}</span>
          </div>
          <div class="text-right">
            <p class="font-bold text-gray-900">{{ formatNumber(item.count) }}</p>
            <p class="text-sm text-gray-500">{{ formatPercentage(item.percentage) }}</p>
          </div>
        </div>
      </div>

      <!-- 状态变化趋势 -->
      <div class="pt-4 border-t border-gray-200">
        <h4 class="font-medium text-gray-900 mb-3">本周状态变化</h4>
        <div class="space-y-2">
          <div
            v-for="trend in statusTrends"
            :key="trend.status"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-gray-600">{{ trend.status }}</span>
            <div class="flex items-center space-x-2">
              <component
                :is="trend.change > 0 ? TrendingUp : trend.change < 0 ? TrendingDown : Minus"
                :class="[
                  'w-4 h-4',
                  trend.change > 0 ? 'text-green-600' : trend.change < 0 ? 'text-red-600' : 'text-gray-400'
                ]"
              />
              <span
                :class="[
                  'font-medium',
                  trend.change > 0 ? 'text-green-600' : trend.change < 0 ? 'text-red-600' : 'text-gray-600'
                ]"
              >
                {{ trend.change > 0 ? '+' : '' }}{{ trend.change }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="pt-4 border-t border-gray-200">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="status in quickActions"
            :key="status.key"
            @click="$emit('filterByStatus', status.key)"
            class="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
          >
            查看{{ status.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Minus, PieChart, TrendingDown, TrendingUp } from 'lucide-vue-next'
import { computed } from 'vue'
import type { OrderStatusData } from '../types/statistics.types'

interface Props {
  orderStatusData: OrderStatusData[]
  isLoading: boolean
  formatNumber: (value: number) => string
  formatPercentage: (value: number) => string
}

interface Emits {
  (e: 'filterByStatus', status: string): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// 计算属性
const hasData = computed(() => props.orderStatusData.length > 0)

const totalOrders = computed(() => {
  return props.orderStatusData.reduce((sum, item) => sum + item.count, 0)
})

// 模拟状态变化趋势数据
const statusTrends = computed(() => [
  { status: '已完成', change: 5.2 },
  { status: '进行中', change: -2.1 },
  { status: '待处理', change: 8.7 },
  { status: '已取消', change: -1.3 }
])

const quickActions = [
  { key: 'pending', label: '待处理订单' },
  { key: 'processing', label: '进行中订单' },
  { key: 'failed', label: '失败订单' }
]

// SVG 圆形图表相关计算
const getStrokeWidth = (index: number) => {
  return 5 // 固定宽度
}

const getStrokeDasharray = (percentage: number) => {
  const circumference = 2 * Math.PI * 40 // 半径为40的圆周长
  const strokeLength = (percentage / 100) * circumference
  return `${strokeLength} ${circumference - strokeLength}`
}

const getStrokeDashoffset = (index: number) => {
  const circumference = 2 * Math.PI * 40
  let offset = 0
  
  for (let i = 0; i < index; i++) {
    offset += (props.orderStatusData[i].percentage / 100) * circumference
  }
  
  return -offset
}
</script>
