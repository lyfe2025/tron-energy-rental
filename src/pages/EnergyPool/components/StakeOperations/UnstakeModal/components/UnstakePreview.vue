<!--
  解锁预览组件
-->
<template>
  <div v-if="amount && parseFloat(amount) > 0" class="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
    <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
      <svg class="w-4 h-4 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      解质押操作预览
    </h4>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between items-center">
        <span class="text-gray-600">解质押数量:</span>
        <span class="font-semibold text-lg text-red-700">
          {{ parseFloat(amount).toLocaleString() }} TRX
        </span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-600">释放{{ resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
        <span class="font-medium text-orange-700">
          {{ formatResource(estimatedResource, resourceType) }}
        </span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-600">资金可提取时间:</span>
        <span class="font-medium text-red-700">
          {{ unlockPeriodText || '14天' }} 后
        </span>
      </div>
    </div>
    <div class="mt-3 pt-3 border-t border-orange-200">
      <p class="text-xs text-gray-600 leading-relaxed">
        <span class="text-red-600">重要提醒:</span> 解质押操作不可逆转，解质押期间将无法获得{{ resourceType === 'ENERGY' ? '能量' : '带宽' }}资源收益。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourceType } from '../types'

interface Props {
  amount: string
  resourceType: ResourceType
  estimatedResource: number
  unlockPeriodText?: string
  formatResource: (amount: number, resourceType: ResourceType) => string
}

defineProps<Props>()
</script>
