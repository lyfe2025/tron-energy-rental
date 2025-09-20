<!--
  待提取解锁资源显示组件
-->
<template>
  <div v-if="withdrawableAmount > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
    <div class="flex items-center space-x-2">
      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-sm font-medium text-green-800">
        同时提取 {{ formatTrxAmount(withdrawableAmount) }} TRX 质押本金
      </span>
    </div>
    <p class="text-xs text-green-700 mt-1">解锁期已到，可立即提取到钱包</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  withdrawableAmount: number
  formatTrxAmount: (amount: number) => string
}

defineProps<Props>()
</script>
