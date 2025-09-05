<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">机器人管理</h1>
        <p class="text-gray-600 mt-1">管理和监控您的TRON机器人</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RotateCcw :class="{ 'animate-spin': isLoading }" class="w-4 h-4" />
          刷新
        </button>
        <button
          @click="goToConfig"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Settings class="w-4 h-4" />
          配置机器人
        </button>
      </div>
    </div>

    <!-- 调试信息 -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-yellow-800 mb-2">调试信息</h3>
      <div class="text-sm text-yellow-700">
        <p>加载状态: {{ isLoading ? '加载中...' : '已完成' }}</p>
        <p>机器人数量: {{ bots.length }}</p>
        <p>筛选后数量: {{ filteredBots.length }}</p>
        <p>分页后数量: {{ paginatedBots.length }}</p>
        <p>API基础URL: {{ apiBaseUrl }}</p>
      </div>
    </div>

    <!-- Stats -->
    <BotStats :bot-stats="botStats" class="mb-6" />

    <!-- Search and Filters -->
    <BotSearch
      :filters="filters"
      @update:filters="filters = $event"
      @export="exportData"
      @reset="filters = { searchQuery: '', statusFilter: '', typeFilter: '' }"
      class="mb-6"
    />

    <!-- Bot List -->
    <BotList
      :bots="bots"
      :selected-bots="selectedBots"
      :loading="isLoading"
      :show-bot-menu="showBotMenu"
      :current-page="pagination.currentPage"
      :page-size="pagination.pageSize"
      :filtered-bots="filteredBots"
      :paginated-bots="paginatedBots"
      :get-status-text="getStatusText"
      :get-status-color="getStatusColor"
      :format-address="formatAddress"
      :format-type="formatType"
      :format-currency="formatCurrency"
      :format-date-time="formatDateTime"
      :format-username="formatUsername"
      :format-token="formatToken"
      :format-bot-status="formatStatus"
      :format-date="formatDate"
      :pagination="pagination"
      @update:selectedBots="selectedBots = $event"
      @view="viewBot"
      @edit="editBot"
      @toggle-status="toggleBotStatus"
      @recharge="rechargeBalance"
      @test-connection="testConnection"
      @view-logs="viewLogs"
      @reset="resetBot"
      @create="goToConfig"
      @page-change="pagination.currentPage = $event"
      @toggle-menu="showBotMenu = showBotMenu === $event ? null : $event"
      @close-menu="showBotMenu = null"
    />

    <!-- Batch Actions -->
    <BotActions
      :selected-bots="selectedBots"
      @batch-start="batchStart"
      @batch-stop="batchStop"
      @batch-test="batchTest"
      @clear-selection="clearSelection"
    />

    <!-- Bot Modal -->
    <BotModal
      :show="showBotModal"
      :mode="modalMode"
      :bot="selectedBot"
      :form="botForm"
      :is-saving="isSaving"
      :format-status="formatStatus"
      :get-status-color="getStatusColor"
      @close="showBotModal = false"
      @edit="editBot"
      @test-connection="testConnection"
      @submit="saveBot"
    />
  </div>
</template>

<script setup lang="ts">
import { RotateCcw, Settings } from 'lucide-vue-next'
import BotActions from './components/BotActions.vue'
import BotList from './components/BotList.vue'
import BotModal from './components/BotModal.vue'
import BotSearch from './components/BotSearch.vue'
import BotStats from './components/BotStats.vue'
import { useBotManagement } from './composables/useBotManagement'

const {
  // 响应式数据
  isLoading,
  isSaving,
  bots,
  selectedBots,
  showBotMenu,
  showBotModal,
  modalMode,
  selectedBot,
  filters,
  pagination,
  botForm,
  botStats,
  
  // 计算属性
  filteredBots,
  paginatedBots,
  
  // 格式化函数
  formatDateTime,
  formatCurrency,
  formatAddress,
  formatType,
  getStatusText,
  getStatusColor,
  formatStatus,
  getTypeColor,
  formatUsername,
  formatToken,
  formatDate,
  
  // 机器人操作
  viewBot,
  editBot,
  goToConfig,
  saveBot,
  toggleBotStatus,
  testConnection,
  rechargeBalance,
  viewLogs,
  resetBot,
  refreshData,
  
  // 批量操作
  batchStart,
  batchStop,
  batchTest,
  clearSelection,
  
  // 其他功能
  exportData
} = useBotManagement()

// 获取API基础URL用于调试
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Lifecycle
// useBotManagement already handles onMounted and onUnmounted
</script>