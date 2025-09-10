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
          <Plus class="w-4 h-4" />
          添加机器人
        </button>
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
      :current-page="pagination.currentPage"
      :page-size="pagination.pageSize"
      :filtered-bots="filteredBots"
      :paginated-bots="paginatedBots"
      :show-bot-menu="showBotMenu"
      :format-date-time="formatDateTime"
      :get-status-text="getStatusText"
      :get-status-color="getStatusColor"
      :format-address="formatAddress"
      :format-type="formatType"
      :format-currency="formatCurrency"
      :format-username="formatUsername"
      :format-token="formatToken"
      :pagination="pagination"
      @view="viewBot"
      @edit="editBot"
      @toggle-status="toggleBotStatus"
      @recharge="rechargeBalance"
      @test-connection="testConnection"
      @add-bot="goToConfig"
      @open-notifications="openNotifications"
      @page-change="(page) => pagination.currentPage = page"
      @toggle-menu="(botId) => showBotMenu = showBotMenu === botId ? null : botId"
      @close-menu="() => showBotMenu = null"
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
      :format-address="formatAddress"
      :format-type="formatType"
      :format-status="formatStatus"
      :get-type-color="getTypeColor"
      :format-currency="formatCurrency"
      :get-status-color="getStatusColor"
      @close="showBotModal = false"
      @edit="editBot"
      @test-connection="testConnection"
      @submit="saveBot"
    />

    <!-- Notification Management Modal -->
    <div v-if="showNotificationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900">
            🔔 {{ notificationBot?.name }} - 通知管理
          </h3>
          <button
            @click="closeNotificationModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- Modal Content -->
        <div class="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <NotificationConfigPanel 
            v-if="notificationBot?.id"
            :bot-id="notificationBot.id"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NotificationConfigPanel from '@/components/BotManagement/NotificationConfigPanel.vue'
import type { Bot } from '@/types/api'
import { Plus, RotateCcw, X } from 'lucide-vue-next'
import { ref } from 'vue'
import BotActions from './Bots/components/BotActions.vue'
import BotList from './Bots/components/BotList.vue'
import BotModal from './Bots/components/BotModal.vue'
import BotSearch from './Bots/components/BotSearch.vue'
import BotStats from './Bots/components/BotStats.vue'
import { useBotManagement } from './Bots/composables/useBotManagement'

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
  formatUsername,
  formatToken,
  getStatusText,
  getStatusColor,
  formatStatus,
  getTypeColor,
  
  // 机器人操作
  viewBot,
  editBot,
  goToConfig,
  saveBot,
  toggleBotStatus,
  testConnection,
  rechargeBalance,
  refreshData,
  
  // 批量操作
  batchStart,
  batchStop,
  batchTest,
  clearSelection,
  
  // 其他功能
  exportData
} = useBotManagement()

// 通知管理模态框
const showNotificationModal = ref(false)
const notificationBot = ref<Bot | null>(null)

// 打开通知管理面板
const openNotifications = (bot: Bot) => {
  console.log('🚀 Main page: Opening notifications for bot:', bot.name, bot.id)
  notificationBot.value = bot
  showNotificationModal.value = true
  console.log('🚀 Modal state:', { showNotificationModal: showNotificationModal.value, notificationBot: notificationBot.value })
}

// 关闭通知管理面板
const closeNotificationModal = () => {
  showNotificationModal.value = false
  notificationBot.value = null
}

// Lifecycle
// useBotManagement already handles onMounted and onUnmounted
</script>
