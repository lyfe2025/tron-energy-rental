<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    <div
      v-for="stat in botStats"
      :key="stat.label"
      class="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ stat.value }}</p>
          <p v-if="stat.change" :class="stat.changeColor" class="text-sm mt-1">
            {{ stat.change }}
          </p>
        </div>
        <div :class="[stat.bgColor, 'p-3 rounded-lg']">
          <component :is="stat.icon" :class="stat.iconColor" class="w-6 h-6" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BotStats } from '../types/bot.types'

interface Props {
  botStats: BotStats[]
}

defineProps<Props>()
</script>