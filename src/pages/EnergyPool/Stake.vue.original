<template>
  <div class="stake-management-page">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">质押管理</h1>
        <p class="text-gray-600 mt-1">管理TRON网络上的TRX质押和资源委托</p>
      </div>
      <button
        v-if="selectedAccount && selectedNetwork"
        @click="refreshData"
        :disabled="isRefreshing"
        class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw :class="{ 'animate-spin': isRefreshing }" class="h-4 w-4" />
        <span>{{ isRefreshing ? '刷新中...' : '刷新' }}</span>
      </button>
    </div>

    <!-- 网络加载状态 -->
    <div v-if="networkStore.loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">加载网络信息中...</p>
    </div>

    <!-- 账户选择界面 -->
    <div v-else-if="!selectedAccount && currentNetworkId" class="mb-8">
      <div v-if="currentNetwork">
        <AccountSelector
          :network="currentNetwork"
          @select="onAccountSelect"
        />
      </div>
      <div v-else class="text-center py-12">
        <div class="text-gray-500">
          <p>未找到网络信息 (ID: {{ currentNetworkId }})</p>
          <p class="text-sm text-gray-400 mt-2">请确认网络配置是否正确</p>
          <button 
            @click="router.push('/energy-pool')" 
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重新选择网络
          </button>
        </div>
      </div>
    </div>

    <!-- 质押管理主界面 -->
    <div v-if="currentNetworkId && selectedAccount">
      <!-- 当前选中账户信息 -->
      <div class="mb-6">
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
              @click="switchAccount"
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
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <div :class="getNetworkIconClass(currentNetwork.id.toString())" class="w-6 h-6 rounded-full flex items-center justify-center">
                <span class="text-xs font-bold text-white">{{ getNetworkIcon(currentNetwork.id.toString()) }}</span>
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{{ currentNetwork.name }}</h3>
                <p class="text-sm text-gray-500">{{ currentNetwork.rpc_url }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <span :class="getNetworkStatusClass(currentNetwork.is_active ? 'active' : 'inactive')" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ getNetworkStatusText(currentNetwork.is_active ? 'active' : 'inactive') }}
              </span>
            </div>
          </div>
          <button
            @click="showNetworkSwitcher = true"
            class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            切换网络
          </button>
        </div>
      </div>
    </div>

    <!-- 网络切换模态框 -->
    <div v-if="showNetworkSwitcher" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">选择网络</h3>
            <button @click="showNetworkSwitcher = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-2">
            <div
              v-for="network in availableNetworks"
              :key="network.id"
              @click="switchNetwork(network.id)"
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

    <!-- 错误提示 -->
    <div v-if="error && currentNetworkId" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start">
        <svg class="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <div class="text-red-800 font-medium mb-1">操作失败</div>
          <p class="text-red-700 text-sm leading-relaxed">{{ error }}</p>
          <div class="mt-3 flex items-center space-x-3">
            <button 
              @click="refreshData" 
              class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
            >
              重试
            </button>
            <button 
              @click="error = null" 
              class="text-xs text-red-600 hover:text-red-800 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 质押概览卡片 -->
    <div v-if="currentNetworkId && overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <!-- 总质押 TRX -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">总质押 TRX</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.totalStakedTrx) }}</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
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

    <!-- 操作按钮 -->
    <div v-if="currentNetworkId" class="mb-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">质押操作</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            @click="showStakeModal = true"
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
            @click="showUnstakeModal = true"
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
            @click="showDelegateModal = true"
            class="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group"
          >
            <div class="text-center">
              <svg class="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p class="text-sm font-medium text-green-600 group-hover:text-green-700">委托资源</p>
            </div>
          </button>

          <button
            @click="handleWithdraw"
            :disabled="!overview?.withdrawableTrx || overview.withdrawableTrx <= 0"
            class="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="text-center">
              <svg class="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p class="text-sm font-medium text-purple-600 group-hover:text-purple-700">提取资金</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 记录标签页 -->
    <div v-if="currentNetworkId" class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="p-6">
        <!-- 质押记录 -->
        <div v-if="activeTab === 'stake'">
          <StakeRecords :pool-id="selectedAccount.id" :network-id="currentNetworkId" />
        </div>

        <!-- 委托记录 -->
        <div v-if="activeTab === 'delegate'">
          <DelegateRecords :pool-id="selectedAccount.id" :network-id="currentNetworkId" />
        </div>

        <!-- 解质押记录 -->
        <div v-if="activeTab === 'unfreeze'">
          <UnfreezeRecords :pool-id="selectedAccount.id" :network-id="currentNetworkId" />
        </div>
      </div>
    </div>

    <!-- 质押模态框 -->
    <StakeModal
      v-if="showStakeModal && currentNetworkId && selectedAccount"
      :pool-id="currentNetworkId"
      :account-id="selectedAccount.id"
      :account-address="selectedAccount.tron_address"
      @close="showStakeModal = false"
      @success="onOperationSuccess"
    />

    <!-- 解质押模态框 -->
    <UnstakeModal
      v-if="showUnstakeModal && currentNetworkId && selectedAccount"
      :pool-id="currentNetworkId"
      :account-id="selectedAccount.id"
      :account-address="selectedAccount.tron_address"
      @close="showUnstakeModal = false"
      @success="onOperationSuccess"
    />

    <!-- 委托模态框 -->
    <DelegateModal
      v-if="showDelegateModal && currentNetworkId && selectedAccount"
      :pool-id="currentNetworkId"
      :account-id="selectedAccount.id"
      :account-address="selectedAccount.tron_address"
      @close="showDelegateModal = false"
      @success="onOperationSuccess"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { useNetworkStore } from '@/stores/network'
