<template>
  <div class="p-6">
    <!-- 页面头部 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">机器人管理</h1>
        <p class="text-gray-600 mt-1">管理和监控您的TRON机器人配置和网络设置</p>
      </div>
      <div class="flex gap-3 mt-4 sm:mt-0">
        <button
          @click="refreshData"
          :disabled="loading"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw :class="{ 'animate-spin': loading }" class="w-4 h-4" />
          刷新
        </button>
        <button
          @click="exportData"
          class="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
        >
          <Download class="w-4 h-4" />
          导出
        </button>
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          创建机器人
        </button>
      </div>
    </div>

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

    <!-- 机器人卡片列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" :class="{ 'opacity-50': loading }">
        <BotCard
          v-for="bot in filteredBots"
          :key="`${bot.id}-${bot.network_id || 'no-network'}-${bot.updated_at || Date.now()}-${Math.random()}`"
          :bot="bot"
          :is-selected="selectedBots.includes(bot.id)"
          @select="handleSelectBot"
          @toggle-status="handleToggleStatus"
          @edit="handleEdit"
          @configure-network="handleConfigureNetwork"
          @dropdown-command="handleDropdownCommand"
          @open-notifications="handleOpenNotifications"
        />
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredBots.length === 0" class="text-center py-12">
      <Bot class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无机器人</h3>
      <p class="text-gray-500 mb-4">开始创建您的第一个Telegram机器人配置</p>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
      >
        <Plus class="w-4 h-4" />
        创建机器人
      </button>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="flex justify-center mt-8">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-700">
          共 {{ total }} 条记录
        </span>
        <div class="flex gap-1">
          <button
            @click="handleCurrentChange(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span class="px-3 py-1 text-sm text-gray-700">
            第 {{ currentPage }} / {{ Math.ceil(total / pageSize) }} 页
          </span>
          <button
            @click="handleCurrentChange(currentPage + 1)"
            :disabled="currentPage >= Math.ceil(total / pageSize)"
            class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 创建机器人弹窗 -->
    <BotCreateModal
      v-model:visible="showCreateModal"
      @create="handleCreateBot"
    />

    <!-- 编辑机器人弹窗 -->
    <BotEditModal
      v-model:visible="showEditModal"
      :bot-data="selectedBot"
      @save="handleUpdateBot"
      @refresh="handleRefreshBots"
    />

    <!-- 网络配置弹窗 -->
    <NetworkConfigModal
      v-model:visible="showNetworkModal"
      entity-type="bot"
      :entity-data="selectedBot ? { id: selectedBot.id, name: selectedBot.name } : null"
      @success="handleNetworkUpdated"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :visible="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :details="confirmDialogConfig.details"
      :warning="confirmDialogConfig.warning"
      :type="confirmDialogConfig.type"
      :confirm-text="confirmDialogConfig.confirmText"
      :cancel-text="confirmDialogConfig.cancelText"
      :loading="confirmDialogConfig.loading"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @close="handleCancel"
    />

    <!-- 机器人详情弹窗 -->
    <BotDetailDialog
      :visible="showBotDetailDialog"
      :bot-detail="selectedBotDetail"
      @close="closeBotDetailDialog"
    />

    <!-- 机器人日志弹窗 -->
    <BotLogsDialog
      :visible="showBotLogsDialog"
      :bot-logs="selectedBotLogs"
      :logs="botLogs"
      :loading="logsLoading"
      @close="closeBotLogsDialog"
      @refresh-logs="refreshBotLogs"
    />

    <!-- Telegram同步状态弹窗 -->
    <SyncStatusDialog
      v-model="showSyncDialog"
      :sync-status="syncDialogData.syncStatus"
      :logs="syncDialogData.logs"
      :is-loading="syncDialogData.isLoading"
      :sync-result="syncDialogData.syncResult"
      @retry="handleRetrySyncBot"
    />

  </div>
</template>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import NetworkConfigModal from '@/components/NetworkConfigModal.vue'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessage } from 'element-plus'
import { Bot, Download, Plus, RefreshCw } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import BotCard from './components/BotCard.vue'
import BotCreateModal from './components/BotCreateModal.vue'
import BotDetailDialog from './components/BotDetailDialog.vue'
import BotEditModal from './components/BotEditModal.vue'
import BotFilters from './components/BotFilters.vue'
import BotLogsDialog from './components/BotLogsDialog.vue'
import SyncStatusDialog from './components/SyncStatusDialog.vue'
import { useBotManagement } from './composables/useBotManagementIntegrated'

