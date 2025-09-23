<template>
  <div class="stake-management-page">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">质押管理</h1>
        <p class="text-gray-600 mt-1">管理TRON网络上的TRX质押和资源代理</p>
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
          :network="stakeData.currentNetwork.value"
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
          :overview="realTimeAccountData.realTimeData.value?.stakeStatus"
          @show-stake="stakeData.showStakeModal.value = true"
          @show-unstake="stakeData.showUnstakeModal.value = true"
          @show-delegate="handleShowDelegate"
          @handle-withdraw="handleWithdrawTrx"
        />
      </div>

      <!-- 质押概览统计 -->
      <StakeOverview
        :selected-account="stakeData.selectedAccount.value"
        :current-network="stakeData.currentNetwork.value"
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
                <div class="text-sm text-gray-500">{{ getNetworkTypeText(network.network_type || network.type) }}</div>
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
      :account-name="stakeData.selectedAccount.value.name"
      @close="stakeData.showStakeModal.value = false"
      @success="stakeOperations.onOperationSuccess"
      @open-delegate="handleOpenDelegateFromStake"
    />

    <!-- 解质押模态框 -->
    <UnstakeModal
      v-if="stakeData.showUnstakeModal.value && stakeData.currentNetworkId.value && stakeData.selectedAccount.value"
      :pool-id="stakeData.currentNetworkId.value"
      :account-id="stakeData.selectedAccount.value.id"
      :account-address="stakeData.selectedAccount.value.tron_address"
      :account-name="stakeData.selectedAccount.value.name"
      @close="stakeData.showUnstakeModal.value = false"
      @success="stakeOperations.onOperationSuccess"
    />

    <!-- 代理模态框 -->
    <DelegateModal
      v-if="stakeData.showDelegateModal.value && stakeData.currentNetworkId.value && stakeData.selectedAccount.value"
      :pool-id="stakeData.currentNetworkId.value"
      :account-id="stakeData.selectedAccount.value.id"
      :account-address="stakeData.selectedAccount.value.tron_address"
      :account-name="stakeData.selectedAccount.value.name"
      @close="stakeData.showDelegateModal.value = false"
      @success="stakeOperations.onOperationSuccess"
    />

    <!-- 提取TRX确认弹窗 -->
    <div v-if="showWithdrawConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">提取TRX</h3>
          <button @click="cancelWithdrawTrx" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 提取图标 -->
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
        </div>

        <!-- 提取信息 -->
        <div class="text-center mb-6">
          <p class="text-gray-700 text-base">
            您在质押 2.0 有 <span class="font-bold text-gray-900">{{ realTimeAccountData.formatStakeTrx(realTimeAccountData.realTimeData.value?.stakeStatus?.withdrawableTrx || 0) }}</span> 质押本金待提取，确认提取？
          </p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex space-x-3">
          <button
            @click="cancelWithdrawTrx"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            @click="confirmWithdrawTrx"
            :disabled="withdrawLoading"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="withdrawLoading">提取中...</span>
            <span v-else>确认</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 提取结果弹窗 -->
    <div 
      v-if="showWithdrawResult" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="text-center">
          <!-- 成功或失败图标 -->
          <div class="flex justify-center mb-6">
            <div 
              class="w-16 h-16 rounded-full flex items-center justify-center"
              :class="withdrawResult.success 
                ? 'bg-green-100' 
                : 'bg-red-100'"
            >
              <!-- 成功图标 -->
              <svg 
                v-if="withdrawResult.success" 
                class="w-8 h-8 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <!-- 失败图标 -->
              <svg 
                v-else 
                class="w-8 h-8 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          </div>
          
          <!-- 标题 -->
          <h3 
            class="text-lg font-semibold mb-4"
            :class="withdrawResult.success 
              ? 'text-green-900' 
              : 'text-red-900'"
          >
            {{ withdrawResult.title }}
          </h3>
          
          <!-- 内容 -->
          <p class="text-gray-700 text-base mb-6">
            {{ withdrawResult.message }}
          </p>
          
          <!-- 交易ID（如果有） -->
          <div v-if="withdrawResult.success && withdrawResult.txid" class="mb-6 p-3 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-500 mb-1">交易ID:</p>
            <p class="text-xs font-mono text-gray-800 break-all">{{ withdrawResult.txid }}</p>
          </div>
          
          <!-- 确认按钮 -->
          <button
            @click="showWithdrawResult = false"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getNetworkTypeText } from '@/utils/network'
