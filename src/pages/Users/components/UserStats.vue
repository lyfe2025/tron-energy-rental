<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
    <div 
      v-for="stat in userStats" 
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
          <p v-if="stat.change" :class="['text-sm', stat.changeColor]">{{ stat.change }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 统计卡片接口
interface StatCard {
  label: string
  value: string | number
  icon: any
  bgColor: string
  iconColor: string
  change?: string
  changeColor?: string
}

interface Props {
  userStats: StatCard[]
}

defineProps<Props>()
</script>