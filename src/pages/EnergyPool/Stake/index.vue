<template>
  <div class="stake-management-page">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">质押管理</h1>
        <p class="text-gray-600 mt-1">管理TRON网络上的TRX质押和资源委托</p>
      </div>
      <button
        v-if="stakeData.selectedAccount.value && stakeData.selectedNetwork.value"
        @click="stakeOperations.refreshData"
        :disabled="stakeData.isRefreshing.value"
        class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw :class="{ 'animate-spin': stakeData.isRefreshing.value }" class="h-4 w-4" />
        <span>{{ stakeData.isRefreshing.value ? '刷新中...' : '刷新' }}</span>
      </button>
    </div>

    <!-- 网络加载状态 -->
    <div v-if="stakeData.networkStore.loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">加载网络信息中...</p>
    </div>

    <!-- 账户选择界面 -->
    <div v-else-if="!stakeData.selectedAccount.value && stakeData.currentNetworkId.value" class="mb-8">
      <div v-if="stakeData.currentNetwork.value">
        <AccountSelector
          :network="stakeData.currentNetwork.value as any"
          @select="stakeOperations.onAccountSelect"
        />
      </div>
      <div v-else class="text-center py-12">
        <div class="text-gray-500">
          <p>未找到网络信息 (ID: {{ stakeData.currentNetworkId.value }})</p>
          <p class="text-sm text-gray-400 mt-2">请确认网络配置是否正确</p>
          <button 
            @click="stakeData.router.push('/energy-pool')" 
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重新选择网络
          </button>
        </div>
      </div>
    </div>

    <!-- 质押管理主界面 -->
    <div v-if="stakeData.currentNetworkId.value && stakeData.selectedAccount.value">
      <!-- 错误提示 -->
      <ErrorDisplay 
        :error="stakeData.stakeComposable.error.value"
        @retry="stakeOperations.refreshData"
        @close="() => { /* 错误清除由组件内部处理 */ }"
      />

      <!-- 当前网络 -->
      <StakeOverview
        :selected-account="stakeData.selectedAccount.value"
        :current-network="stakeData.currentNetwork.value"
        :overview="stakeData.stakeComposable.overview.value"
        :format-trx="stakeData.stakeComposable.formatTrx"
        :format-energy="stakeData.stakeComposable.formatEnergy"
        :format-bandwidth="stakeData.stakeComposable.formatBandwidth"
        :format-address="stakeData.stakeComposable.formatAddress"
        :show-account-section="false"
        :show-network-section="true"
        :show-overview-section="false"
        @switch-account="stakeOperations.switchAccount"
        @toggle-network-switcher="stakeData.showNetworkSwitcher.value = true"
      />

      <!-- 账户信息 -->
      <StakeOverview
        :selected-account="stakeData.selectedAccount.value"
        :current-network="stakeData.currentNetwork.value"
        :overview="stakeData.stakeComposable.overview.value"
        :format-trx="stakeData.stakeComposable.formatTrx"
        :format-energy="stakeData.stakeComposable.formatEnergy"
        :format-bandwidth="stakeData.stakeComposable.formatBandwidth"
        :format-address="stakeData.stakeComposable.formatAddress"
        :show-account-section="true"
        :show-network-section="false"
        :show-overview-section="false"
        @switch-account="stakeOperations.switchAccount"
        @toggle-network-switcher="stakeData.showNetworkSwitcher.value = true"
      />

      <!-- 质押操作 -->
      <div class="mb-6">
        <StakeOperations
          :overview="stakeData.stakeComposable.overview.value"
          @show-stake="stakeData.showStakeModal.value = true"
          @show-unstake="stakeData.showUnstakeModal.value = true"
          @show-delegate="stakeData.showDelegateModal.value = true"
          @handle-withdraw="stakeOperations.handleWithdraw"
        />
      </div>

      <!-- 质押概览统计 -->
      <StakeOverview
        :selected-account="stakeData.selectedAccount.value"
        :current-network="stakeData.currentNetwork.value"
        :overview="stakeData.stakeComposable.overview.value"
        :format-trx="stakeData.stakeComposable.formatTrx"
        :format-energy="stakeData.stakeComposable.formatEnergy"
        :format-bandwidth="stakeData.stakeComposable.formatBandwidth"
        :format-address="stakeData.stakeComposable.formatAddress"
        :show-network-section="false"
        :show-overview-section="true"
        @switch-account="stakeOperations.switchAccount"
        @toggle-network-switcher="stakeData.showNetworkSwitcher.value = true"
      />

      <!-- 历史记录 -->
      <StakeHistory
        :active-tab="stakeData.activeTab.value"
        :selected-account="stakeData.selectedAccount.value"
        :current-network-id="stakeData.currentNetworkId.value"
        :tabs="stakeData.tabs"
        @change-tab="stakeData.activeTab.value = $event"
      />
    </div>

    <!-- 网络切换模态框 -->
    <div v-if="stakeData.showNetworkSwitcher.value" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">切换网络</h3>
          <button @click="stakeData.showNetworkSwitcher.value = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="space-y-3 mb-6">
          <div
            v-for="network in stakeData.availableNetworks.value"
            :key="network.id"
            @click="stakeOperations.switchNetwork(network.id)"
            class="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            :class="network.id === stakeData.currentNetworkId.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
          >
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full" :class="network.is_active ? 'bg-green-500' : 'bg-red-500'"></div>
              <div>
                <div class="font-medium text-gray-900">{{ network.name }}</div>
                <div class="text-sm text-gray-500">{{ getNetworkTypeText(network.type) }}</div>
              </div>
            </div>
            <div v-if="network.id === stakeData.currentNetworkId.value" class="text-blue-600">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div class="flex justify-end space-x-3">
          <button
            @click="stakeData.showNetworkSwitcher.value = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 质押模态框 -->
    <StakeModal
      v-if="stakeData.showStakeModal.value && stakeData.currentNetworkId.value && stakeData.selectedAccount.value"
      :pool-id="stakeData.currentNetworkId.value"
      :account-id="stakeData.selectedAccount.value.id"
      :account-address="stakeData.selectedAccount.value.tron_address"
      @close="stakeData.showStakeModal.value = false"
      @success="stakeOperations.onOperationSuccess"
    />

    <!-- 解质押模态框 -->
    <UnstakeModal
      v-if="stakeData.showUnstakeModal.value && stakeData.currentNetworkId.value && stakeData.selectedAccount.value"
      :pool-id="stakeData.currentNetworkId.value"
      :account-id="stakeData.selectedAccount.value.id"
      :account-address="stakeData.selectedAccount.value.tron_address"
      @close="stakeData.showUnstakeModal.value = false"
      @success="stakeOperations.onOperationSuccess"
    />

    <!-- 委托模态框 -->
    <DelegateModal
      v-if="stakeData.showDelegateModal.value && stakeData.currentNetworkId.value && stakeData.selectedAccount.value"
      :pool-id="stakeData.currentNetworkId.value"
      :account-id="stakeData.selectedAccount.value.id"
      :account-address="stakeData.selectedAccount.value.tron_address"
      @close="stakeData.showDelegateModal.value = false"
      @success="stakeOperations.onOperationSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { getNetworkTypeText } from '@/utils/network'
