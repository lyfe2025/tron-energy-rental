<template>
  <div class="energy-pool-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="text-2xl font-bold text-gray-900">能量池管理</h1>
      <p class="text-gray-600 mt-1">管理能量池账户、监控库存状态和配置自动调度</p>
    </div>

    <!-- 今日消耗统计 -->
    <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold mb-2">今日能量消耗统计</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p class="text-sm opacity-90">消耗能量</p>
              <p class="text-2xl font-bold">{{ formatEnergy(todayConsumption?.total_consumed_energy || 0) }}</p>
            </div>
            <div>
              <p class="text-sm opacity-90">总成本</p>
              <p class="text-2xl font-bold">{{ (todayConsumption?.total_cost || 0).toFixed(6) }} TRX</p>
            </div>
            <div>
              <p class="text-sm opacity-90">交易次数</p>
              <p class="text-2xl font-bold">{{ todayConsumption?.total_transactions || 0 }}</p>
            </div>
          </div>
        </div>
        <div class="text-right">
          <button
            @click="loadTodayConsumption"
            :disabled="loading.statistics"
            class="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw :class="['h-4 w-4', { 'animate-spin': loading.statistics }]" />
          </button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Database class="h-6 w-6 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总账户数</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics.totalAccounts }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <CheckCircle class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">活跃账户</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics.activeAccounts }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <Zap class="h-6 w-6 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">总能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.totalEnergy) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg">
            <Battery class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">可用能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.availableEnergy) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-orange-100 rounded-lg">
            <Lock class="h-6 w-6 text-orange-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">预留能量</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(statistics.reservedEnergy) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-red-100 rounded-lg">
            <DollarSign class="h-6 w-6 text-red-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">平均成本</p>
            <p class="text-2xl font-bold text-gray-900">{{ typeof statistics.averageCost === 'number' ? statistics.averageCost.toFixed(6) : '0.000000' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex flex-wrap gap-4 mb-6">
      <button
        @click="refreshStatus"
        :disabled="loading.refresh"
        class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': loading.refresh }]" />
        刷新状态
      </button>
      

      
      <button
        @click="showAddModal = true"
        class="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        <Plus class="h-4 w-4 mr-2" />
        添加账户
      </button>
    </div>

    <!-- 账户列表 -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">能量池账户</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账户信息</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">优先级</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总能量</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">可用能量</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成本/能量</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="account in accounts" :key="account.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Wallet class="h-5 w-5 text-indigo-600" />
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ account.name }}</div>
                    <div class="text-sm text-gray-500">{{ formatAddress(account.tron_address) }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getAccountTypeClass(account.account_type)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ getAccountTypeText(account.account_type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ account.priority || 50 }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(account.status)" class="px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full">
                  {{ getStatusText(account.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatEnergy(account.total_energy) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatEnergy(account.available_energy) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ account.cost_per_energy }} TRX
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <!-- 维护中状态显示特殊按钮 -->
                  <button
                    v-if="account.status === 'maintenance'"
                    class="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 cursor-not-allowed"
                    title="账户维护中"
                    disabled
                  >
                    <Power class="h-4 w-4" />
                  </button>
                  <!-- 启用状态显示停用按钮 -->
                  <button
                    v-else-if="account.status === 'active'"
                    @click="confirmDisableAccount(account)"
                    :disabled="loading.accounts"
                    class="text-red-600 hover:text-red-900 disabled:opacity-50"
                    title="停用账户"
                  >
                    <Power class="h-4 w-4" />
                  </button>
                  <!-- 停用状态显示启用按钮 -->
                  <button
                    v-else
                    @click="confirmEnableAccount(account)"
                    :disabled="loading.accounts"
                    class="text-green-600 hover:text-green-900 disabled:opacity-50"
                    title="启用账户"
                  >
                    <Play class="h-4 w-4" />
                  </button>
                  <button
                    @click="editAccount(account)"
                    class="text-indigo-600 hover:text-indigo-900"
                    title="编辑账户"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  <button
                    @click="viewDetails(account)"
                    class="text-gray-600 hover:text-gray-900"
                    title="查看详情"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDeleteAccount(account)"
                    class="text-red-600 hover:text-red-900"
                    title="删除账户"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="accounts.length === 0" class="text-center py-12">
        <Database class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">暂无账户</h3>
        <p class="mt-1 text-sm text-gray-500">开始添加能量池账户来管理能量资源</p>
      </div>
    </div>

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


  </div>
</template>

<script setup lang="ts">
import {
  Battery,
  CheckCircle,
  Database,
  DollarSign,
  Edit,
  Eye,
  Lock,
  Play,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  Wallet,
  Zap
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import AccountDetailsModal from './EnergyPool/components/AccountDetailsModal.vue'
import AccountModal from './EnergyPool/components/AccountModal.vue'
import { useEnergyPool, type EnergyPoolAccount } from './EnergyPool/composables/useEnergyPool'

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

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDetailsModal = ref(false)
const showDeleteConfirm = ref(false)
const showEnableConfirm = ref(false)
const showDisableConfirm = ref(false)
const selectedAccount = ref<EnergyPoolAccount | null>(null)
const accountToDelete = ref(null)
const accountToToggle = ref(null)
const toggleAction = ref<'enable' | 'disable'>('enable')

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
  @apply p-6 max-w-7xl mx-auto;
}

.page-header {
  @apply mb-8;
}
</style>