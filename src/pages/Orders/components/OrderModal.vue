<template>
  <!-- 订单详情模态框 -->
  <div 
    v-if="showDetailsModal" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="$emit('close-details')"
  >
    <div 
      class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">订单详情</h3>
        <button 
          @click="$emit('close-details')"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-6 w-6" />
        </button>
      </div>
      
      <div v-if="selectedOrder" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">订单ID</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.id }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">状态</label>
            <span 
              :class="[
                'inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1',
                getStatusColor(selectedOrder.status)
              ]"
            >
              {{ getStatusText(selectedOrder.status) }}
            </span>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">用户ID</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.user_id }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">用户地址</label>
            <p class="mt-1 text-sm text-gray-900 font-mono break-all">
              {{ selectedOrder.user_address || '未设置' }}
            </p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">能量数量</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.energy_amount }} TRX</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">订单金额</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.amount }} TRX</p>
          </div>
        </div>
        
        <div v-if="selectedOrder.tx_hash">
          <label class="block text-sm font-medium text-gray-700">交易哈希</label>
          <div class="mt-1 flex items-center space-x-2">
            <p class="text-sm text-gray-900 font-mono break-all">{{ selectedOrder.tx_hash }}</p>
            <button
              @click="viewTransaction(selectedOrder.tx_hash)"
              class="text-blue-600 hover:text-blue-800"
              title="在区块链浏览器中查看"
            >
              <ExternalLink class="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">创建时间</label>
            <p class="mt-1 text-sm text-gray-900">{{ formatDateTime(selectedOrder.created_at) }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">更新时间</label>
            <p class="mt-1 text-sm text-gray-900">{{ formatDateTime(selectedOrder.updated_at) }}</p>
          </div>
        </div>
        
        <div v-if="selectedOrder.error_message">
          <label class="block text-sm font-medium text-gray-700">错误信息</label>
          <p class="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">{{ selectedOrder.error_message }}</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 状态更新模态框 -->
  <div 
    v-if="showStatusModal" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="$emit('close-status')"
  >
    <div 
      class="bg-white rounded-lg p-6 max-w-md w-full mx-4"
      @click.stop
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">更新订单状态</h3>
        <button 
          @click="$emit('close-status')"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="h-6 w-6" />
        </button>
      </div>
      
      <div v-if="selectedOrder" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">订单ID</label>
          <p class="text-sm text-gray-900">{{ selectedOrder.id }}</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">当前状态</label>
          <span 
            :class="[
              'inline-flex px-2 py-1 text-xs font-medium rounded-full',
              getStatusColor(selectedOrder.status)
            ]"
          >
            {{ getStatusText(selectedOrder.status) }}
          </span>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">新状态</label>
          <select 
            v-model="newStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">请选择新状态</option>
            <option 
              v-for="status in availableStatuses" 
              :key="status.value" 
              :value="status.value"
            >
              {{ status.label }}
            </option>
          </select>
        </div>
        
        <div v-if="newStatus === 'failed'">
          <label class="block text-sm font-medium text-gray-700 mb-2">错误信息</label>
          <textarea 
            v-model="errorMessage"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入错误信息..."
          ></textarea>
        </div>
        
        <div v-if="newStatus === 'completed'">
          <label class="block text-sm font-medium text-gray-700 mb-2">交易哈希</label>
          <input 
            v-model="txHash"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入交易哈希..."
          />
        </div>
        
        <div class="flex justify-end space-x-3 pt-4">
          <button
            @click="$emit('close-status')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            取消
          </button>
          <button
            @click="handleUpdateStatus"
            :disabled="!newStatus || isUpdating"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Loader2 v-if="isUpdating" class="h-4 w-4 animate-spin mr-2" />
            {{ isUpdating ? '更新中...' : '确认更新' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X,
  ExternalLink,
  Loader2
} from 'lucide-vue-next'
import type { Order } from '../types/order.types'

interface Props {
  showDetailsModal: boolean
  showStatusModal: boolean
  selectedOrder: Order | null
  isUpdating: boolean
}

interface Emits {
  'close-details': []
  'close-status': []
  'update-status': [data: { orderId: string; status: string; txHash?: string; errorMessage?: string }]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态更新相关
const newStatus = ref('')
const txHash = ref('')
const errorMessage = ref('')

// 可用状态选项
const availableStatuses = computed(() => [
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' }
])

// 状态相关方法
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败',
    'cancelled': '已取消'
  }
  return texts[status] || status
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const viewTransaction = (txHash: string) => {
  window.open(`https://tronscan.org/#/transaction/${txHash}`, '_blank')
}

const handleUpdateStatus = () => {
  if (!newStatus.value) return
  
  const updateData: {
    orderId: string
    status: string
    txHash?: string
    errorMessage?: string
  } = {
    orderId: props.selectedOrder?.id || '',
    status: newStatus.value
  }
  
  if (newStatus.value === 'completed' && txHash.value) {
    updateData.txHash = txHash.value
  }
  
  if (newStatus.value === 'failed' && errorMessage.value) {
    updateData.errorMessage = errorMessage.value
  }
  
  emit('update-status', updateData)
  
  // 重置表单
  newStatus.value = ''
  txHash.value = ''
  errorMessage.value = ''
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>