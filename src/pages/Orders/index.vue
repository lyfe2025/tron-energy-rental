<template>
  <div class="space-y-6">
    <!-- 当前网络显示 -->
    <div class="bg-white rounded-lg shadow-sm border p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center"
               :class="getNetworkIconClass(currentNetwork?.type)">
            <span class="text-white font-bold">{{ getNetworkIcon(currentNetwork?.type) }}</span>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="text-sm text-gray-600">当前网络:</span>
              <span class="font-semibold text-gray-900">{{ currentNetwork?.name || 'Unknown' }}</span>
              <span class="text-sm text-gray-500">{{ currentNetwork?.rpc_url }}</span>
            </div>
          </div>
        </div>
        <button
          @click="switchNetwork"
          class="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
        >
          切换网络
        </button>
      </div>
    </div>

    <!-- 页面标题和操作 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">订单管理</h1>
          <p class="mt-1 text-sm text-gray-500">管理和跟踪当前网络的所有订单状态</p>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="refreshOrders"
            :disabled="state.isLoading"
            class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': state.isLoading }]" />
            刷新
          </button>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="state.error" class="bg-red-50 border border-red-200 rounded-lg shadow-sm p-4">
      <div class="flex">
        <AlertCircle class="h-5 w-5 text-red-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">错误</h3>
          <div class="mt-2 text-sm text-red-700">
            {{ state.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- 订单统计 -->
    <OrderStats :orders="state.orders" />

    <!-- 搜索和过滤 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <OrderSearch
        :search-query="state.filters.search"
        :filters="state.filters"
        @update:search-query="(value) => debouncedSearch(value)"
        @update:filters="updateFilters"
        @search="refreshOrders"
        @filter="refreshOrders"
      />
    </div>

    <!-- 订单列表 -->
    <div class="bg-white rounded-lg shadow-sm">
      <OrderList
        :orders="state.orders"
        :is-loading="state.isLoading"
        :pagination="state.pagination"
        :network="currentNetwork"
        @view-details="showOrderDetails"
        @update-status="showStatusUpdateModal"
        @page-change="changePage"
      />
    </div>

    <!-- 模态框 -->
    <OrderModal
      :show-details-modal="state.modal.showDetailsModal"
      :show-status-modal="state.modal.showStatusModal"
      :selected-order="state.modal.selectedOrder"
      :is-updating="state.modal.isUpdating"
      @close-details="closeDetailsModal"
      @close-status="closeStatusModal"
      @update-status="updateOrderStatus"
    />
  </div>
</template>

<script setup lang="ts">
import { networkApi } from '@/api/network'
import { useToast } from '@/composables/useToast'
import { getNetworkIcon, getNetworkIconClass } from '@/utils/network'
import {
  AlertCircle,
  RefreshCw
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrderList from './components/OrderList.vue'
import OrderModal from './components/OrderModal.vue'
import OrderSearch from './components/OrderSearch.vue'
import OrderStats from './components/OrderStats.vue'
import { useOrderManagement } from './composables/useOrderManagement'

interface Network {
  id: number
  name: string
  type?: string
  rpc_url: string
  explorer_url?: string
  is_active: boolean
}

const route = useRoute()
const router = useRouter()
const { error } = useToast()
const currentNetwork = ref<Network | null>(null)

// 获取当前网络ID
const networkId = computed(() => route.params.networkId as string)

// 使用订单管理 composable，并传入网络ID
const {
  state,
  hasFilters,
  debouncedSearch,
  updateFilters,
  clearFilters,
  changePage,
  showOrderDetails,
  closeDetailsModal,
  showStatusUpdateModal,
  closeStatusModal,
  updateOrderStatus,
  refreshOrders,
  initializeWithNetworkId
} = useOrderManagement()

// 加载当前网络信息
const loadCurrentNetwork = async () => {
  try {
    console.log('🔍 [Orders] 开始加载网络信息，networkId:', networkId.value)
    const response = await networkApi.getNetworks()
    console.log('📡 [Orders] API响应:', response)
    
    if (response.success && response.data) {
      const allNetworks = response.data.data?.networks || response.data.networks || []
      currentNetwork.value = allNetworks.find((network: Network) => network.id.toString() === networkId.value)
      
      if (!currentNetwork.value) {
        throw new Error('未找到指定的网络')
      }
    } else {
      throw new Error(response.error || '获取网络信息失败')
    }
  } catch (err: any) {
    console.error('❌ [Orders] 加载网络信息失败:', err)
    error(`加载网络信息失败: ${err.message}`)
    // 如果加载失败，跳转回网络选择页面
    router.push({ name: 'orders' })
  }
}

// 切换网络
const switchNetwork = () => {
  router.push({ name: 'orders' })
}

// 初始化
onMounted(async () => {
  // 检查是否有网络ID参数
  if (!networkId.value) {
    error('缺少网络参数')
    router.push({ name: 'orders' })
    return
  }
  
  // 加载当前网络信息
  await loadCurrentNetwork()
  
  // 初始化订单管理，传入网络ID
  if (initializeWithNetworkId) {
    await initializeWithNetworkId(networkId.value)
  }
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