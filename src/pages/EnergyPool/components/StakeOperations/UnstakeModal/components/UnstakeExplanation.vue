<!--
  解锁说明组件
-->
<template>
  <div class="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.662-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div>
        <h4 class="text-sm font-medium text-orange-900 mb-1">解质押说明</h4>
        <p class="text-xs text-orange-700">
          解质押后需要等待{{ unlockPeriodText || '14天' }}才能提取TRX。解质押期间无法获得资源收益。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  unlockPeriodText?: string
}

defineProps<Props>()
</script>