// 弹窗状态
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showNetworkModal = ref(false)
const selectedBot = ref<any>(null)

// 同步状态对话框
const showSyncDialog = ref(false)
const syncDialogData = ref({
  isLoading: false,
  syncStatus: {},
  logs: [],
  syncResult: null
})


// 使用组合式函数
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

// 页面特有方法
const handleEdit = (bot: any) => {
  // 简化处理，避免过度复杂化
  selectedBot.value = bot
  showEditModal.value = true
}

const handleConfigureNetwork = (bot: any) => {
  selectedBot.value = bot
  showNetworkModal.value = true
}

const handleCreateBot = async (data: any) => {
  try {
    const createData = {
      name: data.name,
      username: data.username,
      token: data.token,
      description: data.description,
      short_description: data.short_description,
      network_id: data.network_id,
      work_mode: data.work_mode || 'polling',
      webhook_url: data.webhook_url,
      webhook_secret: data.webhook_secret,
      max_connections: data.max_connections || 40,
      welcome_message: data.welcome_message,
      help_message: data.help_message,
      custom_commands: data.custom_commands || [],
      menu_button_enabled: data.menu_button_enabled || false,
      menu_button_text: data.menu_button_text || '菜单',
      menu_type: data.menu_type || 'commands',
      web_app_url: data.web_app_url,
      menu_commands: data.menu_commands || [],
      keyboard_config: data.keyboard_config,
      is_active: data.is_active !== undefined ? data.is_active : true
    }
    
    console.log('🚀 开始创建机器人，数据:', createData)
    
    // 显示同步状态对话框
    showSyncDialog.value = true
    syncDialogData.value = {
      isLoading: true,
      syncStatus: {},
      logs: [],
      syncResult: null
    }
    
    const response = await botsAPI.createBot(createData)
    
    if (response.data?.success) {
      console.log('✅ 机器人创建API调用成功')
      
      // 更新同步状态 - 修复数据格式不匹配问题
      const syncResult = response.data.data?.sync_result
      const rawSyncStatus = syncResult?.results || response.data.data?.syncStatus || {}
      
      // 将后端返回的键名映射到前端期望的格式 - 使用安全的属性访问
      const syncStatus = {
        nameSync: (rawSyncStatus as any)?.name ?? null,
        descriptionSync: (rawSyncStatus as any)?.description ?? null,
        shortDescriptionSync: (rawSyncStatus as any)?.shortDescription ?? null,
        commandsSync: (rawSyncStatus as any)?.commands ?? null,
        menuButtonSync: (rawSyncStatus as any)?.menuButton ?? null,
        webhookSync: (rawSyncStatus as any)?.webhook ?? null,
        priceConfigSync: (rawSyncStatus as any)?.priceConfig ?? null
      }
      
      // 组合日志：包括成功信息和错误信息
      const syncLogs = [
        ...(syncResult?.summary ? [syncResult.summary] : []),
        ...(syncResult?.errors || response.data.data?.syncLogs || [])
      ]
      
      syncDialogData.value = {
        isLoading: false,
        syncStatus,
        logs: syncLogs,
        syncResult: syncResult
      }
      
      // 显示同步日志到控制台
      if (syncLogs.length > 0) {
        console.log('📋 Telegram同步日志:')
        syncLogs.forEach((log: string) => {
          console.log(log)
        })
      }
      
      showCreateModal.value = false
      await refreshData()
      
      // 同步完成，不自动关闭对话框，让用户查看日志后手动关闭
      // const successCount = Object.values(syncStatus).filter(Boolean).length
      // const totalCount = Object.values(syncStatus).filter(v => v !== null).length
      // if (successCount === totalCount) {
      //   setTimeout(() => {
      //     showSyncDialog.value = false
      //   }, 3000)
      // }
      
    } else {
      syncDialogData.value.isLoading = false
      throw new Error(response.data?.message || '创建失败')
    }
  } catch (error: any) {
    console.error('❌ 创建机器人失败:', error)
    syncDialogData.value.isLoading = false
    showSyncDialog.value = false
    ElMessage.error(error.message || '创建机器人失败')
  }
}

