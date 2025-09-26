<template>
  <div class="space-y-4">
    <!-- 标题和刷新按钮 -->
    <div class="flex justify-between items-center">
      <div>
        <h4 class="text-lg font-medium text-gray-900">能量使用记录</h4>
        <p class="text-sm text-gray-600">查看该订单的详细能量消耗记录</p>
      </div>
      <button
        @click="refreshRecords"
        :disabled="loading"
        class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        刷新
      </button>
    </div>

    <!-- 统计信息 -->
    <div v-if="stats" class="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
      <div class="text-center">
        <div class="text-2xl font-bold text-blue-600">{{ stats.totalUsageCount || 0 }}</div>
        <div class="text-xs text-gray-600">总使用次数</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-green-600">{{ formatNumber(stats.totalEnergyConsumed || 0) }}</div>
        <div class="text-xs text-gray-600">总消耗能量</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-purple-600">{{ formatNumber(Math.round(stats.avgEnergyPerUsage || 0)) }}</div>
        <div class="text-xs text-gray-600">平均每次</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-orange-600">{{ remainingTransactions || 0 }}</div>
        <div class="text-xs text-gray-600">剩余笔数</div>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="bg-white border rounded-lg overflow-hidden">
      <div v-if="loading && !records.length" class="p-8 text-center">
        <div class="animate-spin mx-auto h-8 w-8 text-indigo-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <p class="mt-2 text-sm text-gray-500">正在加载能量使用记录...</p>
      </div>

      <div v-else-if="!records.length" class="p-8 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">暂无使用记录</h3>
        <p class="mt-1 text-sm text-gray-500">该订单还没有能量使用记录</p>
      </div>

      <div v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  序号
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用时间
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  消耗能量
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  交易哈希
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户地址
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="(record, index) in records"
                :key="record.id || index"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ (pagination.offset || 0) + index + 1 }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDateTime(record.usage_timestamp || record.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {{ formatNumber(record.energy_amount || record.energy_consumed || 0) }} Energy
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="record.transaction_hash" class="flex items-center space-x-2">
                    <span class="text-sm font-mono text-gray-900">
                      {{ truncateHash(record.transaction_hash) }}
                    </span>
                    <button
                      @click="copyToClipboard(record.transaction_hash)"
                      class="p-1 text-gray-400 hover:text-gray-600"
                      title="复制完整哈希"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                    </button>
                    <button
                      @click="viewTransaction(record.transaction_hash)"
                      class="p-1 text-blue-400 hover:text-blue-600"
                      title="在区块链浏览器中查看"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m-6-12h6m0 0v6m0-6L10 18"></path>
                      </svg>
                    </button>
                  </div>
                  <span v-else class="text-sm text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm font-mono text-gray-600">
                    {{ truncateAddress(record.user_address) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.total > pagination.limit" class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div class="flex items-center justify-between">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                @click="prevPage"
                :disabled="!hasPrev"
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                @click="nextPage"
                :disabled="!hasNext"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  显示第
                  <span class="font-medium">{{ pagination.offset + 1 }}</span>
                  -
                  <span class="font-medium">{{ Math.min(pagination.offset + pagination.limit, pagination.total) }}</span>
                  条，共
                  <span class="font-medium">{{ pagination.total }}</span>
                  条记录
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    @click="prevPage"
                    :disabled="!hasPrev"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button
                    @click="nextPage"
                    :disabled="!hasNext"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { computed, onMounted, ref, watch } from 'vue';

interface Props {
  orderId?: string
  order?: any
}

const props = defineProps<Props>()
const { success: showSuccess, error: showError } = useToast()

// 数据状态
const loading = ref(false)
const records = ref<any[]>([])
const stats = ref<any>(null)
const pagination = ref({
  limit: 20,
  offset: 0,
  total: 0,
  hasMore: false
})

// 计算属性
const remainingTransactions = computed(() => {
  if (!props.order) return 0
  const total = props.order.transaction_count || 0
  const used = props.order.used_transactions || 0
  return Math.max(0, total - used)
})

const hasPrev = computed(() => pagination.value.offset > 0)
const hasNext = computed(() => pagination.value.offset + pagination.value.limit < pagination.value.total)

// 加载数据
const loadEnergyUsageRecords = async () => {
  if (!props.orderId) return

  loading.value = true
  try {
    // 获取能量使用记录
    const response = await fetch(`/api/transaction-package/orders/${props.orderId}/energy-usage?limit=${pagination.value.limit}&offset=${pagination.value.offset}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.success) {
      records.value = data.data.energyUsageLogs || []
      pagination.value = {
        ...pagination.value,
        total: data.data.pagination?.total || 0,
        hasMore: data.data.pagination?.hasMore || false
      }
    }
    
    // 同时获取统计信息
    if (props.order?.user_id) {
      await loadUsageStats()
    }
  } catch (error) {
    console.error('获取能量使用记录失败:', error)
    showError(error instanceof Error ? error.message : '获取能量使用记录失败')
  } finally {
    loading.value = false
  }
}

// 加载使用统计
const loadUsageStats = async () => {
  if (!props.order?.user_id) return

  try {
    const response = await fetch(`/api/transaction-package/users/${props.order.user_id}/energy-usage/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        stats.value = data.data
      }
    }
  } catch (error) {
    console.error('获取能量使用统计失败:', error)
  }
}

// 刷新记录
const refreshRecords = () => {
  pagination.value.offset = 0
  loadEnergyUsageRecords()
}

// 分页操作
const prevPage = () => {
  if (hasPrev.value) {
    pagination.value.offset = Math.max(0, pagination.value.offset - pagination.value.limit)
    loadEnergyUsageRecords()
  }
}

const nextPage = () => {
  if (hasNext.value) {
    pagination.value.offset += pagination.value.limit
    loadEnergyUsageRecords()
  }
}

// 工具函数
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('zh-CN').format(num)
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch {
    return dateStr
  }
}

const truncateHash = (hash: string) => {
  if (!hash) return '-'
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
}

const truncateAddress = (address: string) => {
  if (!address) return '-'
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showSuccess('已复制到剪贴板')
  } catch {
    showError('复制失败')
  }
}

const viewTransaction = (txHash: string) => {
  const url = `https://tronscan.org/#/transaction/${txHash}`
  window.open(url, '_blank')
}

// 监听订单ID变化
watch(() => props.orderId, (newId) => {
  if (newId) {
    refreshRecords()
  }
}, { immediate: true })

// 组件挂载后加载数据
onMounted(() => {
  if (props.orderId) {
    loadEnergyUsageRecords()
  }
})
</script>

<style scoped>
/* 自定义样式 */
</style>
