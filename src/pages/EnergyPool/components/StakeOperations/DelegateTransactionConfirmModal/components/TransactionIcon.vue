<!--
  交易类型图标组件
  显示交易类型和基本描述
-->
<template>
  <!-- 交易类型图标 -->
  <div class="flex justify-center px-6">
    <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
      <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
      </svg>
    </div>
  </div>

  <!-- 交易详情 -->
  <div class="text-center space-y-2 px-6">
    <div class="text-xl font-semibold text-gray-900">资源代理</div>
    <div class="text-2xl font-bold text-gray-900">
      代理 {{ formatAmount(amount) }} {{ resourceType === 'ENERGY' ? '能量' : '带宽' }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  amount: string
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

const props = defineProps<Props>()

const formatAmount = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return Math.round(num).toLocaleString()
}
</script>
