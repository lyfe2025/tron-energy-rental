<!--
  交易确认弹窗头部组件
  显示网络和账户信息
-->
<template>
  <!-- 头部 -->
  <div class="px-6 py-4 border-b border-gray-200">
    <h3 class="text-lg font-semibold text-center text-gray-900">确认交易信息</h3>
  </div>

  <!-- 网络和账户信息 -->
  <div class="px-6 pt-6">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-blue-600 font-medium">{{ displayAccountName }}</div>
        <div class="text-xs text-gray-500 mt-1">{{ networkName }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  displayAccountName: string
  networkName: string
}

defineProps<Props>()
</script>
