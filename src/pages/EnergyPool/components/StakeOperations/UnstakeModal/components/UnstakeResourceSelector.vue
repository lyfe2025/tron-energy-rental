<!--
  解锁资源类型选择器组件
-->
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-3">请选择需要解锁的TRX</label>
    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        @click="$emit('update:resourceType', 'ENERGY')"
        :class="[
          'p-4 border-2 rounded-lg text-left transition-all duration-200',
          modelValue === 'ENERGY'
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        ]"
      >
        <div class="flex items-center mb-2">
          <svg class="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span class="font-medium text-gray-900">能量+投票权</span>
        </div>
        <div class="text-sm font-semibold text-gray-700">
          可解锁 {{ energyStaked }} TRX
        </div>
      </button>
      
      <button
        type="button"
        @click="$emit('update:resourceType', 'BANDWIDTH')"
        :class="[
          'p-4 border-2 rounded-lg text-left transition-all duration-200',
          modelValue === 'BANDWIDTH'
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        ]"
      >
        <div class="flex items-center mb-2">
          <svg class="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span class="font-medium text-gray-900">带宽+投票权</span>
        </div>
        <div class="text-sm font-semibold text-gray-700">
          可解锁 {{ bandwidthStaked }} TRX
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourceType } from '../types'

interface Props {
  modelValue: ResourceType
  energyStaked: string
  bandwidthStaked: string
}

interface Emits {
  'update:resourceType': [value: ResourceType]
}

defineProps<Props>()
defineEmits<Emits>()
</script>
