<template>
  <div class="bg-white rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <h3 class="text-lg font-medium text-gray-900">订单列表</h3>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-indigo-600" />
      <span class="ml-2 text-gray-600">加载中...</span>
    </div>
    
    <!-- 订单表格 -->
    <div v-else-if="orders.length > 0" class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              订单信息
            </th>
            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              用户/地址
            </th>
            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              金额/笔数
            </th>
            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              能量委托状态
            </th>
            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              订单/支付状态
            </th>
            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              时间信息
            </th>
            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr 
            v-for="order in orders" 
            :key="order.id"
            class="hover:bg-gray-50"
          >
            <!-- 订单信息 -->
            <td class="px-3 py-3 whitespace-nowrap">
              <div class="space-y-1">
                <div class="text-sm font-medium text-gray-900">
                  <span v-if="order.order_number">#{{ order.order_number }}</span>
                  <span v-else>ID:{{ order.id }}</span>
                </div>
                <div class="text-xs text-purple-600 font-medium">
                  {{ getOrderTypeText(order.order_type) }}
                </div>
                <div class="text-xs text-gray-600">
                  <span class="font-medium">时长:</span>
                  <span v-if="order.flash_rent_duration">{{ order.flash_rent_duration }}小时</span>
                  <span v-else-if="order.duration_hours">{{ order.duration_hours }}小时</span>
                  <span v-else class="text-orange-500">未设置</span>
                </div>
                <div v-if="order.payment_tx_hash" class="text-xs text-gray-400 font-mono" :title="order.payment_tx_hash">
                  支付: {{ order.payment_tx_hash.slice(0, 8) }}...
                </div>
              </div>
            </td>

            <!-- 用户/地址 -->
            <td class="px-3 py-3 whitespace-nowrap">
              <div class="space-y-1">
                <div class="text-sm text-gray-900">
                  <span class="font-medium">用户:</span> {{ order.user_id }}
                </div>
                <div v-if="order.recipient_address || order.target_address" class="text-xs text-gray-600 font-mono">
                  <span class="font-medium">目标:</span> {{ formatAddress(order.recipient_address || order.target_address) }}
                </div>
                <div v-if="order.source_address" class="text-xs text-blue-600 font-mono">
                  <span class="font-medium">来源:</span> {{ formatAddress(order.source_address) }}
                </div>
              </div>
            </td>

            <!-- 金额/笔数 -->
            <td class="px-3 py-3 whitespace-nowrap">
              <div class="space-y-1">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatPrice(order) }} TRX
                </div>
                <div class="text-xs text-indigo-600">
                  <span class="font-medium">笔数:</span> {{ calculateOrderCount(order, flashRentConfig) }}
                </div>
                <div v-if="order.commission_amount" class="text-xs text-green-600">
                  <span class="font-medium">佣金:</span> {{ order.commission_amount }} TRX
                </div>
              </div>
            </td>

            <!-- 能量委托状态 -->
            <td class="px-3 py-3 whitespace-nowrap">
              <div class="space-y-1">
                <div class="text-sm font-medium text-blue-700">
                  {{ formatEnergy(order, flashRentConfig) }} 能量
                </div>
                <div class="text-xs">
                  <span 
                    :class="[
                      'inline-flex px-2 py-0.5 text-xs font-medium rounded',
                      getDelegationStatusColor(order)
                    ]"
                  >
                    {{ getDelegationStatusText(order) }}
                  </span>
                </div>
                <div v-if="order.energy_pool_account_used" class="text-xs text-blue-500 font-mono" :title="order.energy_pool_account_used">
                  <span class="font-medium">池:</span> {{ formatAddress(order.energy_pool_account_used) }}
                </div>
                <div v-if="order.error_message" class="text-xs text-red-600 truncate max-w-32" :title="order.error_message">
                  <span class="font-medium">错误:</span> {{ order.error_message }}
                </div>
              </div>
            </td>

            <!-- 订单/支付状态 -->
            <td class="px-3 py-3 whitespace-nowrap">
              <div class="space-y-1">
                <div>
                  <span class="text-xs text-gray-500 font-medium">订单状态:</span>
                  <span 
                    :class="[
                      'inline-flex px-2 py-0.5 ml-1 text-xs font-medium rounded-full',
                      getStatusColor(order.status)
                    ]"
                  >
                    {{ getStatusText(order.status) }}
                  </span>
                </div>
                <div v-if="order.payment_status">
                  <span class="text-xs text-gray-500 font-medium">支付状态:</span>
                  <span 
                    :class="[
                      'inline-flex px-2 py-0.5 ml-1 text-xs font-medium rounded',
                      getPaymentStatusColor(order.payment_status)
                    ]"
                  >
                    {{ getPaymentStatusText(order.payment_status) }}
                  </span>
                </div>
                <div v-if="order.retry_count > 0" class="text-xs text-orange-600">
                  <span class="font-medium">重试:</span> {{ order.retry_count }} 次
                </div>
              </div>
            </td>

            <!-- 时间信息 -->
            <td class="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
              <div class="space-y-1">
                <div><span class="font-medium">创建:</span> {{ formatDateTime(order.created_at) }}</div>
                <div v-if="order.expires_at" class="text-orange-600">
                  <span class="font-medium">过期:</span> {{ formatDateTime(order.expires_at) }}
                </div>
                <div v-if="order.processing_started_at" class="text-blue-600">
                  <span class="font-medium">处理:</span> {{ formatDateTime(order.processing_started_at) }}
                </div>
                <div v-if="order.delegation_started_at" class="text-purple-600">
                  <span class="font-medium">委托:</span> {{ formatDateTime(order.delegation_started_at) }}
                </div>
                <div v-if="order.completed_at" class="text-green-600">
                  <span class="font-medium">完成:</span> {{ formatDateTime(order.completed_at) }}
                </div>
              </div>
            </td>

            <!-- 操作 -->
            <td class="px-3 py-3 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-1">
                <button
                  @click="$emit('view-details', order)"
                  class="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                  title="查看详情"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  v-if="canUpdateStatus(order.status)"
                  @click="$emit('update-status', order)"
                  class="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                  title="更新状态"
                >
                  <Edit class="h-4 w-4" />
                </button>
                <!-- 查看支付交易 -->
                <button
                  v-if="order.payment_tx_hash || order.tron_tx_hash"
                  @click="viewTransaction(order.payment_tx_hash || order.tron_tx_hash, network)"
                  class="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 text-xs font-medium flex items-center space-x-1"
                  title="查看支付交易"
                >
                  <CreditCard class="h-3 w-3" />
                  <span>支付</span>
                </button>
                <!-- 查看委托交易 -->
                <button
                  v-if="order.delegation_tx_hash || order.delegate_tx_hash"
                  @click="viewTransaction(order.delegation_tx_hash || order.delegate_tx_hash, network)"
                  class="text-purple-600 hover:text-purple-900 px-2 py-1 rounded hover:bg-purple-50 text-xs font-medium flex items-center space-x-1"
                  title="查看委托交易"
                >
                  <Zap class="h-3 w-3" />
                  <span>委托</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <ShoppingCart class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无订单</h3>
      <p class="text-gray-500">当前筛选条件下没有找到订单</p>
    </div>
    
    <!-- 分页 -->
    <div v-if="pagination.total > 0" class="px-6 py-4 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700">
          显示第 {{ (pagination.page - 1) * pagination.limit + 1 }} - 
          {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 条，
          共 {{ pagination.total }} 条记录
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="$emit('page-change', pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span class="px-3 py-1 text-sm text-gray-700">
            第 {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.limit) }} 页
          </span>
          <button
            @click="$emit('page-change', pagination.page + 1)"
            :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
            class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CreditCard,
  Edit,
  Eye,
  Loader2,
  ShoppingCart,
  Zap
} from 'lucide-vue-next'