import { RefreshCw } from 'lucide-vue-next'
import { onMounted, watch } from 'vue'
import AccountSelector from '../components/AccountSelector.vue'
import DelegateModal from '../components/DelegateModal.vue'
import StakeModal from '../components/StakeModal.vue'
import UnstakeModal from '../components/UnstakeModal.vue'
import ErrorDisplay from './components/ErrorDisplay.vue'
import StakeHistory from './components/StakeHistory.vue'
import StakeOperations from './components/StakeOperations.vue'
import StakeOverview from './components/StakeOverview.vue'
import { useStakeData } from './composables/useStakeData'
import { useStakeOperations } from './composables/useStakeOperations'

// 使用分离的composables
const stakeData = useStakeData()
const stakeOperations = useStakeOperations(stakeData)

// 监听路由变化
watch(
  () => stakeData.currentNetworkId.value,
  async (newNetworkId) => {
    if (newNetworkId && stakeData.networkStore.networks.length > 0) {
      // 重置账户选择
      stakeData.selectedAccount.value = null
      stakeData.selectedAccountId.value = null
      
      // 加载网络相关数据
      if (stakeData.stakeComposable.loadOverview && stakeData.selectedAccountId.value) {
        await stakeData.stakeComposable.loadOverview(stakeData.selectedAccountId.value, stakeData.currentNetworkId.value)
      }
    }
  },
  { immediate: true }
)

// 组件挂载
onMounted(async () => {
  // 加载网络信息
  if (!stakeData.networkStore.networks.length) {
    await stakeData.networkStore.loadNetworks()
  }
  
  // 加载能量池账户
  if (stakeData.energyPoolComposable.loadAccounts) {
    await stakeData.energyPoolComposable.loadAccounts()
  }
})
</script>

<style scoped>
.stake-management-page {
  @apply min-h-screen bg-gray-50 p-6;
}
</style>