import { RefreshCw } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import AccountSelector from '../components/AccountSelector.vue'
// 使用新的质押操作组件结构
import { useRealTimeAccountData } from '@/composables/useRealTimeAccountData'
import {
    DelegateModal,
    StakeModal,
    UnstakeModal
} from '../components/StakeOperations'
import ErrorDisplay from './components/ErrorDisplay.vue'
import StakeHistory from './components/StakeHistory.vue'
import StakeOperations from './components/StakeOperations.vue'
import StakeOverview from './components/StakeOverview.vue'
import { useStakeData } from './composables/useStakeData'
import { useStakeOperations } from './composables/useStakeOperations'

// 使用分离的composables
const stakeData = useStakeData()
const stakeOperations = useStakeOperations(stakeData)
const realTimeAccountData = useRealTimeAccountData()

// 提取TRX确认弹窗状态
const showWithdrawConfirm = ref(false)
const withdrawLoading = ref(false)

// 提取结果提示弹窗状态
const showWithdrawResult = ref(false)
const withdrawResult = ref<{
  success: boolean
  title: string
  message: string
  txid?: string
}>({
  success: false,
  title: '',
  message: ''
})

// 处理提取TRX
const handleWithdrawTrx = () => {
  const withdrawableTrx = realTimeAccountData.realTimeData.value?.stakeStatus?.withdrawableTrx || 0
  
  if (withdrawableTrx > 0) {
    showWithdrawConfirm.value = true
  } else {
    console.warn('⚠️ [Index] 没有可提取的TRX')
  }
}

// 确认提取TRX
const confirmWithdrawTrx = async () => {
  if (!stakeData.selectedAccount.value?.tron_address) {
    console.error('❌ [Index] 没有选中的账户地址')
    return
  }

  try {
    withdrawLoading.value = true
    console.log('🔄 [Index] 开始提取TRX...')
    
    // 使用质押操作的withdrawUnfrozen方法
    const result = await stakeData.stakeComposable.withdrawUnfrozen(
      stakeData.selectedAccount.value.tron_address,
      stakeData.currentNetworkId.value,
      stakeData.selectedAccount.value.id
    )
    
    if (result) {
      console.log('✅ [Index] 提取TRX成功', result)
      showWithdrawConfirm.value = false
      
      // 显示成功提示
      withdrawResult.value = {
        success: true,
        title: '提取成功',
        message: `已成功提取TRX到您的账户${result.txid ? `，交易ID: ${result.txid}` : ''}`,
        txid: result.txid
      }
      showWithdrawResult.value = true
      
      // 刷新数据
      await stakeOperations.refreshData()
    }
  } catch (error: any) {
    console.error('❌ [Index] 提取TRX失败:', error)
    showWithdrawConfirm.value = false
    
    // 显示错误提示
    withdrawResult.value = {
      success: false,
      title: '提取失败',
      message: error.message || '提取TRX失败，请稍后重试'
    }
    showWithdrawResult.value = true
  } finally {
    withdrawLoading.value = false
  }
}

// 取消提取TRX
const cancelWithdrawTrx = () => {
  showWithdrawConfirm.value = false
}

// 代理模态框处理
const handleShowDelegate = () => {
  stakeData.showDelegateModal.value = true
}

// 从质押成功弹窗打开代理模态框
const handleOpenDelegateFromStake = () => {
  // 关闭质押模态框
  stakeData.showStakeModal.value = false
  // 打开代理模态框
  stakeData.showDelegateModal.value = true
}

