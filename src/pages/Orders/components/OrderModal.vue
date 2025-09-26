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
        <!-- 选项卡导航 (仅在笔数套餐订单时显示) -->
        <div v-if="selectedOrder.order_type === 'transaction_package'" class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              @click="activeTab = 'details'"
              :class="[
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              订单详情
            </button>
            <button
              @click="activeTab = 'energy_usage'"
              :class="[
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'energy_usage'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              能量使用记录
            </button>
          </nav>
        </div>

        <!-- 订单详情内容 -->
        <div v-show="activeTab === 'details'">
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
        
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">订单号</label>
            <p class="mt-1 text-sm text-gray-900 font-mono">{{ selectedOrder.order_number || '未生成' }}</p>
          </div>
          <!-- 目标地址 -->
          <div v-if="selectedOrder.target_address || selectedOrder.recipient_address">
            <label class="block text-sm font-medium text-gray-700">目标地址</label>
            <div class="mt-1 flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
              <p class="flex-1 text-sm text-gray-900 font-mono break-all select-all">
                {{ selectedOrder.target_address || selectedOrder.recipient_address }}
              </p>
              <button
                @click="copyToClipboard(selectedOrder.target_address || selectedOrder.recipient_address || '', 'target')"
                :class="[
                  'p-1 transition-colors',
                  copyStates.target === 'success' ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
                ]"
                :title="copyStates.target === 'success' ? '已复制' : '复制地址'"
              >
                <Copy v-if="copyStates.target !== 'success'" class="h-4 w-4" />
                <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <!-- 来源地址 -->
          <div v-if="selectedOrder.source_address && selectedOrder.source_address !== (selectedOrder.target_address || selectedOrder.recipient_address)">
            <label class="block text-sm font-medium text-gray-700">来源地址</label>
            <div class="mt-1 flex items-center space-x-2 p-2 bg-blue-50 rounded-md">
              <p class="flex-1 text-sm text-blue-900 font-mono break-all select-all">
                {{ selectedOrder.source_address }}
              </p>
              <button
                @click="copyToClipboard(selectedOrder.source_address, 'source')"
                :class="[
                  'p-1 transition-colors',
                  copyStates.source === 'success' ? 'text-green-500' : 'text-blue-400 hover:text-blue-600'
                ]"
                :title="copyStates.source === 'success' ? '已复制' : '复制来源地址'"
              >
                <Copy v-if="copyStates.source !== 'success'" class="h-4 w-4" />
                <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">能量数量</label>
            <p class="mt-1 text-sm text-gray-900">{{ formatNumber(selectedOrder.energy_amount) }} 能量</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">订单金额</label>
            <p class="mt-1 text-sm text-gray-900">{{ formatPrice(selectedOrder) }} TRX</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">计算笔数</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.calculated_units || 0 }} 笔</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">闪租时长</label>
            <p class="mt-1 text-sm text-gray-900">
              <span v-if="selectedOrder.flash_rent_duration">
                {{ Math.round(selectedOrder.flash_rent_duration / 60 * 10) / 10 }} 小时
              </span>
              <span v-else class="text-gray-500">未设置</span>
            </p>
          </div>
        </div>
        

        <div v-if="selectedOrder.payment_tx_hash">
          <label class="block text-sm font-medium text-gray-700">交易哈希</label>
          <div class="mt-1 flex items-center space-x-2">
            <p class="text-sm text-gray-900 font-mono break-all">{{ selectedOrder.payment_tx_hash }}</p>
            <button
              @click="viewTransaction(selectedOrder.payment_tx_hash)"
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
          <div class="mt-1 bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <div class="text-xl">{{ getErrorIcon(formatErrorInfo(selectedOrder.error_message).type) }}</div>
              <div class="flex-1">
                <h4 class="text-sm font-medium text-red-800 mb-1">
                  {{ formatErrorInfo(selectedOrder.error_message).title }}
                </h4>
                <p class="text-sm text-red-700 mb-2">
                  {{ formatErrorInfo(selectedOrder.error_message).description }}
                </p>
                <div v-if="formatErrorInfo(selectedOrder.error_message).suggestions?.length" class="space-y-1">
                  <p class="text-xs font-medium text-red-800">建议处理方式：</p>
                  <ul class="text-xs text-red-600 space-y-1">
                    <li 
                      v-for="(suggestion, index) in formatErrorInfo(selectedOrder.error_message).suggestions" 
                      :key="index"
                      class="flex items-start"
                    >
                      <span class="inline-block w-3 text-red-400 mr-1">•</span>
                      <span>{{ suggestion }}</span>
                    </li>
                  </ul>
                </div>
                <!-- 显示原始错误信息（可折叠） -->
                <details class="mt-3">
                  <summary class="text-xs text-red-600 cursor-pointer hover:text-red-700 select-none">
                    查看技术详情
                  </summary>
                  <div class="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 font-mono break-all">
                    {{ selectedOrder.error_message }}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- 能量使用记录内容 -->
        <div v-show="activeTab === 'energy_usage'" class="mt-4">
          <EnergyUsageRecords 
            v-if="selectedOrder.order_type === 'transaction_package'"
            :order-id="selectedOrder.id.toString()"
            :order="selectedOrder"
          />
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
        
        <div v-if="newStatus === 'completed' || newStatus === 'manually_completed'">
          <div class="flex items-center mb-2">
            <label class="block text-sm font-medium text-gray-700">交易哈希</label>
            <div class="relative ml-2 group">
              <div 
                class="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 bg-gray-100 border border-gray-300 rounded-full cursor-help hover:bg-indigo-100 hover:text-indigo-600 hover:border-indigo-300 transition-all duration-200"
                :title="txHashHelpText"
              >
                ?
              </div>
              <!-- 悬停提示框 -->
              <div class="absolute left-0 top-6 w-80 p-4 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-1">
                <div class="space-y-3">
                  <div class="font-semibold text-sm text-indigo-300">📋 如何获取交易哈希：</div>
                  <div class="space-y-2">
                    <div class="flex items-start">
                      <span class="inline-block w-4 text-indigo-400 font-medium">1.</span>
                      <span>在TRON钱包（如TronLink）中查看交易记录</span>
                    </div>
                    <div class="flex items-start">
                      <span class="inline-block w-4 text-indigo-400 font-medium">2.</span>
                      <div>
                        <div>在区块链浏览器中搜索交易：</div>
                        <div class="ml-2 mt-1">
                          <div class="text-blue-300">• <a href="https://tronscan.org" target="_blank" class="hover:text-blue-200 underline">tronscan.org</a></div>
                          <div class="text-blue-300">• <a href="https://tronscan.io" target="_blank" class="hover:text-blue-200 underline">tronscan.io</a></div>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-start">
                      <span class="inline-block w-4 text-indigo-400 font-medium">3.</span>
                      <span>交易哈希通常为64位16进制字符串</span>
                    </div>
                  </div>
                  <div class="border-t border-gray-700 pt-2">
                    <div class="text-yellow-300">
                      <span class="font-medium">💡 示例：</span>
                      <div class="mt-1 font-mono text-xs bg-gray-800 p-2 rounded break-all">
                        96d7459180a649be1c728c575c347ae76a48ca086db2c3b4db21b55a22182018
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 箭头 -->
                <div class="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
          <input 
            v-model="txHash"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入64位交易哈希..."
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
import { useToast } from '@/composables/useToast'
import {
  Copy,
  ExternalLink,
  Loader2,
  X
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import type { Order } from '../types/order.types'
import { formatOrderError, getErrorIcon } from '../utils/errorFormatter'
import { formatNumber, formatPrice } from '../utils/orderFormatters'
import EnergyUsageRecords from './EnergyUsageRecords.vue'

interface Props {
  showDetailsModal: boolean
  showStatusModal: boolean
  selectedOrder: Order | null
  isUpdating: boolean
}

interface Emits {
  'close-details': []
  'close-status': []
  'update-status': [data: { orderId: string; status: string; tron_tx_hash?: string; errorMessage?: string }]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 使用 Toast
const { success, error } = useToast()

// 状态更新相关
const newStatus = ref('')
const txHash = ref('')
const errorMessage = ref('')

// 选项卡状态
const activeTab = ref('details')

// 复制状态跟踪
const copyStates = ref<Record<string, 'idle' | 'copying' | 'success'>>({})

// 交易哈希帮助文本
const txHashHelpText = ref('点击查看如何获取交易哈希')

// 可用状态选项
const availableStatuses = computed(() => [
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'manually_completed', label: '已手动补单' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' }
])

// 状态相关方法
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'manually_completed': 'bg-emerald-100 text-emerald-800',
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
    'manually_completed': '已手动补单',
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

// 格式化错误信息
const formatErrorInfo = (errorMessage: string) => {
  const orderInfo = props.selectedOrder ? {
    energy_pool_account_used: props.selectedOrder.energy_pool_account_used,
    target_address: props.selectedOrder.target_address || props.selectedOrder.recipient_address,
    recipient_address: props.selectedOrder.recipient_address,
    energy_amount: props.selectedOrder.energy_amount
  } : undefined;
  
  return formatOrderError(errorMessage, orderInfo)
}

// 复制到剪贴板功能
const copyToClipboard = async (text: string, addressType: 'target' | 'source' = 'target') => {
  // 设置复制中状态
  copyStates.value[addressType] = 'copying'
  
  try {
    await navigator.clipboard.writeText(text)
    
    // 设置成功状态
    copyStates.value[addressType] = 'success'
    success('地址已复制到剪贴板')
    
    // 2秒后重置状态
    setTimeout(() => {
      copyStates.value[addressType] = 'idle'
    }, 2000)
    
  } catch (err) {
    // 如果现代 API 失败，使用旧的方法
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        copyStates.value[addressType] = 'success'
        success('地址已复制到剪贴板')
        
        // 2秒后重置状态
        setTimeout(() => {
          copyStates.value[addressType] = 'idle'
        }, 2000)
      } else {
        throw new Error('复制命令执行失败')
      }
    } catch (copyErr) {
      console.error('复制失败:', copyErr)
      copyStates.value[addressType] = 'idle'
      error('复制失败，请手动复制地址')
    }
  }
}

const handleUpdateStatus = () => {
  if (!newStatus.value) return
  
  const updateData: {
    orderId: string
    status: string
    tron_tx_hash?: string
    errorMessage?: string
  } = {
    orderId: String(props.selectedOrder?.id) || '',
    status: newStatus.value
  }
  
  if ((newStatus.value === 'completed' || newStatus.value === 'manually_completed') && txHash.value) {
    updateData.tron_tx_hash = txHash.value
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