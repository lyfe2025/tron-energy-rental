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
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              订单信息
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              用户
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              金额
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              创建时间
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
            <td class="px-6 py-4 whitespace-nowrap">
              <div>
                <div class="text-sm font-medium text-gray-900">
                  #{{ order.id }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ order.energy_amount }} TRX能量
                </div>
                <div v-if="order.payment_tx_hash" class="text-xs text-gray-400 font-mono">
                  {{ order.payment_tx_hash.slice(0, 16) }}...
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ order.user_id }}</div>
              <div v-if="order.recipient_address" class="text-xs text-gray-500 font-mono">
                {{ order.recipient_address.slice(0, 8) }}...{{ order.recipient_address.slice(-6) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                              <div class="text-sm font-medium text-gray-900">
                  {{ order.price_trx }} TRX
                </div>
                <div class="text-xs text-gray-500">
                  ≈ ${{ (order.price_trx * 0.1).toFixed(2) }}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                  getStatusColor(order.status)
                ]"
              >
                {{ getStatusText(order.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatDateTime(order.created_at) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex items-center space-x-2">
                <button
                  @click="$emit('view-details', order)"
                  class="text-indigo-600 hover:text-indigo-900"
                  title="查看详情"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  v-if="canUpdateStatus(order.status)"
                  @click="$emit('update-status', order)"
                  class="text-green-600 hover:text-green-900"
                  title="更新状态"
                >
                  <Edit class="h-4 w-4" />
                </button>
                <button
                  v-if="order.payment_tx_hash"
                  @click="viewTransaction(order.payment_tx_hash)"
                  class="text-blue-600 hover:text-blue-900"
                  title="查看交易"
                >
                  <ExternalLink class="h-4 w-4" />
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
  Edit,
  ExternalLink,
  Eye,
  Loader2,
  ShoppingCart
} from 'lucide-vue-next'
import type { Order, OrderPagination } from '../types/order.types'

interface Props {
  orders: Order[]
  isLoading: boolean
  pagination: OrderPagination
}

interface Emits {
  'view-details': [order: Order]
  'update-status': [order: Order]
  'page-change': [page: number]
}

defineProps<Props>()
defineEmits<Emits>()

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

const canUpdateStatus = (status: string) => {
  return ['pending', 'processing'].includes(status)
}

const viewTransaction = (txHash: string) => {
  window.open(`https://tronscan.org/#/transaction/${txHash}`, '_blank')
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