// 监听路由变化
watch(
  () => stakeData.currentNetworkId.value,
  async (newNetworkId, oldNetworkId) => {
    console.log('🔍 [StakeIndex] 网络ID变化:', {
      oldNetworkId,
      newNetworkId,
      hasNetworks: stakeData.networkStore.networks.length > 0,
      currentNetworkInStore: stakeData.networkStore.selectedNetwork?.name,
      computedCurrentNetwork: stakeData.currentNetwork.value?.name
    })
    
    if (newNetworkId && stakeData.networkStore.networks.length > 0) {
      // 设置当前网络到store（如果不匹配）
      if (String(stakeData.networkStore.selectedNetwork?.id) !== String(newNetworkId)) {
        console.log('🔌 [StakeIndex] 更新网络Store中的当前网络')
        stakeData.networkStore.selectNetwork(String(newNetworkId))
      }
      
      // 重置账户选择（仅在网络实际变化时）
      if (oldNetworkId && oldNetworkId !== newNetworkId) {
        console.log('🔄 [StakeIndex] 网络变化，重置账户选择')
        stakeData.selectedAccount.value = null
        stakeData.selectedAccountId.value = null
      }
      
      // 加载网络相关数据
      if (stakeData.stakeComposable.loadOverview && stakeData.selectedAccountId.value) {
        console.log('🔄 [StakeIndex] 加载网络相关数据')
        await stakeData.stakeComposable.loadOverview(stakeData.selectedAccountId.value, stakeData.currentNetworkId.value)
      }
    }
  },
  { immediate: true }
)

// 监听账户和网络变化，自动获取实时数据
watch(
  () => [stakeData.selectedAccount.value, stakeData.currentNetworkId.value] as const,
  async ([selectedAccount, networkId]) => {
    if (selectedAccount?.tron_address && networkId) {
      await realTimeAccountData.fetchRealTimeData(
        selectedAccount.tron_address,
        networkId,
        false, // 不显示toast提示
        true   // 包含质押状态
      )
    }
  },
  { immediate: true }
)

// 组件挂载
onMounted(async () => {
  console.log('🚀 [StakeIndex] 组件挂载开始', {
    currentNetworkId: stakeData.currentNetworkId.value,
    hasNetworks: stakeData.networkStore.networks.length > 0
  })
  
  try {
    // 优先加载网络信息
    if (!stakeData.networkStore.networks.length) {
      console.log('🔄 [StakeIndex] 加载网络列表...')
      await stakeData.networkStore.fetchNetworks()
      console.log('✅ [StakeIndex] 网络列表加载完成', {
        networkCount: stakeData.networkStore.networks.length,
        networks: stakeData.networkStore.networks.map(n => ({ id: n.id, name: n.name }))
      })
    }
    
    // 设置当前网络到store
    if (stakeData.currentNetworkId.value) {
      console.log('🔌 [StakeIndex] 设置当前网络:', stakeData.currentNetworkId.value)
      stakeData.networkStore.selectNetwork(stakeData.currentNetworkId.value)
      console.log('🔌 [StakeIndex] 网络设置结果:', {
        currentNetworkInStore: stakeData.networkStore.selectedNetwork?.name,
        computedCurrentNetwork: stakeData.currentNetwork.value?.name
      })
    }
    
    // 加载能量池账户
    if (stakeData.energyPoolComposable.loadAccounts) {
      console.log('🔄 [StakeIndex] 加载能量池账户...')
      await stakeData.energyPoolComposable.loadAccounts()
      console.log('✅ [StakeIndex] 能量池账户加载完成')
    }
    
    console.log('✅ [StakeIndex] 组件初始化完成')
  } catch (error) {
    console.error('❌ [StakeIndex] 组件初始化失败:', error)
  }
})
</script>

<style scoped>
.stake-management-page {
  @apply min-h-screen bg-gray-50 p-6;
}
</style>
