<template>
  <div class="energy-pool-page">
    <!-- 页面头部 -->
    <EnergyPoolHeader />

    <!-- 网络状态栏 -->
    <NetworkStatusBar 
      :current-network="currentNetwork"
      @switch-network="showNetworkSwitcher = true"
    />

    <!-- 统计信息 -->
    <EnergyPoolStats 
      :statistics="statistics"
      :today-consumption="todayConsumption"
      :loading="statisticsLoading"
      :format-energy="formatEnergy"
      @refresh-today-consumption="loadTodayConsumption"
    />

    <!-- 搜索和筛选 -->
    <EnergyPoolFilters 
      v-model:search-query="filterState.searchQuery"
      v-model:status-filter="filterState.statusFilter"
      @reset-filters="resetFilters"
    />

    <!-- 操作按钮 -->
    <EnergyPoolActions 
      :loading="accountLoading"
      :selected-accounts="selectedAccounts"
      :is-refreshing="isPageRefreshing"
      @refresh-status="refreshStatus"
      @show-add-modal="showAddModal = true"
      @batch-enable="() => handleBatchEnable(selectedAccounts)"
      @batch-disable="() => handleBatchDisable(selectedAccounts)"
      @show-batch-network-modal="showBatchNetworkModal = true"
    />

    <!-- 账户列表表格 -->
    <EnergyPoolTable
      :filtered-accounts="filteredAccounts"
      :selected-accounts="selectedAccounts"
      :is-all-selected="isAllSelected"
      :loading="accountLoading"
      :format-energy="formatEnergy"
      :format-address="formatAddress"
      :get-status-class="getStatusClass"
      :get-status-text="getStatusText"
      :get-account-type-text="getAccountTypeText"
      :get-account-type-class="getAccountTypeClass"
      @toggle-select-all="toggleSelectAll"
      @toggle-account-selection="toggleAccountSelection"
      @confirm-disable-account="handleDisableAccount"
      @confirm-enable-account="handleEnableAccount"
      @edit-account="handleEditAccount"
      @view-details="handleViewDetails"
      @confirm-delete-account="handleDeleteAccount"
    />

    <!-- 添加账户模态框 -->
    <AccountModal
      v-if="showAddModal"
      :visible="showAddModal"
      @close="showAddModal = false"
      @success="handleAccountAdded"
    />

    <!-- 编辑账户模态框 -->
    <AccountModal
      :visible="showEditModal"
      :account="selectedAccount"
      :current-network-id="currentNetworkId"
      :current-network="currentNetwork"
      @close="showEditModal = false"
      @success="handleAccountUpdated"
    />

    <!-- 账户详情模态框 -->
    <AccountDetailsModal
      v-if="showDetailsModal"
      :isOpen="showDetailsModal"
      :account="selectedAccount"
      :current-network-id="currentNetworkId"
      :current-network="currentNetwork"
      @close="showDetailsModal = false"
      @edit="handleEditFromDetails"
    />

    <!-- 网络切换模态框 -->
    <NetworkSwitcher
      :visible="showNetworkSwitcher"
      :available-networks="availableNetworks"
      :current-network-id="currentNetworkId"
      @close="showNetworkSwitcher = false"
      @network-selected="handleNetworkSelected"
    />
    
    <!-- 删除确认框 -->
    <DeleteConfirmModal
      :visible="showDeleteConfirm"
      :account="accountToDelete"
      :loading="accountLoading.operations"
      @close="showDeleteConfirm = false; accountToDelete = null"
      @confirm="confirmDeleteAccount"
    />

    <!-- 启用/停用确认框 -->
    <ToggleConfirmModal
      :visible="showToggleConfirm"
      :account="accountToToggle"
      :action="toggleAction"
      :loading="accountLoading.operations"
      @close="handleToggleModalClose"
      @confirm="confirmToggleAccount"
    />

    <!-- 批量网络关联模态框 -->
    <BatchNetworkModal
      v-if="showBatchNetworkModal"
      :visible="showBatchNetworkModal"
      :selectedAccounts="selectedAccounts"
      @close="showBatchNetworkModal = false"
      @success="handleBatchNetworkUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

// 组件导入
import EnergyPoolActions from './components/EnergyPoolActions.vue'
import EnergyPoolFilters from './components/EnergyPoolFilters.vue'
import EnergyPoolHeader from './components/EnergyPoolHeader.vue'
import EnergyPoolStats from './components/EnergyPoolStats.vue'
import EnergyPoolTable from './components/EnergyPoolTable.vue'
import NetworkStatusBar from './components/NetworkStatusBar.vue'

