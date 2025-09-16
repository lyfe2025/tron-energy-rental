<template>
  <div class="delegate-records">
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
          <option value="delegate">委托</option>
          <option value="undelegate">取消委托</option>
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
    <div v-else-if="delegateRecords.length > 0" class="space-y-4">
      <div
        v-for="record in delegateRecords"
        :key="record.id"
        class="bg-gray-50 rounded-lg p-4 border border-gray-200"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- 操作类型图标 -->
            <div
              :class="[
                'p-2 rounded-full',
                record.operationType === 'delegate' ? 'bg-blue-100' : 'bg-orange-100'
              ]"
            >
              <svg
                v-if="record.operationType === 'delegate'"
                class="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7h-4m0 0l-4-4m4 4l-4 4m0 6h12m0 0l-4-4m4 4l-4 4" />
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
                <span class="ml-4">
                  目标地址: {{ formatAddress(record.toAddress) }}
                </span>
                <span v-if="record.lockPeriod" class="ml-4">
                  锁定期: {{ record.lockPeriod }}天
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
            <button
              v-if="record.operationType === 'delegate' && record.status === 'success'"
              @click="undelegateResource(record)"
              class="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
            >
              取消委托
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
              <span class="text-gray-600">接收方地址:</span>
              <span class="ml-2 font-mono text-gray-900">{{ formatAddress(record.toAddress) }}</span>
            </div>
            <div>
              <span class="text-gray-600">接收方:</span>
              <span class="ml-2 font-mono text-gray-900">{{ formatAddress(record.toAddress) }}</span>
            </div>
            <div>
              <span class="text-gray-600">创建时间:</span>
              <span class="ml-2 text-gray-900">{{ formatDate(record.createdAt) }}</span>
            </div>
            <div v-if="record.expireTime">
              <span class="text-gray-600">到期时间:</span>
              <span class="ml-2 text-gray-900">{{ formatDate(record.expireTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无委托记录</h3>
      <p class="text-gray-600">当前没有找到任何委托记录</p>
    </div>

    <!-- 分页 -->
    <div v-if="delegateRecords.length > 0 && pagination.totalPages > 1" class="mt-6 flex justify-center">
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

    <!-- 取消委托确认对话框 -->
    <div v-if="showUndelegateDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">确认取消委托</h3>
        <p class="text-gray-600 mb-6">
          确定要取消委托 {{ formatTrx(selectedRecord?.amount || 0) }} 给 {{ formatAddress(selectedRecord?.toAddress || '') }} 吗？
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="cancelUndelegate"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            取消
          </button>
          <button
            @click="confirmUndelegate"
            :disabled="undelegating"
            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {{ undelegating ? '处理中...' : '确认取消' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNetworkStore } from '@/stores/network';
import { onMounted, reactive, ref, watch } from 'vue';
import { useEnergyPool } from '../composables/useEnergyPool';
import type { DelegateRecord } from '../composables/useStake';
import { useStake } from '../composables/useStake';

// Props
const props = defineProps<{
  poolId: string      // 实际上是网络ID
  networkId: string   // 网络ID
  accountId: string   // 能量池账户ID
}>()

// 组合式函数
const {
  loading,
  error,
  delegateRecords,
  pagination,
  loadDelegateRecords,
  undelegateResource: performUndelegate,
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

// 状态
const showUndelegateDialog = ref(false)
const selectedRecord = ref<DelegateRecord | null>(null)
const undelegating = ref(false)

// 筛选器
const filters = reactive({
  operationType: '' as '' | 'delegate' | 'undelegate',
  resourceType: '' as '' | 'ENERGY' | 'BANDWIDTH',
  startDate: '',
  endDate: ''
})

// 方法
const loadRecords = async () => {
  if (!props.poolId) return
  
  await loadDelegateRecords({
    poolAccountId: props.accountId,  // 使用 accountId 作为能量池账户ID
    networkId: props.networkId,      // 使用 networkId 作为网络ID
    page: pagination.page,
    limit: pagination.limit,
    operationType: (filters.operationType || undefined) as 'delegate' | 'undelegate' | undefined,
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
  console.log('🔍 [DelegateRecords] viewTransaction 被调用:', {
    txid: txid,
    poolId: props.poolId,
    networkId: props.networkId,
    availableNetworks: networkStore.networks.length
  })
  
  if (!txid) {
    console.warn('[DelegateRecords] ⚠️ 交易ID为空，无法查看')
    return
  }

  // 根据传入的 networkId 找到对应的网络配置
  const targetNetwork = networkStore.networks.find(network => network.id === props.networkId)
  let explorerUrl = 'https://tronscan.org' // 默认主网浏览器

  if (targetNetwork?.explorer_url) {
    explorerUrl = targetNetwork.explorer_url
    console.log('✅ [DelegateRecords] 使用目标网络的浏览器URL:', explorerUrl, '网络:', targetNetwork.name)
  } else {
    console.log('⚠️ [DelegateRecords] 目标网络没有配置浏览器URL或网络不存在，使用默认浏览器URL', {
      networkId: props.networkId,
      foundNetwork: !!targetNetwork
    })
  }

  const url = `${explorerUrl}/#/transaction/${txid}`
  console.log('🚀 [DelegateRecords] 最终URL:', url)
  
  const newWindow = window.open(url, '_blank')
  if (!newWindow) {
    console.error('❌ [DelegateRecords] 弹窗被浏览器阻止！')
    alert(`弹窗被阻止，请手动打开: ${url}`)
  }
}

const undelegateResource = (record: DelegateRecord) => {
  selectedRecord.value = record
  showUndelegateDialog.value = true
}

const cancelUndelegate = () => {
  showUndelegateDialog.value = false
  selectedRecord.value = null
}

const confirmUndelegate = async () => {
  if (!selectedRecord.value || !props.poolId) return
  
  try {
    undelegating.value = true
    await performUndelegate({
      networkId: props.poolId,        // props.poolId 实际上是 networkId
      poolAccountId: props.accountId, // 使用 props.accountId 作为 poolAccountId
      resourceType: selectedRecord.value.resourceType,
      amount: selectedRecord.value.amount,
      toAddress: selectedRecord.value.toAddress
    })
    
    // 刷新记录列表
    await loadRecords()
    
    // 关闭对话框
    showUndelegateDialog.value = false
    selectedRecord.value = null
  } catch (error) {
    console.error('取消委托失败:', error)
  } finally {
    undelegating.value = false
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
.delegate-records {
  @apply w-full;
}
</style>