const handleUpdateBot = async (data: any) => {
  try {
    const updateData = {
      name: data.name,
      username: data.username,
      token: data.token,
      description: data.description,
      short_description: data.short_description,
      network_id: data.network_id,
      work_mode: data.work_mode,
      webhook_url: data.webhook_url,
      webhook_secret: data.webhook_secret,
      max_connections: data.max_connections,
      welcome_message: data.welcome_message,
      help_message: data.help_message,
      custom_commands: data.custom_commands || [],
      menu_button_enabled: data.menu_button_enabled || false,
      menu_button_text: data.menu_button_text || '菜单',
      menu_type: data.menu_type || 'commands',
      web_app_url: data.web_app_url,
      menu_commands: data.menu_commands || [],
      keyboard_config: data.keyboard_config && Object.keys(data.keyboard_config).length > 0 ? data.keyboard_config : null,
      is_active: data.is_active
    }
    
    console.log('🚀 开始更新机器人，数据:', updateData)
    
    // 显示同步状态对话框
    showSyncDialog.value = true
    syncDialogData.value = {
      isLoading: true,
      syncStatus: {},
      logs: [],
      syncResult: null
    }
    
    const response = await botsAPI.updateBot(data.id, updateData)
    
    if (response.data?.success) {
      console.log('✅ 机器人更新API调用成功')
      
      // 更新同步状态 - 修复数据格式不匹配问题
      const syncResult = response.data.data?.sync_result
      const rawSyncStatus = syncResult?.results || response.data.data?.syncStatus || {}
      
      
      // 将后端返回的键名映射到前端期望的格式 - 使用安全的属性访问
      const syncStatus = {
        nameSync: (rawSyncStatus as any)?.name ?? null,
        descriptionSync: (rawSyncStatus as any)?.description ?? null,
        shortDescriptionSync: (rawSyncStatus as any)?.shortDescription ?? null,
        commandsSync: (rawSyncStatus as any)?.commands ?? null,
        menuButtonSync: (rawSyncStatus as any)?.menuButton ?? null,
        webhookSync: (rawSyncStatus as any)?.webhook ?? null,
        priceConfigSync: (rawSyncStatus as any)?.priceConfig ?? null
      }
      
      // 组合日志：包括成功信息和错误信息
      const syncLogs = [
        ...(syncResult?.summary ? [syncResult.summary] : []),
        ...(syncResult?.errors || response.data.data?.syncLogs || [])
      ]
      
      syncDialogData.value = {
        isLoading: false,
        syncStatus,
        logs: syncLogs,
        syncResult: syncResult
      }
      
      // 显示同步日志到控制台
      if (syncLogs.length > 0) {
        console.log('📋 Telegram同步日志:')
        syncLogs.forEach((log: string) => {
          console.log(log)
        })
      }
      
      showEditModal.value = false
      selectedBot.value = null
      await refreshData()
      
      // 同步完成，不自动关闭对话框，让用户查看日志后手动关闭
      // const successCount = Object.values(syncStatus).filter(Boolean).length
      // const totalCount = Object.values(syncStatus).filter(v => v !== null).length
      // if (successCount === totalCount) {
      //   setTimeout(() => {
      //     showSyncDialog.value = false
      //   }, 3000)
      // }
      
    } else {
      syncDialogData.value.isLoading = false
      throw new Error(response.data?.message || '更新失败')
    }
  } catch (error: any) {
    console.error('❌ 更新机器人失败:', error)
    syncDialogData.value.isLoading = false
    showSyncDialog.value = false
    ElMessage.error(error.message || '更新机器人失败')
  }
}

const handleNetworkUpdated = async () => {
  console.log('🔄 [Bots] 网络配置更新，开始刷新数据...')
  await refreshData()
  console.log('✅ [Bots] 数据刷新完成')
}

// 处理健康检查后的刷新
const handleRefreshBots = async () => {
  console.log('🔄 [Bots] 健康检查完成，开始刷新机器人列表...')
  try {
    await refreshData()
    console.log('✅ [Bots] 机器人列表刷新完成')
  } catch (error) {
    console.error('❌ [Bots] 刷新机器人列表失败:', error)
  }
}

// 重试同步
const handleRetrySyncBot = () => {
  ElMessage.info('重试功能开发中，请重新保存机器人配置')
  showSyncDialog.value = false
}

// 处理通知管理（现在通过路由跳转）
const handleOpenNotifications = (bot: any) => {
  console.log('🚀 This event is no longer used, navigation is handled in BotCard component')
}

// 生命周期
onMounted(() => {
  refreshData()
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