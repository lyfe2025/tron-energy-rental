/**
 * 机器人管理 composable - 重构后的集成版本
 * 整合所有机器人管理相关的功能模块
 * 
 * 重构说明：
 * - 将原来的巨型composable分离为多个专门的模块
 * - 保持完全相同的公共接口和返回值结构
 * - 确保功能完整性和向后兼容性
 */
import { computed } from 'vue'

// 导入分离后的模块
import { getDefaultKeyboardConfig } from './modules/botKeyboardConfig'
import type { BotConfig, Network, SearchForm } from './modules/botTypes'
import { useBotDialogs } from './modules/useBotDialogs'
import { useBotOperations } from './modules/useBotOperations'
import { useBotSearch } from './modules/useBotSearch'

/**
 * 机器人管理主composable
 * 集成所有子模块，提供统一的接口
 */
export function useBotManagement() {
  // 初始化各个模块
  const botOperations = useBotOperations()
  const botSearch = useBotSearch(botOperations.bots)
  const botDialogs = useBotDialogs()

  // 计算属性：是否全选
  const isAllSelected = computed(() => {
    const allBots = botSearch.paginatedBots.value
    return allBots.length > 0 && 
           botOperations.selectedBots.value.length === allBots.length &&
           allBots.every(bot => botOperations.selectedBots.value.includes(bot.id))
  })

  // 计算属性：是否部分选中
  const isIndeterminate = computed(() => {
    const selectedCount = botOperations.selectedBots.value.length
    const totalCount = botSearch.paginatedBots.value.length
    return selectedCount > 0 && selectedCount < totalCount
  })

  /**
   * 处理机器人删除
   */
  const handleDeleteBot = async (bot: BotConfig) => {
    botDialogs.showDeleteConfirm(bot, async () => {
      await botOperations.deleteBot(bot.id)
    })
  }

  /**
   * 处理批量删除
   */
  const handleBatchDelete = async () => {
    const count = botOperations.selectedBots.value.length
    botDialogs.showBatchDeleteConfirm(count, async () => {
      await botOperations.batchDeleteBots()
    })
  }

  /**
   * 处理状态切换
   */
  const handleToggleStatus = async (bot: BotConfig) => {
    const targetStatus = !bot.is_active
    botDialogs.showStatusToggleConfirm(bot, targetStatus, async () => {
      await botOperations.toggleBotStatus(bot)
    })
  }

  /**
   * 处理机器人重启
   */
  const handleRestartBot = async (bot: BotConfig) => {
    botDialogs.showRestartConfirm(bot, async () => {
      await botOperations.restartBot(bot)
    })
  }

  /**
   * 处理机器人同步
   */
  const handleSyncBot = async (bot: BotConfig) => {
    await botOperations.syncBot(bot)
  }

  /**
   * 处理全选/取消全选
   */
  const handleToggleAll = () => {
    botOperations.toggleAllBots(botSearch.paginatedBots.value)
  }

  /**
   * 处理单个机器人选择
   */
  const handleToggleBot = (botId: string) => {
    botOperations.toggleBotSelection(botId)
  }

  /**
   * 初始化
   */
  const initialize = async () => {
    await botOperations.initialize()
  }

  // 集成所有模块的返回值
  return {
    // === 基础数据 ===
    loading: botOperations.loading,
    bots: botOperations.bots,
    networks: botOperations.networks,
    selectedBots: botOperations.selectedBots,

    // === 搜索相关 ===
    searchForm: botSearch.searchForm,
    currentPage: botSearch.currentPage,
    pageSize: botSearch.pageSize,
    total: botSearch.total,
    filteredBots: botSearch.filteredBots,
    paginatedBots: botSearch.paginatedBots,
    totalPages: botSearch.totalPages,
    paginationInfo: botSearch.paginationInfo,
    hasSearchConditions: botSearch.hasSearchConditions,

    // === 计算属性 ===
    isAllSelected,
    isIndeterminate,

    // === 弹窗相关 ===
    showConfirmDialog: botDialogs.showConfirmDialog,
    confirmDialogConfig: botDialogs.confirmDialogConfig,
    showBotDetailDialog: botDialogs.showBotDetailDialog,
    selectedBotDetail: botDialogs.selectedBotDetail,
    showBotLogsDialog: botDialogs.showBotLogsDialog,
    selectedBotLogs: botDialogs.selectedBotLogs,
    botLogs: botDialogs.botLogs,
    logsLoading: botDialogs.logsLoading,

    // === 基础操作方法 ===
    loadBots: botOperations.loadBots,
    loadNetworks: botOperations.loadNetworks,
    refreshBots: botOperations.refreshBots,
    initialize,

    // === 搜索操作方法 ===
    resetSearch: botSearch.resetSearch,
    performSearch: botSearch.performSearch,
    setPage: botSearch.setPage,
    prevPage: botSearch.prevPage,
    nextPage: botSearch.nextPage,
    setPageSize: botSearch.setPageSize,
    getStatusOptions: botSearch.getStatusOptions,
    getTemplateOptions: botSearch.getTemplateOptions,

    // === 选择操作方法 ===
    toggleBotSelection: botOperations.toggleBotSelection,
    toggleAllBots: botOperations.toggleAllBots,
    clearSelection: botOperations.clearSelection,
    handleToggleAll,
    handleToggleBot,

    // === 机器人操作方法 ===
    deleteBot: botOperations.deleteBot,
    batchDeleteBots: botOperations.batchDeleteBots,
    toggleBotStatus: botOperations.toggleBotStatus,
    restartBot: botOperations.restartBot,
    syncBot: botOperations.syncBot,
    handleDeleteBot,
    handleBatchDelete,
    handleToggleStatus,
    handleRestartBot,
    handleSyncBot,

    // === 弹窗操作方法 ===
    showConfirm: botDialogs.showConfirm,
    hideConfirm: botDialogs.hideConfirm,
    handleConfirm: botDialogs.handleConfirm,
    handleCancel: botDialogs.handleCancel,
    showBotDetail: botDialogs.showBotDetail,
    hideBotDetail: botDialogs.hideBotDetail,
    showBotLogs: botDialogs.showBotLogs,
    hideBotLogs: botDialogs.hideBotLogs,
    loadBotLogs: botDialogs.loadBotLogs,
    refreshBotLogs: botDialogs.refreshBotLogs,

    // === 查询方法 ===
    findBotById: botOperations.findBotById,
    findBotByUsername: botOperations.findBotByUsername,
    getActiveBotCount: botOperations.getActiveBotCount,
    getInactiveBotCount: botOperations.getInactiveBotCount,

    // === 工具方法 ===
    getDefaultKeyboardConfig
  }
}

// 保持向后兼容性 - 导出类型
export type { BotConfig, Network, SearchForm }

// 保持向后兼容性 - 导出默认配置函数
export { getDefaultKeyboardConfig }
