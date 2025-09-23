<template>
  <div class="stake-records">
    <!-- 筛选器 -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
        <select
          v-model="filters.operationType"
          @change="loadRecords"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">全部</option>
          <option value="freeze">质押</option>
          <option value="unfreeze">解质押</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">资源类型</label>
        <select
          v-model="filters.resourceType"
          @change="loadRecords"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">全部</option>
          <option value="ENERGY">能量</option>
          <option value="BANDWIDTH">带宽</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
        <input
          v-model="filters.startDate"
          @change="loadRecords"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
        <input
          v-model="filters.endDate"
          @change="loadRecords"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="text-center py-8">
      <div class="text-red-600 mb-2">{{ error }}</div>
      <button
        @click="loadRecords"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        重试
      </button>
    </div>

    <!-- 记录列表 -->
    <div v-else-if="stakeRecords && stakeRecords.length > 0" class="space-y-4">
      <div
        v-for="record in stakeRecords"
        :key="record.id"
        class="bg-gray-50 rounded-lg p-4 border border-gray-200"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- 操作类型图标 -->
            <div
              :class="[
                'p-2 rounded-full',
                record.operationType === 'freeze' ? 'bg-green-100' : 'bg-red-100'
              ]"
            >
              <svg
                v-if="record.operationType === 'freeze'"
                class="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </div>

            <!-- 记录信息 -->
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-medium text-gray-900">
                  {{ getOperationTypeText(record.operationType) }}
                </span>
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getStatusClass(record.status)
                  ]"
                >
                  {{ getStatusText(record.status) }}
                </span>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {{ getResourceTypeText(record.resourceType) }}
                </span>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                金额: {{ formatTrx(record.amount) }}
                <span v-if="record.lockPeriod" class="ml-4">
                  锁定期: {{ record.lockPeriod }}天
                </span>
                <span v-if="record.unfreezeTime" class="ml-4">
                  解锁时间: {{ formatDate(record.unfreezeTime) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center space-x-2">
            <button
              @click="viewTransaction(record.txid)"
              class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              查看交易
            </button>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-gray-600">交易ID:</span>
              <span class="ml-2 font-mono text-gray-900">{{ formatAddress(record.txid) }}</span>
            </div>
            <div>
              <span class="text-gray-600">创建时间:</span>
              <span class="ml-2 text-gray-900">{{ formatDate(record.createdAt) }}</span>
            </div>
            <div v-if="record.unfreezeTime">
              <span class="text-gray-600">解锁时间:</span>
              <span class="ml-2 text-gray-900">{{ formatDate(record.unfreezeTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无质押记录</h3>
      <p class="text-gray-600">当前没有找到任何质押记录</p>
    </div>

    <!-- 分页 -->
    <div v-if="stakeRecords && stakeRecords.length > 0 && pagination.totalPages > 1" class="mt-6 flex justify-center">
      <nav class="flex items-center space-x-2">
        <button
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        
        <span class="px-3 py-2 text-sm text-gray-700">
          第 {{ pagination.page }} 页，共 {{ pagination.totalPages }} 页
        </span>
        
        <button
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNetworkStore } from '@/stores/useNetworkStore';
import { onMounted, reactive, watch } from 'vue';
import { useEnergyPool } from '../composables/useEnergyPool';
import { useStake } from '../composables/useStake';

// Props
const props = defineProps<{
  poolId: string
  networkId: string
}>()

// 组合式函数
const {
  loading,
  error,
  stakeRecords,
  pagination,
  loadStakeRecords,
  formatTrx,
  formatAddress,
  formatDate,
  getStatusClass,
  getStatusText,
  getResourceTypeText,
  getOperationTypeText
} = useStake()

// 能量池数据
const {
  accounts: energyPools,
  loadAccounts: loadEnergyPools
} = useEnergyPool()

// 网络存储
const networkStore = useNetworkStore()

// 筛选器
const filters = reactive({
  operationType: '' as '' | 'freeze' | 'unfreeze',
  resourceType: '' as '' | 'ENERGY' | 'BANDWIDTH',
  startDate: '',
  endDate: ''
})

// 方法
const loadRecords = async () => {
  if (!props.poolId) return
  
  await loadStakeRecords({
    poolAccountId: props.poolId,  // props.poolId 实际上对应 poolAccountId
    networkId: props.networkId,
    page: pagination.page,
    limit: pagination.limit,
    operationType: (filters.operationType || undefined) as 'freeze' | 'unfreeze' | undefined,
    resourceType: (filters.resourceType || undefined) as 'ENERGY' | 'BANDWIDTH' | undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined
  })
}

const changePage = async (page: number) => {
  if (page < 1 || page > pagination.totalPages) return
  pagination.page = page
  await loadRecords()
}

const viewTransaction = (txid: string) => {
  console.log('🔍 [StakeRecords] viewTransaction 被调用:', {
    txid: txid,
    poolId: props.poolId,
    networkId: props.networkId,
    availableNetworks: networkStore.networks.length
  })
  
  if (!txid) {
    console.warn('[StakeRecords] ⚠️ 交易ID为空，无法查看')
    return
  }

  // 根据传入的 networkId 找到对应的网络配置
  const targetNetwork = networkStore.networks.find(network => network.id === props.networkId)
  let explorerUrl = 'https://tronscan.org' // 默认主网浏览器

  if (targetNetwork?.explorer_url) {
    explorerUrl = targetNetwork.explorer_url
    console.log('✅ [StakeRecords] 使用目标网络的浏览器URL:', explorerUrl, '网络:', targetNetwork.name)
  } else {
    console.log('⚠️ [StakeRecords] 目标网络没有配置浏览器URL或网络不存在，使用默认浏览器URL', {
      networkId: props.networkId,
      foundNetwork: !!targetNetwork
    })
  }

  const url = `${explorerUrl}/#/transaction/${txid}`
  console.log('🚀 [StakeRecords] 最终URL:', url)
  
  const newWindow = window.open(url, '_blank')
  if (!newWindow) {
    console.error('❌ [StakeRecords] 弹窗被浏览器阻止！')
    alert(`弹窗被阻止，请手动打开: ${url}`)
  }
}

// 监听poolId变化
watch(
  () => props.poolId,
  (newPoolId) => {
    if (newPoolId) {
      pagination.page = 1
      loadRecords()
    }
  },
  { immediate: true }
)

// 生命周期
onMounted(async () => {
  // 先加载网络信息，这样 viewTransaction 才能找到对应的网络配置
  if (!networkStore.networks.length) {
    await networkStore.loadNetworks()
  }
  
  // 加载能量池数据
  await loadEnergyPools()
  
  if (props.poolId) {
    loadRecords()
  }
})
</script>

<style scoped>
.stake-records {
  @apply w-full;
}
</style>