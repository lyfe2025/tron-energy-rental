<!--
  代理预览组件
-->
<template>
  <div v-if="shouldShowPreview" class="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
    <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
      <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      代理预览
    </h4>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between items-center">
        <span class="text-gray-600">代理{{ resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
        <span class="font-semibold text-lg text-green-700">
          {{ parseFloat(amount).toLocaleString() }}
        </span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-600">接收方:</span>
        <span class="font-medium text-gray-900 text-xs font-mono break-all">
          {{ receiverAddress }}
        </span>
      </div>
              <div v-if="enableLockPeriod && lockPeriod" class="flex justify-between items-center">
                <span class="text-gray-600">代理期限:</span>
                <span class="font-medium text-blue-700">{{ lockPeriod }}小时</span>
              </div>
              <div v-if="!enableLockPeriod" class="flex justify-between items-center">
                <span class="text-gray-600">代理期限:</span>
                <span class="font-medium text-green-700">永久代理</span>
              </div>
    </div>
    <div class="mt-3 pt-3 border-t border-green-200">
      <div class="space-y-1 text-xs text-gray-600 leading-relaxed">
        <p>
          <span class="text-orange-600 font-medium">重要提醒:</span> 
          <span v-if="enableLockPeriod">代理期间资源将被锁定，无法提前收回，请谨慎确认代理数量和期限。</span>
          <span v-else>永久代理模式，可随时撤回代理的资源，请谨慎确认代理数量。</span>
        </p>
        <p class="text-blue-600">
          <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span v-if="enableLockPeriod">确保接收方地址准确无误，代理后无法撤销变更</span>
          <span v-else>确保接收方地址准确无误，代理生效后可随时撤回</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  amount: string
  receiverAddress: string
  resourceType: 'ENERGY' | 'BANDWIDTH'
  enableLockPeriod: boolean
  lockPeriod?: number
}

const props = defineProps<Props>()

// 计算是否应该显示预览
const shouldShowPreview = computed(() => {
  return props.amount && 
         props.receiverAddress && 
         parseFloat(props.amount) > 0
})
</script>
