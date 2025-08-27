<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">订单管理</h1>
        <p class="text-gray-600 mt-1">管理和监控所有TRON能量租赁订单</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="refreshOrders"
          :disabled="isLoading"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RotateCcw :class="{ 'animate-spin': isLoading }" class="w-4 h-4" />
          刷新
        </button>
        <button
          @click="exportOrders"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Download class="w-4 h-4" />
          导出订单
        </button>
      </div>
    </div>

    <!-- Stats -->
    <OrderStats :orders="orders" class="mb-6" />

    <!-- Search and Filters -->
    <OrderSearch
      :search-query="filters.search"
      :filters="filters"
      @update:search-query="debouncedSearch"
      @update:filters="updateFilters"
      @search="refreshOrders"
      @filter="refreshOrders"
      class="mb-6"
    />

    <!-- Order List -->
    <OrderList
      :orders="orders"
      :is-loading="isLoading"
      :pagination="pagination"
      @view-details="showOrderDetails"
      @update-status="showStatusUpdateModal"
      @page-change="changePage"
    />

    <!-- Order Modal -->
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
import { RotateCcw, Download } from 'lucide-vue-next'
import OrderStats from './Orders/components/OrderStats.vue'
import OrderSearch from './Orders/components/OrderSearch.vue'
import OrderList from './Orders/components/OrderList.vue'
import OrderModal from './Orders/components/OrderModal.vue'
import { useOrderManagement } from './Orders/composables/useOrderManagement'

// 使用订单管理 composable
const {
  state,
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

// 解构状态以便在模板中使用
const { orders, stats, filters, pagination, isLoading } = state

// 导出订单功能（暂时为空实现）
const exportOrders = () => {
  // TODO: 实现导出功能
}

// Lifecycle
// useOrderManagement already handles onMounted
</script>
