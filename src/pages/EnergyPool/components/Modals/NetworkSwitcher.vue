<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">切换网络</h3>
      <div class="space-y-3 mb-6">
        <div
          v-for="network in availableNetworks"
          :key="network.id"
          @click="handleNetworkSelect(network.id)"
          class="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
          :class="network.id === currentNetworkId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
        >
          <div class="flex items-center space-x-3">
            <div class="w-3 h-3 rounded-full" :class="network.is_active ? 'bg-green-500' : 'bg-red-500'"></div>
            <div>
              <div class="font-medium text-gray-900">{{ network.name }}</div>
              <div class="text-sm text-gray-500">{{ network.rpc_url }}</div>
            </div>
          </div>
          <div v-if="network.id === currentNetworkId" class="text-blue-600">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <div class="flex justify-end space-x-3">
        <button
          @click="handleClose"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Network {
  id: string
  name: string
  type: string
  rpc_url: string
  is_active: boolean
  health_status?: string
}

interface Props {
  visible: boolean
  availableNetworks: Network[]
  currentNetworkId: string
}

interface Emits {
  (e: 'close'): void
  (e: 'networkSelected', networkId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleClose = () => {
  emit('close')
}

const handleNetworkSelect = (networkId: string) => {
  emit('networkSelected', networkId)
  handleClose()
}
</script>
