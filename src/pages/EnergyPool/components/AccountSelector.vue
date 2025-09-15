<template>
  <div class="account-selector">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">选择账户</h1>
        <p class="mt-2 text-gray-600">请选择要进行质押操作的账户</p>
      </div>
      <button
        v-if="!loading.accounts && accounts.length > 0"
        @click="fetchAllAccountsRealTimeData"
        :disabled="Object.values(loadingMap).some(loading => loading)"
        class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <div v-if="Object.values(loadingMap).some(loading => loading)" class="w-4 h-4 animate-spin border border-white border-t-transparent rounded-full"></div>
        <span>{{ Object.values(loadingMap).some(loading => loading) ? '刷新中...' : '刷新实时数据' }}</span>
      </button>
    </div>

    <!-- 网络信息 -->
    <div v-if="network" class="mb-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center space-x-3">
          <div :class="['w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold', getNetworkIconClass(network.type)]">
            {{ getNetworkIcon(network.type) }}
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ network.name }}</h3>
            <div class="flex items-center space-x-2">
              <span :class="['px-2 py-1 text-xs font-medium rounded-full', getNetworkStatusClass(network.is_active)]">
                {{ getNetworkStatusText(network.is_active) }}
              </span>
              <span class="text-sm text-gray-500">{{ getNetworkTypeText(network.type) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading.accounts" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">加载账户列表...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="text-center py-12">
      <AlertCircle class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p class="text-gray-600 mb-4">{{ error }}</p>
      <button
        @click="() => loadAccounts(props.network.id)"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        重新加载
      </button>
    </div>

    <!-- 账户列表 -->
    <div v-else-if="!loading.accounts && accounts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        @click="selectAccount(account)"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Wallet class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ account.name }}</h3>
              <p class="text-sm text-gray-500">{{ formatAddress(account.tron_address) }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click.stop="fetchAccountRealTimeData(account)"
              :disabled="loadingMap[account.id]"
              class="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 rounded transition-colors"
              title="刷新此账户实时数据"
            >
              <div v-if="loadingMap[account.id]" class="w-4 h-4 animate-spin border border-blue-500 border-t-transparent rounded-full"></div>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <span :class="['px-2 py-1 text-xs font-medium rounded-full', getStatusClass(account.status)]">
              {{ getStatusText(account.status) }}
            </span>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">账户类型:</span>
            <span :class="['font-medium', getAccountTypeClass(account.account_type)]">
              {{ getAccountTypeText(account.account_type) }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">总能量:</span>
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-900">
                {{ realTimeDataMap[account.id]?.energy?.total ? formatEnergy(realTimeDataMap[account.id].energy.total) : formatEnergy(account.total_energy) }}
              </span>
              <div v-if="loadingMap[account.id]" class="w-3 h-3 animate-spin border border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">可用能量:</span>
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-900">
                {{ realTimeDataMap[account.id]?.energy?.available ? formatEnergy(realTimeDataMap[account.id].energy.available) : formatEnergy(account.available_energy) }}
              </span>
              <span v-if="realTimeDataMap[account.id]" class="text-xs text-green-600 bg-green-50 px-1 py-0.5 rounded">实时</span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-100">
          <button
            :class="[
              'w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2',
              account.status === 'active' 
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
            :disabled="account.status !== 'active'"
          >
            <span>{{ account.status === 'active' ? '选择此账户' : '账户已停用' }}</span>
            <ExternalLink v-if="account.status === 'active'" class="w-4 h-4" />
            <AlertCircle v-else class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading.accounts && accounts.length === 0" class="text-center py-12">
      <Wallet class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-semibold text-gray-900 mb-2">暂无可用账户</h3>
      <p class="text-gray-600 mb-6">当前网络下没有可用的账户，请先添加账户。</p>
      <button
        @click="goToAccountManagement"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        前往账户管理
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRealTimeAccountData, type RealTimeAccountData } from '@/composables/useRealTimeAccountData'
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import type { Network } from '@/stores/network'
import { getNetworkIcon, getNetworkIconClass, getNetworkStatusClass, getNetworkStatusText, getNetworkTypeText } from '@/utils/network'
import { AlertCircle, ExternalLink, Wallet } from 'lucide-vue-next'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEnergyPool } from '../composables/useEnergyPool'

interface Props {
  network: Network
}

interface Emits {
  (e: 'select', account: EnergyPoolAccount): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

// 使用组合式函数
const {
  accounts,
  loading,
  loadAccounts,
  formatAddress,
  formatEnergy,
  getStatusClass,
  getStatusText,
  getAccountTypeClass,
  getAccountTypeText
} = useEnergyPool()

// 实时数据管理
const realTimeDataMap = reactive<Record<string, RealTimeAccountData>>({})
const loadingMap = reactive<Record<string, boolean>>({})

// 格式化 TRX 余额
const formatTrx = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '0'
  return (amount / 1_000_000).toLocaleString('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 6 
  }) + ' TRX'
}

// 添加错误状态
const error = ref<string | null>(null)

// 获取单个账户的实时数据
const fetchAccountRealTimeData = async (account: EnergyPoolAccount) => {
  if (!account.tron_address || !props.network?.id) return

  console.log('🔍 [AccountSelector] 获取账户实时数据:', account.name)
  
  loadingMap[account.id] = true
  
  try {
    const realTimeData = useRealTimeAccountData()
    const data = await realTimeData.fetchRealTimeData(
      account.tron_address,
      props.network.id,
      false // 不显示错误提示，避免过多提示
    )
    
    if (data) {
      realTimeDataMap[account.id] = data
      console.log('✅ [AccountSelector] 账户实时数据获取成功:', account.name)
    }
  } catch (error) {
    console.warn('❌ [AccountSelector] 账户实时数据获取失败:', account.name, error)
  } finally {
    loadingMap[account.id] = false
  }
}

// 批量获取所有账户的实时数据
const fetchAllAccountsRealTimeData = async () => {
  if (accounts.value.length === 0) return
  
  console.log('🔍 [AccountSelector] 批量获取所有账户实时数据')
  
  // 并发获取所有账户的实时数据，但限制并发数量避免过多请求
  const concurrentLimit = 3
  const chunks = []
  for (let i = 0; i < accounts.value.length; i += concurrentLimit) {
    chunks.push(accounts.value.slice(i, i + concurrentLimit))
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(account => fetchAccountRealTimeData(account)))
    // 小延迟避免过多并发请求
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}


// 选择账户
const selectAccount = async (account: EnergyPoolAccount) => {
  if (account.status !== 'active') {
    return
  }
  
  emit('select', account)
}

// 前往账户管理
const goToAccountManagement = () => {
  router.push(`/config/energy-pools/${props.network.id}`)
}

// 监听账户列表变化，自动获取实时数据
watch(accounts, async (newAccounts) => {
  if (newAccounts.length > 0 && props.network?.id) {
    console.log('🔍 [AccountSelector] 账户列表已加载，开始获取实时数据')
    await fetchAllAccountsRealTimeData()
  }
}, { immediate: false })

// 监听网络变化，清空实时数据
watch(() => props.network?.id, (newNetworkId, oldNetworkId) => {
  if (newNetworkId !== oldNetworkId) {
    // 清空旧的实时数据
    Object.keys(realTimeDataMap).forEach(key => {
      delete realTimeDataMap[key]
    })
    Object.keys(loadingMap).forEach(key => {
      delete loadingMap[key]
    })
  }
})

// 生命周期
onMounted(async () => {
  if (props.network) {
    await loadAccounts(props.network.id)
  }
})
</script>

<style scoped>
.account-selector {
  @apply max-w-7xl mx-auto;
}
</style>