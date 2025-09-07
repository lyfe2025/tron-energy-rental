<template>
  <div class="account-network-selector">
    <!-- 选择器标题 -->
    <div class="mb-6 text-center">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ title || '选择账户和网络' }}</h3>
      <p class="text-sm text-gray-600">{{ description || '请先选择要操作的账户和网络，然后继续进行质押管理操作' }}</p>
    </div>

    <!-- 当前选择显示 -->
    <div v-if="selectedAccount && selectedNetwork && !showSelector" class="selected-display">
      <div class="space-y-4">
        <!-- 选中的账户 -->
        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div class="flex items-center space-x-3">
            <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User class="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ selectedAccount.name }}</h4>
              <div class="flex items-center space-x-2 text-sm text-gray-500">
                <span>{{ formatAddress(selectedAccount.tron_address) }}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="getAccountStatusClass(selectedAccount.status)">
                  {{ getAccountStatusText(selectedAccount.status) }}
                </span>
              </div>
            </div>
          </div>
          <div class="text-right text-sm text-gray-500">
            <div>能量: {{ formatNumber(selectedAccount.available_energy) }}</div>
            <div>带宽: {{ formatNumber(selectedAccount.available_bandwidth) }}</div>
          </div>
        </div>

        <!-- 选中的网络 -->
        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div class="flex items-center space-x-3">
            <div class="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Network class="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 class="font-medium text-gray-900">{{ selectedNetwork.name }}</h4>
              <div class="flex items-center space-x-2 text-sm text-gray-500">
                <span>{{ selectedNetwork.type }}</span>
                <span v-if="selectedNetwork.chain_id">• Chain ID: {{ selectedNetwork.chain_id }}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      :class="selectedNetwork.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ selectedNetwork.is_active ? '活跃' : '非活跃' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 重新选择按钮 -->
        <div class="flex justify-center pt-4">
          <button
            @click="showSelector = true"
            class="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
          >
            重新选择
          </button>
        </div>
      </div>
    </div>

    <!-- 选择器界面 -->
    <div v-if="!selectedAccount || !selectedNetwork || showSelector" class="selector-interface">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 网络选择 -->
        <div class="network-selection">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              选择TRON网络 <span class="text-red-500">*</span>
            </label>
            <div class="text-sm text-gray-500 mb-3">
              选择要操作的TRON网络环境
            </div>
          </div>

          <!-- 网络搜索框 -->
          <div class="mb-4">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="networkSearchQuery"
                type="text"
                placeholder="搜索网络..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- 网络列表 -->
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div v-if="filteredNetworks.length === 0" class="text-center py-8 text-gray-500">
              <Network class="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{{ networkSearchQuery ? '未找到匹配的网络' : '暂无可用网络' }}</p>
            </div>
            
            <div
              v-for="network in filteredNetworks"
              :key="network.id"
              class="network-option border rounded-lg p-3 cursor-pointer transition-all duration-200"
              :class="{
                'border-blue-500 bg-blue-50 ring-2 ring-blue-200': tempSelectedNetworkId === network.id,
                'border-gray-200 hover:border-gray-300 hover:bg-gray-50': tempSelectedNetworkId !== network.id,
                'opacity-50 cursor-not-allowed': !network.is_active
              }"
              @click="selectNetwork(network)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Network class="h-4 w-4 text-green-600" />
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center space-x-2">
                      <h4 class="font-medium text-gray-900">{{ network.name }}</h4>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            :class="getNetworkTypeClass(network.type)">
                        {{ getNetworkTypeLabel(network.type) }}
                      </span>
                    </div>
                    <div class="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                      <span v-if="network.chain_id">Chain ID: {{ network.chain_id }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="network.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    {{ network.is_active ? '活跃' : '非活跃' }}
                  </span>
                  <div v-if="tempSelectedNetworkId === network.id" class="h-5 w-5 text-blue-600">
                    <Check class="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 账户选择 -->
        <div class="account-selection">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              选择能量池账户 <span class="text-red-500">*</span>
            </label>
            <div class="text-sm text-gray-500 mb-3">
              {{ tempSelectedNetworkId ? '选择要操作的账户' : '请先选择网络' }}
            </div>
          </div>

          <!-- 账户搜索框 -->
          <div class="mb-4">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="accountSearchQuery"
                type="text"
                placeholder="搜索账户..."
                :disabled="!tempSelectedNetworkId"
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <!-- 账户列表 -->
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div v-if="!tempSelectedNetworkId" class="text-center py-8 text-gray-400">
              <User class="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>请先选择网络</p>
            </div>
            
            <div v-else-if="loadingAccounts" class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p class="text-gray-600">加载账户列表...</p>
            </div>
            
            <div v-else-if="filteredAccounts.length === 0" class="text-center py-8 text-gray-500">
              <User class="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{{ accountSearchQuery ? '未找到匹配的账户' : '该网络下暂无可用账户' }}</p>
            </div>
            
            <div
              v-for="account in filteredAccounts"
              :key="account.id"
              class="account-option border rounded-lg p-3 cursor-pointer transition-all duration-200"
              :class="{
                'border-blue-500 bg-blue-50 ring-2 ring-blue-200': tempSelectedAccountId === account.id,
                'border-gray-200 hover:border-gray-300 hover:bg-gray-50': tempSelectedAccountId !== account.id,
                'opacity-50 cursor-not-allowed': account.status !== 'active'
              }"
              @click="selectAccount(account)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User class="h-4 w-4 text-blue-600" />
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center space-x-2">
                      <h4 class="font-medium text-gray-900">{{ account.name }}</h4>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            :class="getAccountStatusClass(account.status)">
                        {{ getAccountStatusText(account.status) }}
                      </span>
                    </div>
                    <div class="text-sm text-gray-500 mt-1">
                      <div>{{ formatAddress(account.tron_address) }}</div>
                      <div class="flex items-center space-x-2 mt-1">
                        <span>能量: {{ formatNumber(account.available_energy) }}</span>
                        <span>•</span>
                        <span>带宽: {{ formatNumber(account.available_bandwidth) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex items-center">
                  <div v-if="tempSelectedAccountId === account.id" class="h-5 w-5 text-blue-600">
                    <Check class="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-center space-x-4 mt-8 pt-6 border-t border-gray-200">
        <button
          v-if="showSelector"
          @click="cancelSelection"
          class="px-6 py-2 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="confirmSelection"
          :disabled="!tempSelectedNetworkId || !tempSelectedAccountId"
          class="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          确认选择
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loadingNetworks" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-2 text-gray-600">加载网络列表...</span>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="text-center py-8">
      <div class="text-red-600 mb-2">{{ error }}</div>
      <button
        @click="loadData"
        class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        重新加载
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { networkApi } from '@/api/network'
import { energyPoolExtendedAPI } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import type { TronNetwork } from '@/types/network'
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI'
import { Check, Network, Search, User } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'

interface Props {
  title?: string
  description?: string
  accountId?: string | null
  networkId?: string | null
  disabled?: boolean
}

interface Emits {
  (e: 'update:accountId', value: string | null): void
  (e: 'update:networkId', value: string | null): void
  (e: 'change', data: { account: EnergyPoolAccount | null; network: TronNetwork | null }): void
  (e: 'confirm', data: { account: EnergyPoolAccount; network: TronNetwork }): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '选择账户和网络',
  description: '请先选择要操作的账户和网络，然后继续进行质押管理操作'
})

const emit = defineEmits<Emits>()

// 响应式数据
const networks = ref<TronNetwork[]>([])
const accounts = ref<EnergyPoolAccount[]>([])
const loadingNetworks = ref(false)
const loadingAccounts = ref(false)
const error = ref<string | null>(null)
const networkSearchQuery = ref('')
const accountSearchQuery = ref('')
const showSelector = ref(true)
const tempSelectedNetworkId = ref<string | null>(null)
const tempSelectedAccountId = ref<string | null>(null)

// 计算属性
const selectedNetwork = computed(() => {
  return networks.value.find(n => n.id === props.networkId) || null
})

const selectedAccount = computed(() => {
  return accounts.value.find(a => a.id === props.accountId) || null
})

const filteredNetworks = computed(() => {
  let filtered = networks.value.filter(n => n.is_active)
  
  if (networkSearchQuery.value.trim()) {
    const query = networkSearchQuery.value.toLowerCase()
    filtered = filtered.filter(n => 
      n.name.toLowerCase().includes(query) ||
      n.type.toLowerCase().includes(query) ||
      (n.chain_id && String(n.chain_id).toLowerCase().includes(query))
    )
  }
  
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

const filteredAccounts = computed(() => {
  let filtered = accounts.value.filter(a => a.status === 'active')
  
  if (accountSearchQuery.value.trim()) {
    const query = accountSearchQuery.value.toLowerCase()
    filtered = filtered.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.tron_address.toLowerCase().includes(query)
    )
  }
  
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

// 方法
const loadNetworks = async () => {
  try {
    loadingNetworks.value = true
    error.value = null
    const response = await networkApi.getNetworks()
    networks.value = Array.isArray(response.data?.networks) ? response.data.networks : []
  } catch (err: any) {
    error.value = err.message || '加载网络列表失败'
    console.error('❌ [AccountNetworkSelector] 加载网络列表失败:', err)
  } finally {
    loadingNetworks.value = false
  }
}

const loadAccounts = async (networkId: string) => {
  try {
    loadingAccounts.value = true
    const response = await energyPoolExtendedAPI.getAccounts()
    if (response.data.success && response.data.data) {
      accounts.value = response.data.data
    } else {
      accounts.value = []
    }
  } catch (err: any) {
    console.error('❌ [AccountNetworkSelector] 加载账户列表失败:', err)
    accounts.value = []
  } finally {
    loadingAccounts.value = false
  }
}

const loadData = async () => {
  await loadNetworks()
  if (tempSelectedNetworkId.value) {
    await loadAccounts(tempSelectedNetworkId.value)
  }
}

const selectNetwork = (network: TronNetwork) => {
  if (!network.is_active) return
  
  tempSelectedNetworkId.value = network.id
  tempSelectedAccountId.value = null // 重置账户选择
  accountSearchQuery.value = '' // 清空账户搜索
  
  // 加载该网络下的账户
  loadAccounts(network.id)
}

const selectAccount = (account: EnergyPoolAccount) => {
  if (account.status !== 'active') return
  
  tempSelectedAccountId.value = account.id
}

const confirmSelection = () => {
  if (!tempSelectedNetworkId.value || !tempSelectedAccountId.value) return
  
  const network = networks.value.find(n => n.id === tempSelectedNetworkId.value)
  const account = accounts.value.find(a => a.id === tempSelectedAccountId.value)
  
  if (network && account) {
    emit('update:networkId', network.id)
    emit('update:accountId', account.id)
    emit('change', { network, account })
    emit('confirm', { network, account })
    showSelector.value = false
  }
}

const cancelSelection = () => {
  showSelector.value = false
  tempSelectedNetworkId.value = props.networkId
  tempSelectedAccountId.value = props.accountId
}

// 工具方法
const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const getNetworkTypeClass = (type: string) => {
  switch (type) {
    case 'mainnet':
      return 'bg-green-100 text-green-800'
    case 'testnet':
      return 'bg-yellow-100 text-yellow-800'
    case 'private':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getNetworkTypeLabel = (type: string) => {
  switch (type) {
    case 'mainnet':
      return '主网'
    case 'testnet':
      return '测试网'
    case 'private':
      return '私有网'
    default:
      return type
  }
}

const getAccountStatusClass = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-red-100 text-red-800'
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getAccountStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '已启用'
    case 'inactive':
      return '已停用'
    case 'maintenance':
      return '维护中'
    default:
      return status
  }
}

// 监听器
watch(() => [props.accountId, props.networkId], ([accountId, networkId]) => {
  tempSelectedAccountId.value = accountId
  tempSelectedNetworkId.value = networkId
  
  // 如果都有值，隐藏选择器
  if (accountId && networkId) {
    showSelector.value = false
  }
})

watch(() => tempSelectedNetworkId.value, (newNetworkId) => {
  if (newNetworkId && newNetworkId !== props.networkId) {
    loadAccounts(newNetworkId)
  }
})

// 生命周期
onMounted(() => {
  loadNetworks()
  
  // 初始化临时选择值
  tempSelectedNetworkId.value = props.networkId
  tempSelectedAccountId.value = props.accountId
  
  // 如果有初始网络ID，加载对应账户
  if (props.networkId) {
    loadAccounts(props.networkId)
  }
  
  // 如果都有初始值，隐藏选择器
  if (props.accountId && props.networkId) {
    showSelector.value = false
  }
})
</script>

<style scoped>
.account-network-selector {
  @apply w-full;
}

.network-option:hover,
.account-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.selected-display {
  animation: fadeIn 0.3s ease-in-out;
}

.selector-interface {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式样式通过Tailwind的响应式类处理 */
</style>