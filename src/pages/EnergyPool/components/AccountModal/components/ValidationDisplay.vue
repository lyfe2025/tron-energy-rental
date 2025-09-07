<template>
  <div v-if="address && privateKey" class="bg-gray-50 p-4 rounded-lg">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium text-gray-700">TRON账户信息</h4>
      <button
        type="button"
        @click="onRefresh"
        :disabled="fetchingTronData"
        class="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
      >
        <Loader2 v-if="fetchingTronData" class="w-3 h-3 animate-spin" />
        <span>{{ fetchingTronData ? '获取中...' : '获取账户信息' }}</span>
      </button>
    </div>
    
    <div v-if="tronData" class="space-y-2 text-xs">
      <!-- 网络信息 -->
      <div v-if="tronData.networkInfo" class="bg-blue-50 p-2 rounded mb-2">
        <div class="flex justify-between">
          <span class="text-blue-600 font-medium">当前网络:</span>
          <span class="font-medium text-blue-800">{{ tronData.networkInfo.name }} ({{ getNetworkTypeText(tronData.networkInfo.type) }})</span>
        </div>
      </div>
      
      <!-- 余额信息 -->
      <div class="border-b pb-2">
        <div class="flex justify-between mb-1">
          <span class="text-gray-600">TRX余额:</span>
          <span class="font-medium">{{ (tronData.balance / 1000000).toFixed(6) }} TRX</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">USDT余额:</span>
          <div class="flex items-center space-x-1">
            <span class="font-medium" :class="tronData.usdtInfo?.error ? 'text-gray-500' : 'text-gray-900'">
              {{ tronData.usdtBalance ? tronData.usdtBalance.toFixed(6) : '0.000000' }} USDT
            </span>
            <span v-if="tronData.usdtInfo?.error" 
              class="text-xs text-orange-600 cursor-help" 
              :title="tronData.usdtInfo.error">
              ⚠️
            </span>
          </div>
        </div>
      </div>
      
      <!-- 能量信息 -->
      <div class="border-b pb-2">
        <div class="flex justify-between mb-1">
          <span class="text-gray-600">总能量:</span>
          <span class="font-medium">{{ tronData.energy.total.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">可用能量:</span>
          <span class="font-medium">{{ tronData.energy.available.toLocaleString() }}</span>
        </div>
      </div>
      
      <!-- 带宽信息 -->
      <div class="border-b pb-2">
        <div class="flex justify-between mb-1">
          <span class="text-gray-600">总带宽:</span>
          <span class="font-medium">{{ tronData.bandwidth.total.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">可用带宽:</span>
          <span class="font-medium">{{ tronData.bandwidth.available.toLocaleString() }}</span>
        </div>
      </div>
      
      <!-- 成本信息 -->
      <div>
        <div class="flex justify-between">
          <span class="text-gray-600">预估单位成本:</span>
          <span class="font-medium">{{ tronData.estimatedCostPerEnergy.toFixed(6) }} TRX</span>
        </div>
      </div>
    </div>
    
    <div v-if="tronDataError" class="text-xs text-red-600 mt-2">
      {{ tronDataError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { getNetworkTypeText } from '@/utils/network'
import { Loader2 } from 'lucide-vue-next'
import type { TronData } from '../types/account-modal.types'

interface Props {
  address: string
  privateKey: string
  tronData: TronData | null
  tronDataError: string
  fetchingTronData: boolean
}

interface Emits {
  refresh: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const onRefresh = () => {
  emit('refresh')
}
</script>
