<template>
  <div class="p-6">
    <!-- 页面工具栏 -->
    <BotToolbar
      :loading="loading"
      :connectivity-state="connectivityState"
      @refresh="refreshData"
      @check-connectivity="() => checkTelegramConnection()"
      @export-data="exportData"
      @create-bot="showCreateModal = true"
    />

    <!-- 搜索和筛选 -->
    <BotFilters
      v-model="searchForm"
      :networks="networks"
      :selected-bots="selectedBots"
      @search="handleSearch"
      @reset="resetSearch"
      @batch-enable="handleBatchEnable"
      @batch-disable="handleBatchDisable"
      @clear-selection="clearSelection"
    />

    <!-- 机器人列表 -->
    <BotList
      :loading="loading"
      :filtered-bots="filteredBots"
      :selected-bots="selectedBots"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @select-bot="handleSelectBot"
      @toggle-status="handleToggleStatus"
      @edit="handleEdit"
      @configure-network="handleConfigureNetwork"
      @dropdown-command="handleDropdownCommand"
      @open-notifications="handleOpenNotifications"
      @create-bot="showCreateModal = true"
      @page-change="handleCurrentChange"
    />

    <!-- 所有模态框 -->
    <BotModals
      :modals="modalState"
      @create-bot="handleCreateBot"
      @update-bot="handleUpdateBot"
      @refresh-bots="handleRefreshBots"
      @network-updated="handleNetworkUpdated"
      @network-cancelled="handleNetworkCancelled"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @close-bot-detail="closeBotDetailDialog"
      @close-bot-logs="closeBotLogsDialog"
      @refresh-logs="refreshBotLogs"
      @manual-sync-success="handleManualSyncSuccess"
      @update:showCreateModal="showCreateModal = $event"
      @update:showEditModal="showEditModal = $event"
      @update:showManualSyncDialog="showManualSyncDialog = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import BotFilters from './components/BotFilters.vue'
import BotList from './components/BotList/BotList.vue'
import BotModals from './components/Modals/BotModals.vue'
import BotToolbar from './components/Toolbar/BotToolbar.vue'
import { useBotActions } from './composables/useBotActions'
import { useBotManagement } from './composables/useBotManagementIntegrated'
import { useConnectivity } from './composables/useConnectivity'

// 使用连接状态管理
const { connectivityState, checkTelegramConnection, startConnectivityMonitoring } = useConnectivity()

// 使用机器人操作管理
const {
  showCreateModal,
  showEditModal,
  showNetworkModal,
  showManualSyncDialog,
  selectedBot,
  manualSyncBotData,
  manualSyncFormData,
  handleEdit,
  handleConfigureNetwork,
  handleCreateBot: createBot,
  handleUpdateBot: updateBot,
  handleManualSyncSuccess: manualSyncSuccess,
  handleNetworkUpdated: networkUpdated,
  handleNetworkCancelled: networkCancelled,
  handleRefreshBots: refreshBots
} = useBotActions()

// 使用机器人管理（主要业务逻辑）
const {
  // 状态
  loading,
  bots,
  networks,
  selectedBots,
  currentPage,
  pageSize,
  total,
  searchForm,
  showConfirmDialog,
  confirmDialogConfig,
  showBotDetailDialog,
  selectedBotDetail,
  showBotLogsDialog,
  selectedBotLogs,
  botLogs,
  logsLoading,
  
  // 计算属性
  filteredBots,
  
  // 方法
  refreshData,
  handleSearch,
  resetSearch,
  handleToggleStatus,
  handleDropdownCommand,
  closeBotDetailDialog,
  closeBotLogsDialog,
  refreshBotLogs,
  handleCurrentChange,
  handleSelectBot,
  clearSelection,
  handleBatchEnable,
  handleBatchDisable,
  exportData,
  handleConfirm,
  handleCancel
} = useBotManagement()

// 统一模态框状态
const modalState = computed(() => ({
  showCreateModal: showCreateModal.value,
  showEditModal: showEditModal.value,
  showNetworkModal: showNetworkModal.value,
  showManualSyncDialog: showManualSyncDialog.value,
  selectedBot: selectedBot.value,
  manualSyncBotData: manualSyncBotData.value,
  manualSyncFormData: manualSyncFormData.value,
  showConfirmDialog: showConfirmDialog.value,
  confirmDialogConfig: confirmDialogConfig,
  showBotDetailDialog: showBotDetailDialog.value,
  selectedBotDetail: selectedBotDetail.value,
  showBotLogsDialog: showBotLogsDialog.value,
  selectedBotLogs: selectedBotLogs.value,
  botLogs: botLogs.value,
  logsLoading: logsLoading.value
}))

// 封装业务方法以传递刷新函数
const handleCreateBot = (data: any) => createBot(data, refreshData)
const handleUpdateBot = (data: any) => updateBot(data, refreshData)
const handleManualSyncSuccess = (result?: any) => manualSyncSuccess(result, refreshData)
const handleNetworkUpdated = () => networkUpdated(refreshData)
const handleNetworkCancelled = () => networkCancelled()
const handleRefreshBots = () => refreshBots(refreshData)

// 处理通知管理（现在通过路由跳转）
const handleOpenNotifications = (bot: any) => {
  console.log('🚀 This event is no longer used, navigation is handled in BotCard component')
}

// 生命周期
onMounted(() => {
  refreshData()
  
  // 启动连接监控并获取清理函数
  const cleanup = startConnectivityMonitoring()
  
  // 页面卸载时清理
  onBeforeUnmount(cleanup)
})
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.gap-4 {
  gap: 1rem;
}

.gap-6 {
  gap: 1.5rem;
}
</style>