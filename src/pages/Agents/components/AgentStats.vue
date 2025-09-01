<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    <div
      v-for="stat in statCards"
      :key="stat.label"
      class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            {{ formatValue(stat.value) }}
          </p>
        </div>
        <div :class="[stat.bgColor, 'p-3 rounded-lg']">
          <component :is="stat.icon" :class="[stat.iconColor, 'w-6 h-6']" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  ShoppingCart,
  TrendingUp
} from 'lucide-vue-next';
import type { StatCard } from '@/pages/Agents/types';

interface Props {
  stats: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    totalCommission: number;
    totalUsers: number;
  } | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

// 统计卡片配置
const statCards = computed<StatCard[]>(() => {
  if (!props.stats) {
    return [
      {
        label: '总代理商',
        value: 0,
        icon: Users,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600'
      },
      {
        label: '活跃代理商',
        value: 0,
        icon: UserCheck,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600'
      },
      {
        label: '非活跃',
        value: 0,
        icon: UserX,
        bgColor: 'bg-orange-100',
        iconColor: 'text-orange-600'
      },
      {
        label: '总佣金',
        value: 0,
        icon: DollarSign,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600'
      }
    ];
  }

  return [
    {
      label: '总代理商',
      value: props.stats.total,
      icon: Users,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      label: '活跃代理商',
      value: props.stats.active,
      icon: UserCheck,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      label: '非活跃',
      value: props.stats.inactive,
      icon: UserX,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      label: '总佣金',
      value: props.stats.totalCommission,
      icon: DollarSign,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    }
  ];
});

// 格式化数值显示
const formatValue = (value: string | number | null | undefined): string => {
  // 处理空值
  if (value === null || value === undefined) {
    return '0';
  }
  
  if (typeof value === 'string') return value;
  
  // 如果是收益金额，格式化为货币
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toString();
};
</script>