<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div
      v-for="stat in priceStats"
      :key="stat.label"
      class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div class="flex items-center">
        <div :class="['w-12 h-12 rounded-lg flex items-center justify-center', stat.bgColor]">
          <component :is="stat.icon" :class="['w-6 h-6', stat.iconColor]" />
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
          <p v-if="stat.change" :class="['text-sm', stat.changeColor]">
            {{ stat.change }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PriceStats } from '../types/pricing.types';

interface Props {
  priceStats: PriceStats[]
}

defineProps<Props>()
</script>
