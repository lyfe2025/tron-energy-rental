<template>
  <div>
    <!-- 当前选中账户信息 -->
    <div v-if="selectedAccount" class="mb-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Wallet class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ selectedAccount.name }}</h3>
              <p class="text-sm text-gray-500">{{ formatAddress(selectedAccount.tron_address) }}</p>
              <div class="flex items-center space-x-2 mt-1">
                <span class="text-xs text-gray-600">总能量: {{ formatEnergy(selectedAccount.total_energy) }}</span>
                <span class="text-xs text-gray-400">|</span>
                <span class="text-xs text-gray-600">可用能量: {{ formatEnergy(selectedAccount.available_energy) }}</span>
              </div>
            </div>
          </div>
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

    <!-- 网络状态栏 -->
    <div v-if="currentNetwork" class="mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 rounded-full" :class="currentNetwork.is_active ? 'bg-green-500' : 'bg-red-500'"></div>
              <span class="text-lg font-medium text-gray-900">当前网络: {{ currentNetwork.name }}</span>
            </div>
            <div class="text-sm text-gray-500">
              {{ currentNetwork.rpc_url }}
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="$emit('toggleNetworkSwitcher')"
              class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              切换网络
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 质押概览卡片 -->
    <div v-if="overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- 能量总质押 TRX -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">能量总质押 TRX</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.totalStakedEnergyTrx) }}</p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 带宽总质押 TRX -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">带宽总质押 TRX</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.totalStakedBandwidthTrx) }}</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 解锁中 TRX -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">解锁中 TRX</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.unlockingTrx) }}</p>
          </div>
          <div class="p-3 bg-yellow-100 rounded-full">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 待提取 TRX -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">待提取 TRX</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.withdrawableTrx) }}</p>
          </div>
          <div class="p-3 bg-purple-100 rounded-full">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 质押获得能量 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">质押获得能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(overview.stakedEnergy) }}</p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 代理给他人能量 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">代理给他人能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(overview.delegatedToOthersEnergy) }}</p>
          </div>
          <div class="p-3 bg-indigo-100 rounded-full">
            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 代理给自己能量 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">代理给自己能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(overview.delegatedToSelfEnergy) }}</p>
          </div>
          <div class="p-3 bg-teal-100 rounded-full">
            <svg class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m6 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 质押获得带宽 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">质押获得带宽</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatBandwidth(overview.stakedBandwidth) }}</p>
          </div>
          <div class="p-3 bg-orange-100 rounded-full">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 代理给他人带宽 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">代理给他人带宽</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatBandwidth(overview.delegatedToOthersBandwidth) }}</p>
          </div>
          <div class="p-3 bg-pink-100 rounded-full">
            <svg class="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 代理给自己带宽 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">代理给自己带宽</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatBandwidth(overview.delegatedToSelfBandwidth) }}</p>
          </div>
          <div class="p-3 bg-cyan-100 rounded-full">
            <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m6 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI';
// 使用网络store的实际类型
import type { Network } from '@/stores/network';
import { ChevronDown, Wallet } from 'lucide-vue-next';
type NetworkStoreNetwork = Network

// Props
defineProps<{
  selectedAccount?: EnergyPoolAccount | null
  currentNetwork?: NetworkStoreNetwork | null
  overview?: any
  formatTrx: (value: any) => string
  formatEnergy: (value: any) => string
  formatBandwidth: (value: any) => string
  formatAddress: (address: string) => string
}>()

// Events
defineEmits<{
  switchAccount: []
  toggleNetworkSwitcher: []
}>()
</script>
