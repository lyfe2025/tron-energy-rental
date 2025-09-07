<template>
  <div class="energy-pool-page">
    <!-- 页面头部 -->
    <EnergyPoolHeader />

    <!-- 网络状态栏 -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" :class="currentNetwork?.is_active ? 'bg-green-500' : 'bg-red-500'"></div>
            <span class="text-lg font-medium text-gray-900">当前网络: {{ currentNetwork?.name || '未知网络' }}</span>
          </div>
          <div class="text-sm text-gray-500">
            {{ currentNetwork?.rpc_url || '网络描述' }}
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <button
            @click="showNetworkSwitcher = true"
            class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            切换网络
          </button>
        </div>
      </div>
    </div>

    <!-- 网络切换模态框 -->
    <div v-if="showNetworkSwitcher" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">切换网络</h3>
        <div class="space-y-3 mb-6">
          <div
            v-for="network in availableNetworks"
            :key="network.id"
            @click="switchNetwork(network.id)"
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
            @click="showNetworkSwitcher = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            取消
          </button>
        </div>
      </div>
    </div>

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
      @reset-filters="resetFilters"
    />

    <!-- 操作按钮 -->
    <EnergyPoolActions 
      :loading="loading"
      :selected-accounts="selectedAccounts"
      @refresh-status="() => refreshStatus()"
      @show-add-modal="showAddModal = true"
      @batch-enable="batchEnable"
      @batch-disable="batchDisable"
      @show-batch-network-modal="showBatchNetworkModal = true"
    />

    <!-- 账户列表表格 -->
    <EnergyPoolTable
      :filtered-accounts="filteredAccounts"
      :selected-accounts="selectedAccounts"
      :is-all-selected="isAllSelected"
      :loading="loading"
      :format-energy="formatEnergy"
      :format-address="formatAddress"
      :get-status-class="getStatusClass"
      :get-status-text="getStatusText"
      :get-account-type-text="getAccountTypeText"
      :get-account-type-class="getAccountTypeClass"
      @toggle-select-all="toggleSelectAll"
      @toggle-account-selection="toggleAccountSelection"

      @confirm-disable-account="confirmDisableAccount"
      @confirm-enable-account="confirmEnableAccount"

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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 组件导入
import EnergyPoolActions from './components/EnergyPoolActions.vue'
import EnergyPoolFilters from './components/EnergyPoolFilters.vue'
import EnergyPoolHeader from './components/EnergyPoolHeader.vue'
import EnergyPoolStats from './components/EnergyPoolStats.vue'
import EnergyPoolTable from './components/EnergyPoolTable.vue'

// 模态框组件导入
import AccountDetailsModal from './components/AccountDetailsModal.vue'
import AccountModal from './components/AccountModal.vue'
import BatchNetworkModal from './components/BatchNetworkModal.vue'

// composable导入
import { useNetworkStore } from '@/stores/network'
import { useEnergyPool, type EnergyPoolAccount } from './composables/useEnergyPool'

const {
  statistics,
  accounts,
  loading,
  todayConsumption,
  loadStatistics,
  loadAccounts,
  loadNetworks,
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

const showBatchNetworkModal = ref(false)
const selectedAccount = ref<EnergyPoolAccount | null>(null)
const accountToDelete = ref(null)
const accountToToggle = ref(null)
const toggleAction = ref<'enable' | 'disable'>('enable')

// 路由和网络状态管理
const route = useRoute()
const router = useRouter()
const networkStore = useNetworkStore()

// 从路由参数获取当前网络ID
const currentNetworkId = computed(() => route.params.networkId as string)

// 网络切换相关状态
const showNetworkSwitcher = ref(false)

// 计算当前网络信息
const currentNetwork = computed(() => {
  return networkStore.networks.find(network => network.id === currentNetworkId.value)
})

// 可用网络列表 - 只显示活跃的网络
const availableNetworks = computed(() => networkStore.networks.filter(network => network.is_active))

// 筛选和搜索状态
const selectedAccounts = ref<string[]>([])
const searchQuery = ref('')
const statusFilter = ref('')

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
    if (currentNetworkId.value) {
      await loadAccounts(currentNetworkId.value)
      await loadStatistics()
    }
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

// 网络切换方法
const switchNetwork = async (networkId: string) => {
  showNetworkSwitcher.value = false
  if (networkId !== currentNetworkId.value) {
    // 检查当前路由，决定跳转目标
    const currentRoute = route.name
    if (currentRoute === 'config-energy-pools-network') {
      // 从配置管理进入，跳转到配置管理的其他网络页面
      await router.push(`/config/energy-pools/${networkId}`)
    } else {
      // 从能量池管理进入，跳转到能量池管理的其他网络页面
      await router.push(`/energy-pool/${networkId}/accounts`)
    }
  }
}

// 监听网络ID变化，重新加载账户数据和统计信息
watch(currentNetworkId, async (newNetworkId) => {
  console.log('🔍 [EnergyPool] 网络变化:', newNetworkId);
  if (newNetworkId) {
    // 设置当前网络到store
    networkStore.setCurrentNetwork(newNetworkId)
    
    await Promise.all([
      loadAccounts(newNetworkId),
      loadStatistics(),
      loadTodayConsumption()
    ]);
  } else {
    // 如果没有网络ID，清空账户数据
    accounts.value = [];
  }
}, { immediate: true });

const handleAccountAdded = () => {
  showAddModal.value = false
  if (currentNetworkId.value) {
    loadAccounts(currentNetworkId.value)
    loadStatistics()
  }
}

const handleAccountUpdated = () => {
  showEditModal.value = false
  selectedAccount.value = null
  if (currentNetworkId.value) {
    loadAccounts(currentNetworkId.value)
    loadStatistics()
  }
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
}




const batchEnable = async () => {
  loading.batch = true
  try {
    for (const accountId of selectedAccounts.value) {
      await enableAccount(accountId)
    }
    selectedAccounts.value = []
    if (currentNetworkId.value) {
      await loadAccounts(currentNetworkId.value)
      await loadStatistics()
    }
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
    if (currentNetworkId.value) {
      await loadAccounts(currentNetworkId.value)
      await loadStatistics()
    }
  } catch (error) {
    console.error('Failed to batch disable accounts:', error)
  } finally {
    loading.batch = false
  }
}








const handleBatchNetworkUpdated = () => {
  showBatchNetworkModal.value = false
  selectedAccounts.value = []
  if (currentNetworkId.value) {
    loadAccounts(currentNetworkId.value)
  }
}

onMounted(async () => {
  console.log('🚀 [EnergyPool] 页面初始化');
  
  try {
    // 初始化网络状态管理store
    await networkStore.loadNetworks();
    
    console.log('✅ [EnergyPool] 页面初始化完成，当前网络:', currentNetworkId.value);
  } catch (error) {
    console.error('❌ [EnergyPool] 页面初始化失败:', error);
  }
})
</script>

<style scoped>
.energy-pool-page {
  @apply p-6;
}
</style>
