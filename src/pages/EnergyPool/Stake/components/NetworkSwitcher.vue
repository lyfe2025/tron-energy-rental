<template>
  <!-- 网络切换模态框 -->
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">选择网络</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="space-y-2">
          <div
            v-for="network in availableNetworks"
            :key="network.id"
            @click="$emit('switchNetwork', network.id)"
            class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': network.id === currentNetworkId }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div :class="getNetworkIconClass(network.id)" class="w-8 h-8 rounded-full flex items-center justify-center">
                  <span class="text-sm font-bold text-white">{{ getNetworkIcon(network.id) }}</span>
                </div>
                <div>
                  <h4 class="font-medium text-gray-900">{{ network.name }}</h4>
                  <p class="text-sm text-gray-500">{{ network.rpc_url }}</p>
                </div>
              </div>
              <span :class="getNetworkStatusClass(network.is_active ? 'active' : 'inactive')" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ getNetworkStatusText(network.is_active ? 'active' : 'inactive') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 使用网络store的实际类型
import type { TronNetwork } from '@/types/network';
type NetworkStoreNetwork = TronNetwork

// Props
defineProps<{
  show: boolean
  availableNetworks: NetworkStoreNetwork[]
  currentNetworkId: string
  getNetworkIcon: (networkId: string) => string
  getNetworkIconClass: (networkId: string) => string
  getNetworkStatusClass: (status: string) => string
  getNetworkStatusText: (status: string) => string
}>()

// Events
defineEmits<{
  close: []
  switchNetwork: [networkId: string]
}>()
</script>
