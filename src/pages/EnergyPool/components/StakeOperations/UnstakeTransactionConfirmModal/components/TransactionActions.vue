<!--
  交易操作按钮组件
-->
<template>
  <div class="p-6 border-t border-gray-200">
    <div class="flex space-x-4">
      <button
        @click="$emit('reject')"
        :disabled="loading"
        class="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium disabled:opacity-50"
      >
        取消
      </button>
      <button
        @click="$emit('confirm')"
        :disabled="loading"
        class="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center"
      >
        <span v-if="loading" class="flex items-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          解锁中...
        </span>
        <span v-else>解锁并提取</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  loading: boolean
}

interface Emits {
  confirm: []
  reject: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>
