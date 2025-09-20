<template>
  <div class="bg-white rounded-lg shadow p-4 mb-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <div 
            class="w-3 h-3 rounded-full" 
            :class="currentNetwork?.is_active ? 'bg-green-500' : 'bg-red-500'"
          ></div>
          <span class="text-lg font-medium text-gray-900">
            当前网络: {{ currentNetwork?.name || '未知网络' }}
          </span>
        </div>
        <div class="text-sm text-gray-500">
          {{ currentNetwork?.rpc_url || '网络描述' }}
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="handleSwitchNetwork"
          class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          切换网络
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Network {
  id: string
  name: string
  type?: string
  rpc_url: string
  is_active: boolean
  health_status?: string
}

interface Props {
  currentNetwork: Network | null
}

interface Emits {
  (e: 'switchNetwork'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleSwitchNetwork = () => {
  emit('switchNetwork')
}
</script>
