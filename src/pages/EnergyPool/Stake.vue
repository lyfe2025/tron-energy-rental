<template>
  <div class="stake-management-page">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">质押管理</h1>
        <p class="text-gray-600 mt-1">管理TRON质押2.0，包括TRX质押、资源委托和解质押操作</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="refreshData"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>刷新</span>
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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

    <!-- 能量池选择 -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">选择能量池账户</label>
      <select
        v-model="selectedPoolId"
        @change="onPoolChange"
        class="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">请选择能量池账户</option>
        <option v-for="account in energyPoolAccounts" :key="account.id" :value="account.id">
          {{ account.name }} ({{ formatAddress(account.tron_address) }})
        </option>
      </select>
    </div>

    <!-- 质押概览卡片 -->
    <div v-if="selectedPoolId && overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">总质押金额</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.totalStaked) }}</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">总委托资源</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatEnergy(overview.totalDelegated) }}</p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">解质押中</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.totalUnfreezing) }}</p>
          </div>
          <div class="p-3 bg-yellow-100 rounded-full">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">可提取金额</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.availableToWithdraw) }}</p>
          </div>
          <div class="p-3 bg-purple-100 rounded-full">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">质押收益</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.stakingRewards) }}</p>
          </div>
          <div class="p-3 bg-indigo-100 rounded-full">
            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">委托收益</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatTrx(overview.delegationRewards) }}</p>
          </div>
          <div class="p-3 bg-teal-100 rounded-full">
            <svg class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="selectedPoolId" class="mb-8">
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
            :disabled="!overview?.availableToWithdraw || overview.availableToWithdraw <= 0"
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
    <div v-if="selectedPoolId" class="bg-white rounded-lg shadow-sm border border-gray-200">
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
          <StakeRecords :pool-id="selectedPoolId" />
        </div>

        <!-- 委托记录 -->
        <div v-if="activeTab === 'delegate'">
          <DelegateRecords :pool-id="selectedPoolId" />
        </div>

        <!-- 解质押记录 -->
        <div v-if="activeTab === 'unfreeze'">
          <UnfreezeRecords :pool-id="selectedPoolId" />
        </div>
      </div>
    </div>

    <!-- 质押模态框 -->
    <StakeModal
      v-if="showStakeModal"
      :pool-id="selectedPoolId"
      @close="showStakeModal = false"
      @success="onOperationSuccess"
    />

    <!-- 解质押模态框 -->
    <UnstakeModal
      v-if="showUnstakeModal"
      :pool-id="selectedPoolId"
      @close="showUnstakeModal = false"
      @success="onOperationSuccess"
    />

    <!-- 委托模态框 -->
    <DelegateModal
      v-if="showDelegateModal"
      :pool-id="selectedPoolId"
      @close="showDelegateModal = false"
      @success="onOperationSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useStake } from './composables/useStake'
import { useEnergyPool } from './composables/useEnergyPool'
import StakeRecords from './components/StakeRecords.vue'
import DelegateRecords from './components/DelegateRecords.vue'
import UnfreezeRecords from './components/UnfreezeRecords.vue'
import StakeModal from './components/StakeModal.vue'
import UnstakeModal from './components/UnstakeModal.vue'
import DelegateModal from './components/DelegateModal.vue'

// 组合式函数
const {
  loading,
  error,
  overview,
  loadOverview,
  withdrawUnfrozen,
  formatTrx,
  formatEnergy,
  formatAddress
} = useStake()

const {
  accounts: energyPoolAccounts,
  loadAccounts
} = useEnergyPool()

// 响应式状态
const selectedPoolId = ref('')
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

// 方法
const onPoolChange = async () => {
  if (selectedPoolId.value) {
    await loadOverview(selectedPoolId.value)
  }
}

const refreshData = async () => {
  await loadAccounts()
  if (selectedPoolId.value) {
    await loadOverview(selectedPoolId.value)
  }
}

const handleWithdraw = async () => {
  if (!selectedPoolId.value) return
  
  try {
    const result = await withdrawUnfrozen(selectedPoolId.value)
    if (result) {
      // 刷新数据
      await loadOverview(selectedPoolId.value)
      // 显示成功消息
      alert(`提取成功！交易ID: ${result.txid}，提取金额: ${formatTrx(result.amount)}`)
    }
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
  if (selectedPoolId.value) {
    await loadOverview(selectedPoolId.value)
  }
}

// 生命周期
onMounted(async () => {
  await loadAccounts()
})
</script>

<style scoped>
.stake-management-page {
  @apply min-h-screen bg-gray-50 p-6;
}
</style>