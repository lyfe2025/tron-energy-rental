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
    <OrderStats :stats="stats" class="mb-6" />

    <!-- Search and Filters -->
    <OrderSearch
      :filters="filters"
      @update:filters="updateFilters"
      @reset="resetFilters"
      class="mb-6"
    />

    <!-- Order List -->
    <OrderList
      :orders="orders"
      :loading="isLoading"
      :pagination="pagination"
      @view="viewOrder"
      @cancel="cancelOrder"
      @process="processOrder"
      @update:page="updatePage"
      @update:page-size="updatePageSize"
    />

    <!-- Order Modal -->
    <OrderModal
      :show="showModal"
      :order="selectedOrder"
      :mode="modalMode"
      @close="closeModal"
      @update="updateOrder"
    />
  </div>
</template>

<script setup lang="ts">
import { Download, RotateCcw } from 'lucide-vue-next'
import OrderList from './Orders/components/OrderList.vue'
import OrderModal from './Orders/components/OrderModal.vue'
import OrderSearch from './Orders/components/OrderSearch.vue'
import OrderStats from './Orders/components/OrderStats.vue'
import { useOrderManagement } from './Orders/composables/useOrderManagement'

const {
  // 响应式数据
  orders,
  stats,
  filters,
  pagination,
  isLoading,
  showModal,
  selectedOrder,
  modalMode,
  
  // 方法
  refreshOrders,
  exportOrders,
  updateFilters,
  resetFilters,
  viewOrder,
  cancelOrder,
  processOrder,
  updatePage,
  updatePageSize,
  closeModal,
  updateOrder
} = useOrderManagement()

// Lifecycle
// useOrderManagement already handles onMounted
</script>
