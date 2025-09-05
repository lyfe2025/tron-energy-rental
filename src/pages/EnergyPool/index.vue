<template>
  <div class="energy-pool-page">
    <!-- 页面头部 -->
    <EnergyPoolHeader />

    <!-- 统计信息 -->
    <EnergyPoolStats 
      :statistics="statistics"
      :today-consumption="todayConsumption"
      :loading="loading"
      :format-energy="formatEnergy"
      @refresh-today-consumption="loadTodayConsumption"
    />

    <!-- 搜索和筛选 -->
    <EnergyPoolFilters 
      v-model:search-query="searchQuery"
      v-model:status-filter="statusFilter"
      v-model:network-filter="networkFilter"
      :available-networks="availableNetworks"
      @reset-filters="resetFilters"
    />

    <!-- 操作按钮 -->
    <EnergyPoolActions 
      :loading="loading"
      :selected-accounts="selectedAccounts"
      @refresh-status="refreshStatus"
      @show-add-modal="showAddModal = true"
      @batch-enable="batchEnable"
      @batch-disable="batchDisable"
      @show-batch-network-modal="showBatchNetworkModal = true"
      @batch-sync="batchSync"
    />

    <!-- 账户列表表格 -->
    <EnergyPoolTable
      :filtered-accounts="filteredAccounts"
      :selected-accounts="selectedAccounts"
      :is-all-selected="isAllSelected"
      :loading="loading"
      :syncing-account-id="syncingAccountId"
      :format-energy="formatEnergy"
      :format-address="formatAddress"
      :get-status-class="getStatusClass"
      :get-status-text="getStatusText"
      :get-account-type-text="getAccountTypeText"
      :get-account-type-class="getAccountTypeClass"
      @toggle-select-all="toggleSelectAll"
      @toggle-account-selection="toggleAccountSelection"
      @handle-account-network-setting="handleAccountNetworkSetting"
      @confirm-disable-account="confirmDisableAccount"
      @confirm-enable-account="confirmEnableAccount"
      @manage-networks="manageNetworks"
      @sync-account="syncAccount"
      @edit-account="editAccount"
      @view-details="viewDetails"
      @confirm-delete-account="confirmDeleteAccount"
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
      v-if="showEditModal"
      :visible="showEditModal"
      :account="selectedAccount"
      @close="showEditModal = false"
      @success="handleAccountUpdated"
    />

    <!-- 账户详情模态框 -->
    <AccountDetailsModal
      v-if="showDetailsModal"
      :isOpen="showDetailsModal"
      :account="selectedAccount"
      @close="showDetailsModal = false"
      @edit="handleEditFromDetails"
    />
    
    <!-- 删除确认框 -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">确认删除</h3>
        <p class="text-sm text-gray-500 mb-6">
          确定要删除账户 "{{ accountToDelete?.name }}" 吗？此操作不可撤销。
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="showDeleteConfirm = false; accountToDelete = null"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            取消
          </button>
          <button
            @click="handleDeleteAccount"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 启用/停用确认框 -->
    <div v-if="showEnableConfirm || showDisableConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">确认操作</h3>
        <p class="text-sm text-gray-500 mb-6">
          确定要 {{ toggleAction === 'enable' ? '启用' : '停用' }}账户 "{{ accountToToggle?.name }}" 吗？此操作不可撤销。
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="showEnableConfirm = false; showDisableConfirm = false; accountToToggle = null; toggleAction = 'enable'"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            取消
          </button>
          <button
            @click="handleToggleAccount"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            {{ toggleAction === 'enable' ? '启用' : '停用' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 账户网络设置模态框 -->
    <AccountNetworkModal
      v-model:visible="showAccountNetworkModal"
      :account="selectedAccount"
      @success="handleAccountNetworkUpdated"
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
import { computed, onMounted, ref } from 'vue'

// 组件导入
import EnergyPoolActions from './components/EnergyPoolActions.vue'
import EnergyPoolFilters from './components/EnergyPoolFilters.vue'
import EnergyPoolHeader from './components/EnergyPoolHeader.vue'
import EnergyPoolStats from './components/EnergyPoolStats.vue'
import EnergyPoolTable from './components/EnergyPoolTable.vue'

// 模态框组件导入
import AccountDetailsModal from './components/AccountDetailsModal.vue'
import AccountModal from './components/AccountModal.vue'
import AccountNetworkModal from './components/AccountNetworkModal.vue'
import BatchNetworkModal from './components/BatchNetworkModal.vue'

// composable导入
import { useEnergyPool, type EnergyPoolAccount } from './composables/useEnergyPool'

const {
  statistics,
  accounts,
  loading,
  todayConsumption,
  loadStatistics,
  loadAccounts,
  refreshStatus,
  loadTodayConsumption,
  enableAccount,
  disableAccount,
  deleteAccount,
  formatEnergy,
  formatAddress,
  formatDate,
  getStatusClass,
  getStatusText,
  getAccountTypeText,
  getAccountTypeClass,
  getEnabledClass,
  getEnabledText
} = useEnergyPool()

// 模态框状态
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDetailsModal = ref(false)
const showDeleteConfirm = ref(false)
const showEnableConfirm = ref(false)
const showDisableConfirm = ref(false)
const showNetworkModal = ref(false)
const showBatchNetworkModal = ref(false)
const showAccountNetworkModal = ref(false)
const selectedAccount = ref<EnergyPoolAccount | null>(null)
const accountToDelete = ref(null)
const accountToToggle = ref(null)
const toggleAction = ref<'enable' | 'disable'>('enable')

// 筛选和搜索状态
const selectedAccounts = ref<string[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const networkFilter = ref('')
const syncingAccountId = ref<string | null>(null)
const availableNetworks = ref([
  { id: '1', name: 'Mainnet' },
  { id: '2', name: 'Shasta Testnet' },
  { id: '3', name: 'Nile Testnet' }
])

// 计算属性
const filteredAccounts = computed(() => {
  let filtered = accounts.value

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(account => 
      account.name.toLowerCase().includes(query) ||
      account.tron_address.toLowerCase().includes(query)
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(account => account.status === statusFilter.value)
  }

  // 网络过滤
  if (networkFilter.value) {
    filtered = filtered.filter(account => 
      account.network_config?.id === networkFilter.value
    )
  }

  return filtered
})

const isAllSelected = computed(() => {
  return filteredAccounts.value.length > 0 && 
    filteredAccounts.value.every(account => selectedAccounts.value.includes(account.id))
})

// 方法定义
const editAccount = (account: any) => {
  selectedAccount.value = account
  showEditModal.value = true
}

const viewDetails = (account: any) => {
  selectedAccount.value = account
  showDetailsModal.value = true
}

const confirmDeleteAccount = (account: any) => {
  accountToDelete.value = account
  showDeleteConfirm.value = true
}

const handleDeleteAccount = async () => {
  if (!accountToDelete.value) return
  
  try {
    await deleteAccount(accountToDelete.value.id)
    showDeleteConfirm.value = false
    accountToDelete.value = null
    await loadAccounts()
    await loadStatistics()
  } catch (error) {
    console.error('Failed to delete account:', error)
  }
}

// 确认启用账户
const confirmEnableAccount = (account: any) => {
  accountToToggle.value = account
  toggleAction.value = 'enable'
  showEnableConfirm.value = true
}

// 确认停用账户
const confirmDisableAccount = (account: any) => {
  accountToToggle.value = account
  toggleAction.value = 'disable'
  showDisableConfirm.value = true
}

// 处理启用/停用确认
const handleToggleAccount = async () => {
  if (!accountToToggle.value) return
  
  try {
    if (toggleAction.value === 'enable') {
      await enableAccount(accountToToggle.value.id)
    } else {
      await disableAccount(accountToToggle.value.id)
    }
    
    // 关闭确认框并清理状态
    showEnableConfirm.value = false
    showDisableConfirm.value = false
    accountToToggle.value = null
    toggleAction.value = 'enable'
  } catch (error) {
    console.error('Failed to toggle account:', error)
  }
}

const handleAccountAdded = () => {
  showAddModal.value = false
  loadAccounts()
  loadStatistics()
}

const handleAccountUpdated = () => {
  showEditModal.value = false
  selectedAccount.value = null
  loadAccounts()
  loadStatistics()
}

const handleEditFromDetails = (account: EnergyPoolAccount) => {
  // 先关闭详情模态框
  showDetailsModal.value = false
  
  // 然后打开编辑模态框
  selectedAccount.value = account
  showEditModal.value = true
}

// 筛选和选择相关方法
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedAccounts.value = []
  } else {
    selectedAccounts.value = filteredAccounts.value.map(account => account.id)
  }
}

const toggleAccountSelection = (accountId: string) => {
  const index = selectedAccounts.value.indexOf(accountId)
  if (index > -1) {
    selectedAccounts.value.splice(index, 1)
  } else {
    selectedAccounts.value.push(accountId)
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  networkFilter.value = ''
}

const manageNetworks = (account: EnergyPoolAccount) => {
  selectedAccount.value = account
  showNetworkModal.value = true
}

const syncAccount = async (account: EnergyPoolAccount) => {
  syncingAccountId.value = account.id
  loading.sync = true
  try {
    // 模拟同步操作
    await new Promise(resolve => setTimeout(resolve, 2000))
    await loadAccounts()
    await loadStatistics()
  } catch (error) {
    console.error('Failed to sync account:', error)
  } finally {
    loading.sync = false
    syncingAccountId.value = null
  }
}

const batchEnable = async () => {
  loading.batch = true
  try {
    for (const accountId of selectedAccounts.value) {
      await enableAccount(accountId)
    }
    selectedAccounts.value = []
    await loadAccounts()
    await loadStatistics()
  } catch (error) {
    console.error('Failed to batch enable accounts:', error)
  } finally {
    loading.batch = false
  }
}

const batchDisable = async () => {
  loading.batch = true
  try {
    for (const accountId of selectedAccounts.value) {
      await disableAccount(accountId)
    }
    selectedAccounts.value = []
    await loadAccounts()
    await loadStatistics()
  } catch (error) {
    console.error('Failed to batch disable accounts:', error)
  } finally {
    loading.batch = false
  }
}

const batchSync = async () => {
  loading.batch = true
  try {
    for (const accountId of selectedAccounts.value) {
      await syncAccount({ id: accountId } as EnergyPoolAccount)
    }
    selectedAccounts.value = []
  } catch (error) {
    console.error('Failed to batch sync accounts:', error)
  } finally {
    loading.batch = false
  }
}

const handleNetworkUpdated = () => {
  showNetworkModal.value = false
  selectedAccount.value = null
  loadAccounts()
}

const handleAccountNetworkSetting = (account: EnergyPoolAccount) => {
  selectedAccount.value = account
  showAccountNetworkModal.value = true
}

const handleAccountNetworkUpdated = () => {
  showAccountNetworkModal.value = false
  selectedAccount.value = null
  loadAccounts()
}

const handleBatchNetworkUpdated = () => {
  showBatchNetworkModal.value = false
  selectedAccounts.value = []
  loadAccounts()
}

onMounted(async () => {
  await Promise.all([
    loadStatistics(),
    loadAccounts(),
    loadTodayConsumption()
  ])
})
</script>

<style scoped>
.energy-pool-page {
  @apply p-6;
}
</style>
