<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center">
        <Network class="w-5 h-5 mr-2 text-green-600" />
        <span class="font-semibold text-gray-900">网络配置</span>
      </div>
    </div>
    <div class="p-6">
      <NetworkSelector
        :model-value="form.selectedNetwork"
        @update:model-value="$emit('update:form', { ...form, selectedNetwork: $event })"
        label="选择TRON网络"
        description="机器人将在此网络上运行，只能选择一个网络"
        :required="true"
        :searchable="true"
        :filter-active="true"
        placeholder="请选择一个TRON网络"
        @change="handleNetworkChange"
      />
      
      <!-- 网络状态显示 -->
      <div v-if="form.selectedNetwork" class="mt-2">
        <NetworkStatus
          :network-id="form.selectedNetwork"
          :show-details="true"
          :auto-refresh="true"
          :refresh-interval="30"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NetworkSelector from '@/components/NetworkSelector.vue'
import NetworkStatus from '@/components/NetworkStatus.vue'
import type { TronNetwork } from '@/types/network'
import { Network } from 'lucide-vue-next'

// 接口定义
interface BotFormData {
  name: string
  username: string
  token: string
  description: string
  is_active: boolean
  auto_reconnect: boolean
  rate_limit: number
  timeout: number
  webhook_url: string
  selectedNetwork: string | null
}

// Props
defineProps<{
  form: BotFormData
}>()

// Emits
const emit = defineEmits<{
  'update:form': [form: BotFormData]
  'network-change': [network: TronNetwork]
}>()

// Methods
const handleNetworkChange = (network: TronNetwork) => {
  emit('network-change', network)
}
</script>
