<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">质押操作</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        @click="$emit('showStake')"
        class="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
      >
        <div class="text-center">
          <svg class="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p class="text-sm font-medium text-blue-600 group-hover:text-blue-700">质押TRX</p>
        </div>
      </button>

      <button
        @click="$emit('showUnstake')"
        class="p-4 border-2 border-dashed border-red-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors group"
      >
        <div class="text-center">
          <svg class="w-8 h-8 text-red-600 mx-auto mb-2 group-hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
          <p class="text-sm font-medium text-red-600 group-hover:text-red-700">解质押TRX</p>
        </div>
      </button>

      <button
        @click="$emit('showDelegate')"
        class="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group"
      >
        <div class="text-center">
          <svg class="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p class="text-sm font-medium text-green-600 group-hover:text-green-700">代理资源</p>
        </div>
      </button>

      <button
        @click="$emit('handleWithdraw')"
        :disabled="!overview?.withdrawableTrx || overview.withdrawableTrx <= 0"
        class="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div class="text-center">
          <svg class="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p class="text-sm font-medium text-purple-600 group-hover:text-purple-700">提取TRX</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
defineProps<{
  overview?: any
}>()

// Events
defineEmits<{
  showStake: []
  showUnstake: []
  showDelegate: []
  handleWithdraw: []
}>()
</script>
