<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- 总收入 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <DollarSign class="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-600">总收入</p>
          <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(overview.totalRevenue) }}</p>
          <div class="flex items-center mt-1">
            <TrendingUp v-if="overview.growthRate > 0" class="w-4 h-4 text-green-600 mr-1" />
            <TrendingDown v-else-if="overview.growthRate < 0" class="w-4 h-4 text-red-600 mr-1" />
            <span :class="getGrowthColor(overview.growthRate)" class="text-sm">
              {{ formatPercentage(Math.abs(overview.growthRate)) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 总订单数 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <ShoppingCart class="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-600">总订单数</p>
          <p class="text-2xl font-bold text-gray-900">{{ formatNumber(overview.totalOrders) }}</p>
          <div class="flex items-center mt-1">
            <span class="text-sm text-gray-500">
              平均: {{ formatCurrency(overview.averageOrderValue) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 总用户数 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users class="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-600">总用户数</p>
          <p class="text-2xl font-bold text-gray-900">{{ formatNumber(overview.totalUsers) }}</p>
          <div class="flex items-center mt-1">
            <span class="text-sm text-gray-500">
              活跃: {{ formatNumber(overview.activeUsers) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 能量租赁总量 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Zap class="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-600">能量租赁总量</p>
          <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(overview.totalEnergyRented) }}</p>
          <div class="flex items-center mt-1">
            <span class="text-sm text-gray-500">
              转化率: {{ formatPercentage(overview.conversionRate) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DollarSign, ShoppingCart, TrendingDown, TrendingUp, Users, Zap } from 'lucide-vue-next'
import type { StatisticsOverview } from '../types/statistics.types'

interface Props {
  overview: StatisticsOverview
  formatCurrency: (value: number) => string
  formatNumber: (value: number) => string
  formatPercentage: (value: number) => string
  getGrowthColor: (value: number) => string
}

defineProps<Props>()

// 格式化能量数值 - 直观显示，无小数点
const formatEnergy = (value: number) => {
  // 检查value是否为有效数字
  if (value == null || isNaN(value) || typeof value !== 'number') {
    return '0'
  }
  
  // 直接显示完整数字，不使用K/M后缀，不显示小数点
  return Math.floor(value).toLocaleString('zh-CN')
}
</script>
