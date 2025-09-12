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
    console.log('🗑️ [useBotManagement] handleDeleteBot:', bot)
    botDialogs.showDeleteConfirm(bot, async () => {
      console.log('🗑️ [useBotManagement] 确认删除，开始删除操作:', bot.id)
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

  /**
   * 刷新数据（别名方法，保持向后兼容）
   */
  const refreshData = async () => {
    await botOperations.refreshBots()
  }

  /**
   * 处理搜索（别名方法，保持向后兼容）
   */
  const handleSearch = () => {
    botSearch.performSearch()
  }

  /**
   * 处理下拉命令
   */
  const handleDropdownCommand = (command: string, bot?: BotConfig) => {
    console.log('🎯 [useBotManagement] handleDropdownCommand:', command, bot)
    switch (command) {
      case 'view':
        if (bot) {
          botDialogs.showBotDetail(bot)
        }
        break
      case 'copy':
        if (bot) {
          handleCopyConfig(bot)
        }
        break
      case 'logs':
        if (bot) {
          botDialogs.showBotLogs(bot)
        }
        break
      case 'delete':
        console.log('🗑️ [useBotManagement] 开始删除流程:', bot)
        if (bot) {
          handleDeleteBot(bot)
        }
        break
      case 'refresh':
        refreshData()
        break
      case 'export':
        exportData()
        break
      default:
        console.log('Unknown command:', command)
    }
  }

  /**
   * 复制机器人配置
   */
  const handleCopyConfig = async (bot: BotConfig) => {
    try {
      const configText = `机器人配置：
名称: ${bot.name}
用户名: @${bot.username}
状态: ${bot.is_active ? '启用' : '禁用'}
配置模板: ${getTemplateLabel(bot.template || 'custom')}
网络配置: ${bot.current_network ? bot.current_network.name : '未配置'}
创建时间: ${bot.created_at}
更新时间: ${bot.updated_at}
总用户数: ${bot.total_users || 0}
总订单数: ${bot.total_orders || 0}
描述: ${(bot as any).description || '无'}`
      
      // 使用现代剪贴板 API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(configText)
      } else {
        // 降级处理：创建临时文本域
        const textArea = document.createElement('textarea')
        textArea.value = configText
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
        } catch (err) {
          console.error('复制失败:', err)
          throw new Error('复制失败')
        }
        
        document.body.removeChild(textArea)
      }
      
      // 显示成功提示
      const { ElMessage } = await import('element-plus')
      ElMessage.success('配置信息已复制到剪贴板')
    } catch (error: any) {
      console.error('复制配置失败:', error)
      const { ElMessage } = await import('element-plus')
      ElMessage.error('复制失败，请重试')
    }
  }

  /**
   * 获取模板标签
   */
  const getTemplateLabel = (template: string) => {
    const templateMap: Record<string, string> = {
      energy: '能量租赁',
      service: '客服机器人', 
      custom: '自定义'
    }
    return templateMap[template] || '自定义'
  }

  /**
   * 关闭机器人详情弹窗（别名方法）
   */
  const closeBotDetailDialog = () => {
    botDialogs.hideBotDetail()
  }

  /**
   * 关闭机器人日志弹窗（别名方法）
   */
  const closeBotLogsDialog = () => {
    botDialogs.hideBotLogs()
  }

  /**
   * 处理页码变化（别名方法）
   */
  const handleCurrentChange = (page: number) => {
    botSearch.setPage(page)
  }

  /**
   * 处理机器人选择（别名方法）
   */
  const handleSelectBot = (botId: string) => {
    botOperations.toggleBotSelection(botId)
  }

  /**
   * 处理批量启用
   */
  const handleBatchEnable = async () => {
    // TODO: 实现批量启用逻辑
    console.log('批量启用机器人')
  }

  /**
   * 处理批量停用
   */
  const handleBatchDisable = async () => {
    // TODO: 实现批量停用逻辑
    console.log('批量停用机器人')
  }

  /**
   * 导出数据
   */
  const exportData = () => {
    // TODO: 实现导出逻辑
    console.log('导出机器人数据')
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
    getDefaultKeyboardConfig,

    // === 兼容性方法（保持向后兼容） ===
    refreshData,
    handleSearch,
    handleDropdownCommand,
    closeBotDetailDialog,
    closeBotLogsDialog,
    handleCurrentChange,
    handleSelectBot,
    handleBatchEnable,
    handleBatchDisable,
    exportData
  }
}

// 保持向后兼容性 - 导出类型
export type { BotConfig, Network, SearchForm }

// 保持向后兼容性 - 导出默认配置函数
export { getDefaultKeyboardConfig }