// 导入分离的模块
import { flashRentConfigApi } from '@/services/api/system/flashRentConfigAPI'
import { onMounted, ref, watch } from 'vue'
import type { OrderListEmits, OrderListProps } from '../composables/useOrderList'
import { useOrderList } from '../composables/useOrderList'
import {
  calculateOrderCount,
  formatAddress,
  formatDateTime,
  formatEnergy,
  formatPrice,
  viewTransaction
} from '../utils/orderFormatters'
import {
  canUpdateStatus,
  getDelegationStatusColor,
  getDelegationStatusText,
  getOrderTypeText,
  getPaymentStatusColor,
  getPaymentStatusText,
  getStatusColor,
  getStatusText
} from '../utils/orderStatus'

// 使用类型定义
interface Props extends OrderListProps {}
interface Emits extends OrderListEmits {}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 解构props获取网络信息
const { network } = props

// 使用composable
const {} = useOrderList()

// 闪租配置类型
type SimpleFlashRentConfig = {
  single_price: number
  energy_per_unit: number
  max_amount: number
}

// 闪租配置
const flashRentConfig = ref<SimpleFlashRentConfig | null>(null)

// 获取闪租配置
const loadFlashRentConfig = async () => {
  if (!network?.id) return

  try {
    // 同时获取闪租配置和能量消耗配置
    const [config, energyConfig] = await Promise.all([
      flashRentConfigApi.getFlashRentConfigByNetwork(network.id.toString()),
      flashRentConfigApi.getEnergyConsumptionConfig()
    ])
    
    if (config?.config) {
      flashRentConfig.value = {
        single_price: config.config.single_price,
        energy_per_unit: energyConfig.calculated_energy_per_unit, // 使用动态计算的值
        max_amount: config.config.max_amount || config.config.max_transactions || 999 // 兼容两种字段名
      }
      
      console.log('🧮 能量消耗配置加载:', {
        标准能量消耗: energyConfig.standard_energy,
        缓冲百分比: energyConfig.buffer_percentage + '%',
        计算公式: `${energyConfig.standard_energy} * (1 + ${energyConfig.buffer_percentage}/100)`,
        单笔能量消耗: energyConfig.calculated_energy_per_unit
      })
    }
  } catch (error) {
    console.error('获取闪租配置失败:', error)
    flashRentConfig.value = null
  }
}

// 监听网络变化
watch(() => network?.id, () => {
  loadFlashRentConfig()
}, { immediate: true })

// 组件挂载时加载配置
onMounted(() => {
  loadFlashRentConfig()
})
</script>

<style scoped src="./OrderList.css"></style>