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
          @click="() => {}"
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
      class="mb-6"
      @update:search-query="debouncedSearch"
      @update:filters="updateFilters"
      @search="refreshOrders"
      @filter="refreshOrders"
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

    <!-- 订单模态框 -->
    <OrderModal
      :show-details-modal="showModal && modalMode === 'view'"
      :show-status-modal="showModal && modalMode === 'edit'"
      :selected-order="selectedOrder"
      :is-updating="isLoading"
      @close-details="closeDetailsModal"
      @close-status="closeStatusModal"
      @update-status="updateOrderStatus"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw, Download } from 'lucide-vue-next'
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
const { orders, stats, filters, pagination, isLoading, modal } = state
const { selectedOrder, showDetailsModal, showStatusModal } = modal

// 模态框状态管理
const showModal = computed(() => showDetailsModal || showStatusModal)
const modalMode = computed(() => showDetailsModal ? 'view' : 'edit')

// Lifecycle
// useOrderManagement already handles onMounted
</script>
