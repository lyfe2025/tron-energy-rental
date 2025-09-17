<!--
  代理资源说明组件
-->
<template>
  <div class="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>
      <div>
        <h4 class="text-sm font-medium text-green-900 mb-1">资源代理说明</h4>
        <p class="text-xs text-green-700">
          将您已质押的资源代理给他人使用。代理期间，您仍然保有TRX的所有权，但受托人可以使用相应的{{ resourceType === 'ENERGY' ? '能量' : '带宽' }}资源。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  resourceType: 'ENERGY' | 'BANDWIDTH'
}

defineProps<Props>()
</script>