// 模态框组件导入
import AccountDetailsModal from './components/AccountDetailsModal.vue'
import AccountModal from './components/AccountModal.vue'
import BatchNetworkModal from './components/BatchNetworkModal.vue'
import DeleteConfirmModal from './components/Modals/DeleteConfirmModal.vue'
import NetworkSwitcher from './components/Modals/NetworkSwitcher.vue'
import ToggleConfirmModal from './components/Modals/ToggleConfirmModal.vue'

// Composables导入
import { useAccountManagement } from './composables/useAccountManagement'
import { useEnergyPool } from './composables/useEnergyPool'
import { useNetworkOperations } from './composables/useNetworkOperations'
import type { EnergyPoolAccount, ToggleAction } from './types/energy-pool.types'

// 主要数据和统计信息
const { statistics, todayConsumption, loadStatistics, loadTodayConsumption, formatEnergy } = useEnergyPool()

// 账户管理
const {
  accounts,
  selectedAccounts,
  selectedAccount,
  filterState,
  loading: accountLoading,
  filteredAccounts,
  isAllSelected,
  loadAccounts,
  deleteAccount,
  enableAccount,
  disableAccount,
  batchEnableAccounts,
  batchDisableAccounts,
  toggleSelectAll,
  toggleAccountSelection,
  resetFilters,
  formatAddress,
  getStatusClass,
  getStatusText,
  getAccountTypeText,
  getAccountTypeClass
} = useAccountManagement()

// 网络操作
const {
  currentNetworkId,
  currentNetwork,
  availableNetworks,
  switchNetwork,
  initializeNetworks
} = useNetworkOperations()

// 模态框状态
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDetailsModal = ref(false)
const showDeleteConfirm = ref(false)
const showToggleConfirm = ref(false)
const showBatchNetworkModal = ref(false)
const showNetworkSwitcher = ref(false)

// 账户操作状态
const accountToDelete = ref<EnergyPoolAccount | null>(null)
const accountToToggle = ref<EnergyPoolAccount | null>(null)
const toggleAction = ref<ToggleAction>('enable')

// 统计信息加载状态
const statisticsLoading = ref(false)

// 页面刷新防抖状态
const pageRefreshDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const isPageRefreshing = ref(false)

// 刷新状态（带防抖）
const refreshStatus = async () => {
  // 防抖检查：如果已经在刷新中或防抖定时器存在，直接返回
  if (isPageRefreshing.value || pageRefreshDebounceTimer.value) {
    console.log('🚫 [EnergyPool页面] 防抖拦截：页面刷新正在进行中')
    return
  }

  if (!currentNetworkId.value) {
    return
  }

  // 设置防抖状态
  isPageRefreshing.value = true
  statisticsLoading.value = true

  // 设置防抖定时器（800ms内不允许重复刷新）
  pageRefreshDebounceTimer.value = setTimeout(async () => {
    try {
      console.log('✅ [EnergyPool页面] 执行页面数据刷新', { networkId: currentNetworkId.value })
      await Promise.all([
        loadAccounts(currentNetworkId.value),
        loadStatistics(currentNetworkId.value),
        loadTodayConsumption()
      ])
    } catch (error) {
      console.error('页面数据刷新失败:', error)
    } finally {
      statisticsLoading.value = false
      // 延迟清理防抖状态
      setTimeout(() => {
        isPageRefreshing.value = false
        pageRefreshDebounceTimer.value = null
      }, 1200)
    }
  }, 300)
}

// 账户操作处理
const handleEditAccount = (account: EnergyPoolAccount) => {
  console.log('🔍 [EnergyPool] 编辑账户被点击:', {
    accountId: account.id,
    accountName: account.name,
    accountStatus: account.status,
    accountType: account.account_type,
    hasPrivateKey: !!account.private_key_encrypted,
    privateKeyValue: account.private_key_encrypted,
    currentNetworkId: currentNetworkId.value,
    accountData: account
  })
  selectedAccount.value = account
  showEditModal.value = true
  console.log('🔍 [EnergyPool] 编辑模态框状态:', {
    showEditModal: showEditModal.value,
    selectedAccount: selectedAccount.value
  })
}

const handleViewDetails = (account: EnergyPoolAccount) => {
  selectedAccount.value = account
  showDetailsModal.value = true
}

const handleDeleteAccount = (account: EnergyPoolAccount) => {
  accountToDelete.value = account
  showDeleteConfirm.value = true
}

