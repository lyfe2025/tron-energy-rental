<template>
  <div class="space-y-6">
    <!-- 网络状态栏 -->
    <NetworkStatusBar 
      :current-network="currentNetwork"
      @switch-network="showNetworkSwitcher = true"
    />

    <!-- 页面标题和操作 -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">订单管理</h1>
          <p class="mt-1 text-sm text-gray-500">管理和跟踪当前网络的所有订单状态</p>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="handleRefreshOrders"
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
        :search-result-count="state.pagination.total"
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
      @order-updated="handleOrderUpdated"
    />

    <!-- 网络切换模态框 -->
    <NetworkSwitcher
      :visible="showNetworkSwitcher"
      :available-networks="availableNetworks"
      :current-network-id="currentNetworkId || ''"
      @close="showNetworkSwitcher = false"
      @network-selected="handleNetworkSelected"
    />
  </div>
</template>

<script setup lang="ts">
import NetworkStatusBar from '@/components/NetworkStatusBar.vue'
import NetworkSwitcher from '@/components/NetworkSwitcher.vue'
import { useCommonNetworkOperations } from '@/composables/useCommonNetworkOperations'
import { useToast } from '@/composables/useToast'
import {
  AlertCircle,
  RefreshCw
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrderList from './components/OrderList.vue'
import OrderModal from './components/OrderModal.vue'
import OrderSearch from './components/OrderSearch.vue'
import OrderStats from './components/OrderStats.vue'
import { useOrderManagement } from './composables/useOrderManagement'

const route = useRoute()
const router = useRouter()
const { error } = useToast()

// 网络切换相关状态
const showNetworkSwitcher = ref(false)

// 使用通用网络操作
const {
  currentNetworkId,
  currentNetwork,
  availableNetworks,
  switchNetwork,
  initializeNetworks,
  setCurrentNetworkId
} = useCommonNetworkOperations()

// 获取路由中的网络ID（如果有）
const routeNetworkId = computed(() => route.params.networkId as string)

// 使用订单管理 composable
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

// 网络切换处理
const handleNetworkSelected = async (networkId: string) => {
  const success = await switchNetwork(networkId)
  if (success && initializeWithNetworkId) {
    await initializeWithNetworkId(networkId)
  }
}

// 刷新订单数据
const handleRefreshOrders = async () => {
  if (currentNetworkId.value && initializeWithNetworkId) {
    await initializeWithNetworkId(currentNetworkId.value)
  } else {
    await refreshOrders()
  }
}

// 处理订单更新事件
const handleOrderUpdated = async (orderId: string) => {
  console.log('🔧 [Orders] 收到订单更新通知:', { orderId })
  // 刷新订单列表以获取最新数据
  await handleRefreshOrders()
}

// 监听网络ID变化
watch(currentNetworkId, async (newNetworkId) => {
  if (newNetworkId && initializeWithNetworkId) {
    await initializeWithNetworkId(newNetworkId)
  }
}, { immediate: true })

// 初始化
onMounted(async () => {
  try {
    // 初始化网络
    await initializeNetworks()
    
    // 如果路由有网络ID参数，使用它
    if (routeNetworkId.value) {
      setCurrentNetworkId(routeNetworkId.value)
    }
    
    // 注意：由于 watch 现在设置了 immediate: true，
    // 当 setCurrentNetworkId 设置网络ID后，watch 会自动触发数据加载
    // 所以这里不需要手动调用 initializeWithNetworkId 避免重复加载
  } catch (err: any) {
    console.error('❌ [Orders] 页面初始化失败:', err)
    error(`页面初始化失败: ${err.message}`)
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