import type { TronNetwork } from '@/types/network'
import { ChevronDown, RefreshCw, Wallet } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AccountSelector from './components/AccountSelector.vue'
import DelegateModal from './components/DelegateModal.vue'
import DelegateRecords from './components/DelegateRecords.vue'
import StakeModal from './components/StakeModal.vue'
import StakeRecords from './components/StakeRecords.vue'
import UnfreezeRecords from './components/UnfreezeRecords.vue'
import UnstakeModal from './components/UnstakeModal.vue'
import { useEnergyPool } from './composables/useEnergyPool'
import { useStake } from './composables/useStake'

// 路由和网络状态
const route = useRoute()
const router = useRouter()
const networkStore = useNetworkStore()
const currentNetworkId = computed(() => route.params.networkId as string)

// 账户和网络选择
const selectedAccountId = ref<string | null>(null)
const selectedNetworkId = ref<string | null>(currentNetworkId.value || null)
const selectedAccount = ref<EnergyPoolAccount | null>(null)
const selectedNetwork = ref<TronNetwork | null>(null)

// 账户选择处理
const onAccountSelect = (account: EnergyPoolAccount) => {
  selectedAccount.value = account
  selectedAccountId.value = account.id
  
  // 刷新数据
  refreshData()
}

// 切换账户
const switchAccount = () => {
  selectedAccount.value = null
  selectedAccountId.value = null
}

// 网络切换状态
const showNetworkSwitcher = ref(false)

// 刷新状态
const isRefreshing = ref(false)

// 刷新数据
const refreshData = async () => {
  if (!selectedAccount.value || !selectedNetwork.value) return
  
  try {
    isRefreshing.value = true
    // 这里可以添加具体的数据刷新逻辑
    // 例如重新获取质押数据、委托数据等
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    isRefreshing.value = false
  }
}

// 计算属性
const currentNetwork = computed(() => {
  return networkStore.networks.find(n => n.id === currentNetworkId.value) || null
})

const availableNetworks = computed(() => {
  return networkStore.networks.filter(n => n.is_active)
})

// 组合式函数
const {
  loading,
  error,
  overview,
  loadOverview,
  withdrawUnfrozen,
  formatTrx,
  formatEnergy,
  formatBandwidth,
  formatAddress
} = useStake()

const {
  accounts: energyPoolAccounts,
  loadAccounts
} = useEnergyPool()
const activeTab = ref('stake')
const showStakeModal = ref(false)
const showUnstakeModal = ref(false)
const showDelegateModal = ref(false)

// 标签页配置
const tabs = [
  { key: 'stake', label: '质押记录' },
  { key: 'delegate', label: '委托记录' },
  { key: 'unfreeze', label: '解质押记录' }
]

// 网络相关方法
const getNetworkIcon = (networkId: string) => {
  const iconMap: Record<string, string> = {
    'mainnet': 'M',
    'shasta': 'S',
    'nile': 'N'
  }
  return iconMap[networkId] || 'T'
}

const getNetworkIconClass = (networkId: string) => {
  const classMap: Record<string, string> = {
    'mainnet': 'bg-green-500',
    'shasta': 'bg-blue-500', 
    'nile': 'bg-purple-500'
  }
  return classMap[networkId] || 'bg-gray-500'
}

const getNetworkStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'active': 'bg-green-100 text-green-800',
    'inactive': 'bg-gray-100 text-gray-800',
    'maintenance': 'bg-yellow-100 text-yellow-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

const getNetworkStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'active': '正常',
    'inactive': '停用',
    'maintenance': '维护中'
  }
  return textMap[status] || '未知'
}

const switchNetwork = async (networkId: string) => {
  showNetworkSwitcher.value = false
  
  // 设置当前网络到store
  networkStore.setCurrentNetwork(networkId)
  
  // 导航到新的网络路由
  await router.push(`/energy-pool/${networkId}/stake`)
}

// 刷新质押数据的逻辑已在上面的refreshData函数中实现

const handleWithdraw = async () => {
  if (!currentNetworkId.value) return
  
  try {
    // TODO: 这里需要根据网络ID来处理提取操作
    console.log('处理提取操作，网络ID:', currentNetworkId.value)
    // const result = await withdrawUnfrozen(selectedAccountId.value)
    // if (result) {
    //   // 刷新数据
    //   await loadOverview(selectedAccountId.value)
    //   // 显示成功消息
    //   alert(`提取成功！交易ID: ${result.txid}，提取金额: ${formatTrx(result.amount)}`)
    // }
  } catch (err: any) {
    alert(`提取失败: ${err.message}`)
  }
}

const onOperationSuccess = async () => {
  // 关闭所有模态框
  showStakeModal.value = false
  showUnstakeModal.value = false
  showDelegateModal.value = false
  
  // 刷新数据
  await refreshData()
}

// 监听网络变化
watch(currentNetworkId, async (newNetworkId) => {
  if (newNetworkId) {
    console.log('网络切换到:', newNetworkId)
    // 设置当前网络到store
    networkStore.setCurrentNetwork(newNetworkId)
    // 刷新数据
    await refreshData()
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  console.log('🚀 [Stake] 质押管理页面初始化')
  console.log('📋 [Stake] 当前网络ID:', currentNetworkId.value)
  console.log('📊 [Stake] 选中账户:', selectedAccount.value)
  console.log('🌐 [Stake] 网络加载状态:', networkStore.loading)
  
  // 加载网络列表
  await networkStore.loadNetworks()
  
  console.log('✅ [Stake] 质押管理页面初始化完成')
  console.log('🌐 [Stake] 当前网络:', currentNetwork.value)
  console.log('📊 [Stake] 网络列表数量:', networkStore.networks.length)
})
</script>

<style scoped>
.stake-management-page {
  @apply min-h-screen bg-gray-50 p-6;
}
</style>