const handleEnableAccount = (account: EnergyPoolAccount) => {
  accountToToggle.value = account
  toggleAction.value = 'enable'
  showToggleConfirm.value = true
}

const handleDisableAccount = (account: EnergyPoolAccount) => {
  accountToToggle.value = account
  toggleAction.value = 'disable'
  showToggleConfirm.value = true
}

// 确认操作处理
const confirmDeleteAccount = async (account: EnergyPoolAccount) => {
  try {
    await deleteAccount(account.id)
    showDeleteConfirm.value = false
    accountToDelete.value = null
    await refreshStatus()
  } catch (error) {
    console.error('Failed to delete account:', error)
  }
}

const confirmToggleAccount = async (account: EnergyPoolAccount, action: ToggleAction) => {
  try {
    if (action === 'enable') {
      await enableAccount(account.id, currentNetworkId.value)
    } else {
      await disableAccount(account.id, currentNetworkId.value)
    }
    // 操作成功后刷新所有状态（包括统计信息）
    await refreshStatus()
    handleToggleModalClose()
  } catch (error) {
    console.error('Failed to toggle account:', error)
  }
}

// 模态框关闭处理
const handleToggleModalClose = () => {
  showToggleConfirm.value = false
  accountToToggle.value = null
  toggleAction.value = 'enable'
}

// 网络切换处理
const handleNetworkSelected = async (networkId: string) => {
  await switchNetwork(networkId)
}

// 账户操作成功处理
const handleAccountAdded = async () => {
  showAddModal.value = false
  await refreshStatus()
}

const handleAccountUpdated = async () => {
  showEditModal.value = false
  selectedAccount.value = null
  await refreshStatus()
}

const handleEditFromDetails = (account: EnergyPoolAccount) => {
  showDetailsModal.value = false
  selectedAccount.value = account
  showEditModal.value = true
}

const handleBatchNetworkUpdated = async () => {
  showBatchNetworkModal.value = false
  selectedAccounts.value = []
  if (currentNetworkId.value) {
    await loadAccounts(currentNetworkId.value)
  }
}

// 批量启用处理
const handleBatchEnable = async (accountIds: string[]) => {
  try {
    await batchEnableAccounts(accountIds, currentNetworkId.value)
    // 批量操作完成后刷新所有状态（包括统计信息）
    await refreshStatus()
  } catch (error) {
    console.error('Failed to batch enable accounts:', error)
  }
}

// 批量停用处理
const handleBatchDisable = async (accountIds: string[]) => {
  try {
    await batchDisableAccounts(accountIds, currentNetworkId.value)
    // 批量操作完成后刷新所有状态（包括统计信息）
    await refreshStatus()
  } catch (error) {
    console.error('Failed to batch disable accounts:', error)
  }
}

// 监听网络ID变化
watch(currentNetworkId, async (newNetworkId) => {
  console.log('🔍 [EnergyPool] 网络变化:', newNetworkId)
  if (newNetworkId) {
    await Promise.all([
      loadAccounts(newNetworkId),
      loadStatistics(newNetworkId),
      loadTodayConsumption()
    ])
  } else {
    accounts.value = []
  }
}, { immediate: true })

// 监听 selectedAccount 变化
watch(selectedAccount, (newAccount, oldAccount) => {
  console.log('🔍 [EnergyPool] selectedAccount 变化:', {
    hasNewAccount: !!newAccount,
    newAccountId: newAccount?.id,
    newAccountName: newAccount?.name,
    hasOldAccount: !!oldAccount,
    oldAccountId: oldAccount?.id,
    showEditModal: showEditModal.value
  })
}, { immediate: true, deep: true })

// 监听 currentNetworkId 变化
watch(currentNetworkId, (newNetworkId, oldNetworkId) => {
  console.log('🔍 [EnergyPool] currentNetworkId 变化:', {
    newNetworkId: newNetworkId,
    oldNetworkId: oldNetworkId,
    hasNewNetworkId: !!newNetworkId,
    currentNetwork: currentNetwork.value
  })
}, { immediate: true })

// 页面初始化
onMounted(async () => {
  console.log('🚀 [EnergyPool] 页面初始化')
  try {
    await initializeNetworks()
    console.log('✅ [EnergyPool] 页面初始化完成，当前网络:', currentNetworkId.value)
  } catch (error) {
    console.error('❌ [EnergyPool] 页面初始化失败:', error)
  }
})
</script>

<style scoped>
.energy-pool-page {
  @apply p-6;
}
</style>
