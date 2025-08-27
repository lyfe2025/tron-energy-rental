<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            {{ formatNumber(stat.value) }}
          </p>
          <div v-if="stat.change !== null" class="flex items-center mt-2">
            <span :class="stat.changeColor" class="text-sm font-medium">
              {{ stat.change > 0 ? '+' : '' }}{{ stat.change }}%
            </span>
          </div>
        </div>
        <div :class="stat.bgColor" class="p-3 rounded-lg">
          <component :is="stat.icon" :class="stat.iconColor" class="h-6 w-6" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BarChart3,
  Package,
  ShoppingCart,
  Zap
} from 'lucide-vue-next'
import { computed } from 'vue'
import type { EnergyPackage } from '@/types/api'

interface PackageStat {
  label: string
  value: number
  icon: any
  bgColor: string
  iconColor: string
  change: number | null
  changeColor: string
}

interface Props {
  packages: EnergyPackage[]
}

const props = defineProps<Props>()

// 计算统计数据
const stats = computed<PackageStat[]>(() => {
  const totalPackages = props.packages.length
  const activePackages = props.packages.filter(p => p.status === 'active').length
  const todaySales = props.packages.reduce((sum, p) => sum + (p.today_sales || 0), 0)
  const totalSales = props.packages.reduce((sum, p) => sum + (p.sales_count || 0), 0)
  
  return [
    {
      label: '总能量包',
      value: totalPackages,
      icon: Package,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: null,
      changeColor: ''
    },
    {
      label: '启用中',
      value: activePackages,
      icon: Zap,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      change: null,
      changeColor: ''
    },
    {
      label: '今日销量',
      value: todaySales,
      icon: ShoppingCart,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      change: null,
      changeColor: ''
    },
    {
      label: '总销量',
      value: totalSales,
      icon: BarChart3,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      change: null,
      changeColor: ''
    }
  ]
})

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString('zh-CN')
}
</script>