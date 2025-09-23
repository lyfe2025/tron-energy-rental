<template>
  <div v-if="currentNetwork" class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-3">
          <div class="relative">
            <div class="w-3 h-3 rounded-full" :class="currentNetwork.is_active ? 'bg-green-500' : 'bg-red-500'"></div>
            <div v-if="currentNetwork.is_active" class="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-lg font-medium text-gray-800">当前网络:</span>
            <!-- 荧光笔效果的网络名称 -->
            <div class="relative inline-block">
              <div class="absolute inset-0 bg-yellow-300 opacity-25 rounded transform -skew-x-12"></div>
              <span class="relative text-lg font-semibold text-red-600 px-2 py-1 bg-yellow-100 bg-opacity-50 rounded border-l-4 border-yellow-400">
                {{ currentNetwork.name }}
              </span>
            </div>
          </div>
        </div>
        <div class="hidden md:flex items-center space-x-2">
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span class="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border">
              {{ currentNetwork.rpc_url }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <div v-if="currentNetwork.is_active" class="flex items-center space-x-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
          <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span>连接正常</span>
        </div>
        <button
          @click="$emit('toggleNetworkSwitcher')"
          class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          切换网络
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NetworkStoreNetwork } from '../types/index.ts';

// Props
defineProps<{
  currentNetwork?: NetworkStoreNetwork | null;
}>();

// Events
defineEmits<{
  toggleNetworkSwitcher: [];
}>();
</script>
