<!--
  代理中资源显示组件
-->
<template>
  <div v-if="delegatingAmount > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span class="text-sm font-medium text-blue-800">正在代理中资源</span>
        <button class="text-xs text-blue-600 hover:text-blue-700 underline" title="代理中的资源需要通过「取消代理」操作来取回">
          ?
        </button>
      </div>
      <div class="text-sm font-semibold text-blue-900">
        {{ formatTrxAmount(delegatingAmount) }} TRX
      </div>
    </div>
    <div class="mt-2 text-xs text-blue-700">
      <div class="flex justify-between">
        <span>• 能量代理: {{ formatTrxAmount(energyDelegatedOut) }} TRX</span>
        <span>• 带宽代理: {{ formatTrxAmount(bandwidthDelegatedOut) }} TRX</span>
      </div>
      <div class="mt-1 text-xs text-blue-600 italic">
        💡 代理中的资源需要通过「取消代理」操作来取回，不能直接解质押
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  delegatingAmount: number
  energyDelegatedOut: number
  bandwidthDelegatedOut: number
  formatTrxAmount: (amount: number) => string
}

defineProps<Props>()
</script>
