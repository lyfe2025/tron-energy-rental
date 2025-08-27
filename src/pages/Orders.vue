<template>
  <div class="space-y-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">订单管理</h1>
        <p class="mt-1 text-sm text-gray-500">管理和监控所有TRON能量租赁订单</p>
      </div>
      <div class="mt-4 sm:mt-0">
        <button
          @click="refreshOrders"
          :disabled="isLoading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': isLoading }]" />
          刷新
        </button>
      </div>
    </div>

    <!-- 搜索和过滤 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- 搜索框 -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">搜索订单</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-5 w-5 text-gray-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索订单ID、用户ID或交易哈希"
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              @input="debouncedSearch"
            />
          </div>
        </div>

        <!-- 状态过滤 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">订单状态</label>
          <select
            v-model="filters.status"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @change="applyFilters"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>

        <!-- 时间范围 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
          <select
            v-model="filters.timeRange"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @change="applyFilters"
          >
            <option value="">全部时间</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="quarter">本季度</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 订单统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div 
        v-for="stat in orderStats" 
        :key="stat.label"
        class="bg-white rounded-lg shadow-sm p-6"
      >
        <div class="flex items-center">
          <div :class="['h-12 w-12 rounded-lg flex items-center justify-center', stat.bgColor]">
            <component :is="stat.icon" :class="['h-6 w-6', stat.iconColor]" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 订单列表 -->
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
                    #{{ order.id.slice(-8) }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ order.energy_amount }} TRX能量
                  </div>
                  <div v-if="order.tx_hash" class="text-xs text-gray-400 font-mono">
                    {{ order.tx_hash.slice(0, 16) }}...
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ order.user_id }}</div>
                <div v-if="order.user_address" class="text-xs text-gray-500 font-mono">
                  {{ order.user_address.slice(0, 8) }}...{{ order.user_address.slice(-6) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ order.amount }} TRX
                </div>
                <div class="text-xs text-gray-500">
                  ≈ ${{ (order.amount * 0.1).toFixed(2) }}
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
                    @click="viewOrderDetails(order)"
                    class="text-indigo-600 hover:text-indigo-900"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    v-if="canUpdateStatus(order.status)"
                    @click="showUpdateStatusModal(order)"
                    class="text-green-600 hover:text-green-900"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  <button
                    v-if="order.tx_hash"
                    @click="viewTransaction(order.tx_hash)"
                    class="text-blue-600 hover:text-blue-900"
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
              @click="changePage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span class="px-3 py-1 text-sm text-gray-700">
              第 {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.limit) }} 页
            </span>
            <button
              @click="changePage(pagination.page + 1)"
              :disabled="pagination.page >= Math.ceil(pagination.total / pagination.limit)"
              class="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 订单详情模态框 -->
    <div 
      v-if="showDetailsModal" 
      class="fixed inset-0 z-50 overflow-y-auto"
      @click="closeDetailsModal"
    >
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
        <div 
          class="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg"
          @click.stop
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">订单详情</h3>
            <button
              @click="closeDetailsModal"
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
              <div>
                <label class="block text-sm font-medium text-gray-700">用户ID</label>
                <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.user_id }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">金额</label>
                <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.amount }} TRX</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">能量数量</label>
                <p class="mt-1 text-sm text-gray-900">{{ selectedOrder.energy_amount }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">创建时间</label>
                <p class="mt-1 text-sm text-gray-900">{{ formatDateTime(selectedOrder.created_at) }}</p>
              </div>
            </div>
            
            <div v-if="selectedOrder.tx_hash">
              <label class="block text-sm font-medium text-gray-700">交易哈希</label>
              <div class="mt-1 flex items-center space-x-2">
                <p class="text-sm text-gray-900 font-mono">{{ selectedOrder.tx_hash }}</p>
                <button
                  @click="viewTransaction(selectedOrder.tx_hash)"
                  class="text-blue-600 hover:text-blue-900"
                >
                  <ExternalLink class="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div v-if="selectedOrder.error_message">
              <label class="block text-sm font-medium text-gray-700">错误信息</label>
              <p class="mt-1 text-sm text-red-600">{{ selectedOrder.error_message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态更新模态框 -->
    <div 
      v-if="showStatusModal" 
      class="fixed inset-0 z-50 overflow-y-auto"
      @click="closeStatusModal"
    >
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
        <div 
          class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg"
          @click.stop
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">更新订单状态</h3>
            <button
              @click="closeStatusModal"
              class="text-gray-400 hover:text-gray-600"
            >
              <X class="h-6 w-6" />
            </button>
          </div>
          
          <form @submit.prevent="updateOrderStatus">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">新状态</label>
              <select
                v-model="statusUpdate.newStatus"
                required
                class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="processing">处理中</option>
                <option value="completed">已完成</option>
                <option value="failed">失败</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
              <textarea
                v-model="statusUpdate.note"
                rows="3"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="请输入状态更新的备注信息"
              ></textarea>
            </div>
            
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="closeStatusModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="isUpdating"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Loader2 v-if="isUpdating" class="animate-spin h-4 w-4 mr-2" />
                {{ isUpdating ? '更新中...' : '确认更新' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ordersAPI } from '@/services/api'
import {
  Search,
  RefreshCw,
  Eye,
  Edit,
  ExternalLink,
  X,
  Loader2,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-vue-next'

// 响应式数据
const isLoading = ref(false)
const isUpdating = ref(false)
const searchQuery = ref('')
const orders = ref<any[]>([])
const selectedOrder = ref<any>(null)
const showDetailsModal = ref(false)
const showStatusModal = ref(false)

// 过滤条件
const filters = reactive({
  status: '',
  timeRange: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 状态更新
const statusUpdate = reactive({
  orderId: '',
  newStatus: '',
  note: ''
})

// 订单统计
const orderStats = ref([
  {
    label: '待处理',
    value: 0,
    icon: Clock,
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    label: '处理中',
    value: 0,
    icon: RefreshCw,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    label: '已完成',
    value: 0,
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    label: '失败/取消',
    value: 0,
    icon: XCircle,
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600'
  }
])

// 防抖搜索
let searchTimeout: NodeJS.Timeout
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.page = 1
    loadOrders()
  }, 500)
}

// 方法
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

// 加载订单列表
const loadOrders = async () => {
  try {
    isLoading.value = true
    
    const params: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    
    if (filters.status) {
      params.status = filters.status
    }
    
    if (filters.timeRange) {
      params.time_range = filters.timeRange
    }
    
    const response = await ordersAPI.getOrders(params)
    
    if (response.data.success && response.data.data) {
      orders.value = response.data.data.items || []
      pagination.total = response.data.data.total || 0
      
      // 更新统计数据
      updateOrderStats()
    }
  } catch (error) {
    console.error('加载订单失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 更新订单统计
const updateOrderStats = () => {
  const stats = orders.value.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  orderStats.value[0].value = stats.pending || 0
  orderStats.value[1].value = stats.processing || 0
  orderStats.value[2].value = stats.completed || 0
  orderStats.value[3].value = (stats.failed || 0) + (stats.cancelled || 0)
}

// 应用过滤条件
const applyFilters = () => {
  pagination.page = 1
  loadOrders()
}

// 刷新订单
const refreshOrders = () => {
  loadOrders()
}

// 分页
const changePage = (page: number) => {
  pagination.page = page
  loadOrders()
}

// 查看订单详情
const viewOrderDetails = (order: any) => {
  selectedOrder.value = order
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedOrder.value = null
}

// 显示状态更新模态框
const showUpdateStatusModal = (order: any) => {
  statusUpdate.orderId = order.id
  statusUpdate.newStatus = ''
  statusUpdate.note = ''
  showStatusModal.value = true
}

const closeStatusModal = () => {
  showStatusModal.value = false
  statusUpdate.orderId = ''
  statusUpdate.newStatus = ''
  statusUpdate.note = ''
}

// 更新订单状态
const updateOrderStatus = async () => {
  try {
    isUpdating.value = true
    
    const response = await ordersAPI.updateOrderStatus(statusUpdate.orderId, {
      status: statusUpdate.newStatus,
      note: statusUpdate.note
    })
    
    if (response.data.success) {
      // 更新本地订单状态
      const orderIndex = orders.value.findIndex(o => o.id === statusUpdate.orderId)
      if (orderIndex !== -1) {
        orders.value[orderIndex].status = statusUpdate.newStatus
      }
      
      // 更新统计数据
      updateOrderStats()
      
      closeStatusModal()
    }
  } catch (error) {
    console.error('更新订单状态失败:', error)
  } finally {
    isUpdating.value = false
  }
}

// 生命周期
onMounted(() => {
  loadOrders()
})
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