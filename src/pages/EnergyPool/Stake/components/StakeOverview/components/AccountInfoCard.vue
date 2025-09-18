<template>
  <div v-if="selectedAccount" class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <div class="relative">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Wallet class="w-6 h-6 text-blue-600" />
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div>
          <div class="flex items-center space-x-2 mb-1">
            <h3 class="text-lg font-semibold text-gray-900">{{ selectedAccount.name }}</h3>
            <span class="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
              活跃
            </span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded border">
              {{ selectedAccount.tron_address }}
            </span>
            <button
              @click="handleCopyAddress"
              class="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              :title="copySuccess ? '已复制!' : '复制地址'"
            >
              <svg v-if="!copySuccess" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <svg v-else class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
          <!-- 能量和带宽信息 - 两行布局 -->
          <div class="space-y-2 mt-2">
            <!-- 第一行：能量信息 -->
            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-700">总能量: 
                  <span class="font-semibold text-orange-600">
                    {{ formatEnergy(realTimeAccountData.realTimeData.value?.energy.total || selectedAccount.total_energy) }}
                  </span>
                </span>
              </div>
              <span class="text-gray-300">|</span>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-700">可用能量: 
                  <span class="font-semibold text-blue-600">
                    {{ formatEnergy(realTimeAccountData.realTimeData.value?.energy.available || selectedAccount.available_energy) }}
                  </span>
                </span>
              </div>
            </div>
            
            <!-- 第二行：带宽信息 -->
            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-700">总带宽: 
                  <span class="font-semibold text-purple-600">
                    {{ formatBandwidth(realTimeAccountData.realTimeData.value?.bandwidth.total || 0) }}
                  </span>
                </span>
              </div>
              <span class="text-gray-300">|</span>
              <div class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                <span class="text-sm text-gray-700">可用带宽: 
                  <span class="font-semibold text-pink-600">
                    {{ formatBandwidth(realTimeAccountData.realTimeData.value?.bandwidth.available || 0) }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button
          @click="$emit('refreshData')"
          :disabled="realTimeAccountData.loading.value"
          class="flex items-center space-x-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 bg-blue-50 rounded-lg transition-colors"
        >
          <RefreshCw :class="{ 'animate-spin': realTimeAccountData.loading.value }" class="w-4 h-4" />
          <span>{{ realTimeAccountData.loading.value ? '刷新中...' : '刷新' }}</span>
        </button>
        <button
          @click="$emit('switchAccount')"
          class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
        >
          <span>切换账户</span>
          <ChevronDown class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI';
import { ChevronDown, RefreshCw, Wallet } from 'lucide-vue-next';
import { useCopyAddress } from '../composables/useCopyAddress.js';

// Props
const props = defineProps<{
  selectedAccount?: EnergyPoolAccount | null;
  realTimeAccountData: any;
  formatEnergy: (value: any) => string;
  formatBandwidth: (value: any) => string;
}>();

// Events
defineEmits<{
  switchAccount: [];
  refreshData: [];
}>();

// 复制功能
const { copySuccess, copyAddress } = useCopyAddress();

// 复制地址处理函数
const handleCopyAddress = async () => {
  if (props.selectedAccount?.tron_address) {
    await copyAddress(props.selectedAccount.tron_address);
  }
};
</script>
