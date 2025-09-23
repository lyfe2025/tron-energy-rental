<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    <div 
      v-for="stat in orderStats" 
      :key="stat.label"
      class="bg-white rounded-lg shadow-sm p-6"
    >
      <div class="flex items-center">
        <div :class="['h-12 w-12 rounded-lg flex items-center justify-center', stat.bgColor]">
          <component :is="stat.icon" :class="['h-6 w-6', stat.iconColor]" />
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCheck,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle
} from 'lucide-vue-next';
import { computed } from 'vue';
import type { Order } from '../types/order.types';

interface Props {
  orders: Order[]
}

const props = defineProps<Props>()

// 计算订单统计
const orderStats = computed(() => {
  // 确保orders是一个数组
  const orders = props.orders || []
  const stats = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return [
    {
      label: '待处理',
      value: stats.pending || 0,
      icon: Clock,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    {
      label: '处理中',
      value: stats.processing || 0,
      icon: RefreshCw,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      label: '已完成',
      value: stats.completed || 0,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      label: '已手动补单',
      value: stats.manually_completed || 0,
      icon: CheckCheck,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      label: '失败/取消',
      value: (stats.failed || 0) + (stats.cancelled || 0),
      icon: XCircle,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600'
    }
  ]
})
</script>