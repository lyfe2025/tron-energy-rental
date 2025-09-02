<template>
  <div class="unfreeze-records">
    <!-- 筛选器 -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
    <div v-else-if="unfreezeRecords.length > 0" class="space-y-4">
      <div
        v-for="record in unfreezeRecords"
        :key="record.id"
        class="bg-gray-50 rounded-lg p-4 border border-gray-200"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- 状态图标 -->
            <div
              :class="[
                'p-2 rounded-full',
                getUnfreezeStatusColor(record)
              ]"
            >
              <svg
                v-if="record.status === 'available' && !isExpired(record.expireTime)"
                class="w-5 h-5 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else-if="record.status === 'available' && isExpired(record.expireTime)"
                class="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else-if="record.status === 'withdrawn'"
                class="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <!-- 记录信息 -->
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-medium text-gray-900">解质押</span>
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getUnfreezeStatusClass(record)
                  ]"
                >
                  {{ getUnfreezeStatusText(record) }}
                </span>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {{ getResourceTypeText(record.resourceType) }}
                </span>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                金额: {{ formatTrx(record.amount) }}
                <span class="ml-4">
                  到期时间: {{ formatDate(record.expireTime) }}
                </span>
                <span v-if="record.status === 'available' && !isExpired(record.expireTime)" class="ml-4 text-yellow-600">
                  剩余: {{ getTimeRemaining(record.expireTime) }}
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
              v-if="record.status === 'available' && isExpired(record.expireTime)"
              @click="withdrawFunds(record)"
              class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              提取资金
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
              <span class="text-gray-600">解质押时间:</span>
              <span class="ml-2 text-gray-900">{{ formatDate(record.createdAt) }}</span>
            </div>
            <div>
              <span class="text-gray-600">到期时间:</span>
              <span class="ml-2 text-gray-900">{{ formatDate(record.expireTime) }}</span>
            </div>
            <div v-if="record.status === 'withdrawn'">
              <span class="text-gray-600">状态:</span>
              <span class="ml-2 text-green-600">已提取</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无解质押记录</h3>
      <p class="text-gray-600">当前没有找到任何解质押记录</p>
    </div>

    <!-- 分页 -->
    <div v-if="unfreezeRecords.length > 0 && pagination.totalPages > 1" class="mt-6 flex justify-center">
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

    <!-- 提取确认对话框 -->
    <div v-if="showWithdrawDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">确认提取资金</h3>
        <p class="text-gray-600 mb-6">
          确定要提取 {{ formatTrx(selectedRecord?.amount || 0) }} 吗？
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="cancelWithdraw"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            取消
          </button>
          <button
            @click="confirmWithdraw"
            :disabled="withdrawing"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {{ withdrawing ? '处理中...' : '确认提取' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useStake } from '../composables/useStake'
import type { UnfreezeRecord } from '../composables/useStake'

// Props
const props = defineProps<{
  poolId: string
}>()

// 组合式函数
const {
  loading,
  error,
  unfreezeRecords,
  pagination,
  loadUnfreezeRecords,
  withdrawUnfrozen,
  formatTrx,
  formatAddress,
  formatDate,
  getResourceTypeText
} = useStake()

// 状态
const showWithdrawDialog = ref(false)
const selectedRecord = ref<UnfreezeRecord | null>(null)
const withdrawing = ref(false)

// 筛选器
const filters = reactive({
  resourceType: '' as '' | 'ENERGY' | 'BANDWIDTH',
  startDate: '',
  endDate: ''
})

// 方法
const loadRecords = async () => {
  if (!props.poolId) return
  
  await loadUnfreezeRecords({
    poolId: props.poolId,
    page: pagination.page,
    limit: pagination.limit,
    resourceType: filters.resourceType || undefined as 'ENERGY' | 'BANDWIDTH' | undefined,
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
  // 在新窗口中打开TRON区块链浏览器
  const url = `https://nile.tronscan.org/#/transaction/${txid}`
  window.open(url, '_blank')
}

const isExpired = (expireTime: string): boolean => {
  return new Date(expireTime) <= new Date()
}

const getTimeRemaining = (expireTime: string): string => {
  const now = new Date()
  const expire = new Date(expireTime)
  const diff = expire.getTime() - now.getTime()
  
  if (diff <= 0) return '已到期'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

const getUnfreezeStatusColor = (record: UnfreezeRecord): string => {
  if (record.status === 'withdrawn') return 'bg-blue-100'
  if (record.status === 'available' && isExpired(record.expireTime)) return 'bg-green-100'
  if (record.status === 'available') return 'bg-yellow-100'
  return 'bg-red-100'
}

const getUnfreezeStatusClass = (record: UnfreezeRecord): string => {
  if (record.status === 'withdrawn') return 'bg-blue-100 text-blue-800'
  if (record.status === 'available' && isExpired(record.expireTime)) return 'bg-green-100 text-green-800'
  if (record.status === 'available') return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

const getUnfreezeStatusText = (record: UnfreezeRecord): string => {
  if (record.status === 'withdrawn') return '已提取'
  if (record.status === 'available' && isExpired(record.expireTime)) return '可提取'
  if (record.status === 'available') return '锁定中'
  if (record.status === 'pending') return '处理中'
  return '失败'
}

const withdrawFunds = (record: UnfreezeRecord) => {
  selectedRecord.value = record
  showWithdrawDialog.value = true
}

const cancelWithdraw = () => {
  showWithdrawDialog.value = false
  selectedRecord.value = null
}

const confirmWithdraw = async () => {
  if (!selectedRecord.value || !props.poolId) return
  
  try {
    withdrawing.value = true
    await withdrawUnfrozen(props.poolId)
    
    // 刷新记录列表
    await loadRecords()
    
    // 关闭对话框
    showWithdrawDialog.value = false
    selectedRecord.value = null
  } catch (error) {
    console.error('提取资金失败:', error)
  } finally {
    withdrawing.value = false
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
onMounted(() => {
  if (props.poolId) {
    loadRecords()
  }
})
</script>

<style scoped>
.unfreeze-records {
  @apply w-full;
}
</style>