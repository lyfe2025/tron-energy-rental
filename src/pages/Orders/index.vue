<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 页面头部 -->
    <div class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">订单管理</h1>
            <p class="mt-1 text-sm text-gray-500">管理和跟踪所有订单状态</p>
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
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 错误提示 -->
      <div v-if="state.error" class="mb-6">
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
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
      </div>

      <!-- 订单统计 -->
      <div class="mb-8">
        <OrderStats :orders="state.orders" />
      </div>

      <!-- 搜索和过滤 -->
      <div class="mb-6">
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
      <div class="mb-6">
        <OrderList
          :orders="state.orders"
          :is-loading="state.isLoading"
          :pagination="state.pagination"
          @view-details="showOrderDetails"
          @update-status="showStatusUpdateModal"
          @page-change="changePage"
        />
      </div>
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
import {
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next'
import OrderStats from './components/OrderStats.vue'
import OrderSearch from './components/OrderSearch.vue'
import OrderList from './components/OrderList.vue'
import OrderModal from './components/OrderModal.vue'
import { useOrderManagement } from './composables/useOrderManagement'

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
  refreshOrders
} = useOrderManagement()
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