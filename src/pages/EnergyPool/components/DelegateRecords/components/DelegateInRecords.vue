<template>
  <div class="delegate-in-records">
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
          <option value="delegate">{{ textConfig.delegateText }}</option>
          <option value="undelegate">{{ textConfig.undelegateText }}</option>
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
    <div v-else-if="filteredDelegateRecords.length > 0" class="space-y-4">
      <div
        v-for="record in filteredDelegateRecords"
        :key="record.id"
        class="bg-gray-50 rounded-lg p-4 border border-gray-200"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- 操作类型图标 -->
            <div
              :class="[
                'p-2 rounded-full',
                record.operationType === 'delegate' ? 'bg-green-100' : 'bg-orange-100'
              ]"
            >
              <svg
                v-if="record.operationType === 'delegate'"
                class="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7h-4m0 0l-4-4m4 4l-4 4m0 6h12m0 0l-4-4m4 4l-4 4" />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>

            <!-- 记录信息 -->
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-medium text-gray-900">
                  {{ getLocalOperationTypeText(record.operationType) }}
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
              </div>
              <!-- 完整地址显示 -->
              <div class="text-sm text-gray-600 mt-2">
                <div class="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                  <span class="font-medium text-gray-700 whitespace-nowrap">{{ textConfig.addressLabel }}:</span>
                  <div class="flex items-center space-x-2 min-w-0 flex-1">
                    <span class="font-mono text-gray-900 bg-gray-100 px-3 py-1.5 rounded border text-xs break-all select-all">
                      {{ record.toAddress }}
                    </span>
                    <button
                      @click="copyToClipboard(record.toAddress, textConfig.addressLabel)"
                      class="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      :title="'复制' + textConfig.addressLabel"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
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
              {{ textConfig.undelegateButtonText }}
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
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7h-4m0 0l-4-4m4 4l-4 4m0 6h12m0 0l-4-4m4 4l-4 4" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ textConfig.emptyTitle }}
      </h3>
      <p class="text-gray-600">{{ textConfig.emptyMessage }}</p>
      
      <!-- 调试信息 -->
      <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
        <h4 class="font-medium text-yellow-900 mb-2">🔍 调试信息</h4>
        <div class="text-sm text-yellow-800 space-y-1">
          <div><strong>加载状态:</strong> {{ loading ? '加载中' : '已完成' }}</div>
          <div><strong>错误状态:</strong> {{ error || '无' }}</div>
          <div><strong>原始记录数:</strong> {{ delegateRecords?.length || 0 }}</div>
          <div><strong>过滤后记录数:</strong> {{ filteredDelegateRecords.length }}</div>
          <div><strong>当前方向:</strong> 他人代理给自己</div>
          <div><strong>池ID:</strong> {{ poolId }}</div>
          <div><strong>账户ID:</strong> {{ accountId }}</div>
          <div><strong>网络ID:</strong> {{ networkId }}</div>
        </div>
        <button 
          @click="loadRecords()" 
          class="mt-3 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
        >
          🔄 重新加载
        </button>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="filteredDelegateRecords.length > 0 && pagination.totalPages > 1" class="mt-6 flex justify-center">
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

    <!-- 取消代理确认对话框 -->
    <div v-if="showUndelegateDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">{{ textConfig.undelegateDialogTitle }}</h3>
        <p class="text-gray-600 mb-6">
          {{ selectedRecord ? textConfig.undelegateDialogMessage(selectedRecord, formatTrx, formatAddress) : '' }}
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
import { onMounted } from 'vue';
import { getDelegateInTextConfig, useDelegateRecordsCommon } from '../composables/useDelegateRecordsCommon';
import type { DelegateRecordsBaseProps } from '../types/delegate-records.types';

// Props
const props = defineProps<DelegateRecordsBaseProps>()

// 文本配置
const textConfig = getDelegateInTextConfig()

// 使用公共逻辑 - 指定方向为 'in'
const {
  loading,
  error,
  delegateRecords,
  filteredDelegateRecords,
  pagination,
  showUndelegateDialog,
  selectedRecord,
  undelegating,
  filters,
  networkStore,
  loadRecords,
  loadEnergyPools,
  changePage,
  viewTransaction,
  undelegateResource,
  cancelUndelegate,
  confirmUndelegate,
  copyToClipboard,
  formatTrx,
  formatAddress,
  formatDate,
  getStatusClass,
  getStatusText,
  getResourceTypeText,
  getOperationTypeText
} = useDelegateRecordsCommon(props, 'in')

// 获取本地操作类型文本（根据代理方向）
const getLocalOperationTypeText = (operationType: string) => {
  if (operationType === 'delegate') {
    return textConfig.delegateText
  } else if (operationType === 'undelegate') {
    return textConfig.undelegateText
  }
  return operationType
}

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
.delegate-in-records {
  @apply w-full;
}
</style>
