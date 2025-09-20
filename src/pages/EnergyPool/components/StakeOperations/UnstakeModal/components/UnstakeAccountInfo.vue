<!--
  解锁账户信息组件
-->
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">解质押账户</label>
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ accountAddress || '选择的账户地址' }}
          </p>
          <p class="text-xs text-gray-500">从该账户解质押资源</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  accountAddress?: string
}

defineProps<Props>()
</script>
