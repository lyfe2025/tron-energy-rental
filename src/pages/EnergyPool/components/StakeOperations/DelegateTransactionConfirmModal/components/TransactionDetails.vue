<!--
  交易详细信息组件
  显示代理交易的详细信息
-->
<template>
  <div class="px-6 space-y-4">
    <!-- 代理资源类型 -->
    <div class="flex items-center justify-between py-2">
      <span class="text-gray-600 text-sm">代理资源</span>
      <span class="font-medium text-gray-900">{{ resourceType === 'ENERGY' ? '能量' : '带宽' }}</span>
    </div>

    <!-- 代理数量 -->
    <div class="flex items-center justify-between py-2">
      <span class="text-gray-600 text-sm">代理数量</span>
      <span class="font-medium text-gray-900">{{ formatAmount(amount) }}</span>
    </div>

    <!-- 接收方地址 -->
    <div class="flex flex-col py-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-gray-600 text-sm">接收方地址</span>
        <span class="text-gray-500 text-sm">目标账户</span>
      </div>
      <div class="text-right">
        <div class="font-mono text-sm text-gray-900 break-all">
          {{ receiverAddress }}
        </div>
      </div>
    </div>

    <!-- 代理期限 -->
    <div class="flex items-center justify-between py-2">
      <span class="text-gray-600 text-sm">代理期限</span>
      <span class="font-medium text-gray-900">
        {{ enableLockPeriod ? `${lockPeriod}小时` : '永久代理' }}
      </span>
    </div>

    <!-- 代理方账户 -->
    <div class="flex flex-col py-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-gray-600 text-sm">代理方账户</span>
        <span class="text-gray-500 text-sm">当前账户</span>
      </div>
      <div class="text-right">
        <div class="font-mono text-sm text-gray-900 break-all">
          {{ accountAddress }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  amount: string
  resourceType: 'ENERGY' | 'BANDWIDTH'
  receiverAddress: string
  accountAddress: string
  enableLockPeriod: boolean
  lockPeriod?: number
}

defineProps<Props>()

const formatAmount = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return Math.round(num).toLocaleString()
}
</script>
