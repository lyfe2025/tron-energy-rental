<template>
  <!-- 错误提示 -->
  <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
    <div class="flex items-start">
      <svg class="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <div class="flex-1">
        <div class="text-red-800 font-medium mb-1">操作失败</div>
        <p class="text-red-700 text-sm leading-relaxed">{{ error }}</p>
        <div class="mt-3 flex items-center space-x-3">
          <button 
            @click="$emit('retry')" 
            class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
          >
            重试
          </button>
          <button 
            @click="$emit('close')" 
            class="text-xs text-red-600 hover:text-red-800 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
defineProps<{
  error?: string | null
}>()

// Events
defineEmits<{
  retry: []
  close: []
}>()
</script>
