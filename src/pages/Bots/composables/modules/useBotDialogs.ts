/**
 * 机器人弹窗管理模块
 * 负责各种弹窗的状态管理和操作
 */
import { reactive, ref } from 'vue'
import type { BotConfig, ConfirmDialogConfig } from './botTypes'

export function useBotDialogs() {
  // 确认弹窗状态
  const showConfirmDialog = ref(false)
  const confirmDialogConfig = reactive<ConfirmDialogConfig>({
    title: '',
    message: '',
    details: '',
    warning: '',
    type: 'danger',
    confirmText: '确认',
    cancelText: '取消',
    loading: false,
    onConfirm: () => {},
    onCancel: () => {
      showConfirmDialog.value = false
    }
  })

  // 机器人详情弹窗状态
  const showBotDetailDialog = ref(false)
  const selectedBotDetail = ref<BotConfig | null>(null)

  // 机器人日志弹窗状态
  const showBotLogsDialog = ref(false)
  const selectedBotLogs = ref<BotConfig | null>(null)
  const botLogs = ref<any[]>([])
  const logsLoading = ref(false)

  /**
   * 显示确认弹窗
   */
  const showConfirm = (config: Partial<ConfirmDialogConfig>) => {
    console.log('🔔 [useBotDialogs] showConfirm called:', config)
    Object.assign(confirmDialogConfig, {
      title: config.title || '确认操作',
      message: config.message || '确定要执行此操作吗？',
      details: config.details || '',
      warning: config.warning || '',
      type: config.type || 'danger',
      confirmText: config.confirmText || '确认',
      cancelText: config.cancelText || '取消',
      loading: false,
      onConfirm: config.onConfirm || (() => {}),
      onCancel: config.onCancel || (() => {
        showConfirmDialog.value = false
      })
    })
    showConfirmDialog.value = true
    console.log('🔔 [useBotDialogs] showConfirmDialog set to true, config:', confirmDialogConfig)
  }

  /**
   * 隐藏确认弹窗
   */
  const hideConfirm = () => {
    showConfirmDialog.value = false
    confirmDialogConfig.loading = false
  }

  /**
   * 处理确认操作
   */
  const handleConfirm = async () => {
    try {
      confirmDialogConfig.loading = true
      await confirmDialogConfig.onConfirm()
    } catch (error) {
      console.error('确认操作失败:', error)
    } finally {
      // 无论成功还是失败都要关闭弹窗
      hideConfirm()
    }
  }

  /**
   * 处理取消操作
   */
  const handleCancel = () => {
    confirmDialogConfig.onCancel()
  }

  /**
   * 显示机器人详情弹窗
   */
  const showBotDetail = (bot: BotConfig) => {
    selectedBotDetail.value = bot
    showBotDetailDialog.value = true
  }

  /**
   * 隐藏机器人详情弹窗
   */
  const hideBotDetail = () => {
    showBotDetailDialog.value = false
    selectedBotDetail.value = null
  }

  /**
   * 显示机器人日志弹窗
   */
  const showBotLogs = (bot: BotConfig) => {
    selectedBotLogs.value = bot
    showBotLogsDialog.value = true
    // 可以在这里加载日志数据
    loadBotLogs(bot.id)
  }

  /**
   * 隐藏机器人日志弹窗
   */
  const hideBotLogs = () => {
    showBotLogsDialog.value = false
    selectedBotLogs.value = null
    botLogs.value = []
  }

  /**
   * 加载机器人日志
   */
  const loadBotLogs = async (botId: string) => {
    try {
      logsLoading.value = true
      const { botsAPI } = await import('@/services/api/bots/botsAPI')
      const response = await botsAPI.getBotLogs(botId, { limit: 200, offset: 0 })
      
      if (response.data?.success && response.data?.data?.logs) {
        const rawLogs = response.data.data.logs
        
        // 去重和优化日志
        const processedLogs = deduplicateAndProcessLogs(rawLogs)
        
        botLogs.value = processedLogs.map((log: any) => ({
          timestamp: log.timestamp || log.created_at,
          level: log.level,
          message: log.message,
          action: log.action,
          source: log.source || 'unknown',
          context: log.context || log.metadata
        }))
      } else {
        botLogs.value = []
      }
      console.log('机器人日志加载成功:', botId, botLogs.value.length, '条记录')
    } catch (error) {
      console.error('加载机器人日志失败:', error)
      botLogs.value = []
    } finally {
      logsLoading.value = false
    }
  }

  /**
   * 去重和处理日志
   */
  const deduplicateAndProcessLogs = (logs: any[]) => {
    const seen = new Set<string>()
    const processed: any[] = []
    const importantActions = new Set([
      'user_message_received',
      'user_callback_received', 
      'command_handled',
      'text_response',
      'help_response',
      'menu_response',
      'balance_response',
      'bot_started',
      'bot_stopped',
      'bot_error'
    ])

    // 按时间戳排序（最新的在前）
    const sortedLogs = logs.sort((a, b) => 
      new Date(b.timestamp || b.created_at).getTime() - 
      new Date(a.timestamp || a.created_at).getTime()
    )

    for (const log of sortedLogs) {
      const timestamp = log.timestamp || log.created_at
      const timeKey = new Date(timestamp).toISOString().slice(0, 19) // 精确到秒
      
      // 创建唯一标识符：时间戳 + 动作 + 消息摘要
      const messageDigest = log.message.substring(0, 50)
      const uniqueKey = `${timeKey}-${log.action}-${messageDigest}`
      
      // 跳过重复的系统日志，但保留用户交互日志
      if (seen.has(uniqueKey)) {
        if (!importantActions.has(log.action) || log.message.includes('[DB_FALLBACK]')) {
          continue
        }
      }
      
      seen.add(uniqueKey)
      
      // 优化消息内容
      let processedMessage = log.message
      
      // 清理重复的消息内容
      if (processedMessage.includes(': ') && processedMessage.split(': ').length > 2) {
        const parts = processedMessage.split(': ')
        // 如果后面的部分有重复，只保留一份
        if (parts[1] === parts[2]) {
          processedMessage = `${parts[0]}: ${parts[1]}`
        }
      }
      
      // 移除DB_FALLBACK标记
      processedMessage = processedMessage.replace(/\[DB_FALLBACK\]\s*/, '')
      
      processed.push({
        ...log,
        message: processedMessage,
        priority: importantActions.has(log.action) ? 1 : 0
      })
    }

    // 按优先级和时间排序：重要日志优先，然后按时间
    return processed.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return new Date(b.timestamp || b.created_at).getTime() - 
             new Date(a.timestamp || a.created_at).getTime()
    })
  }

  /**
   * 刷新机器人日志
   */
  const refreshBotLogs = () => {
    if (selectedBotLogs.value) {
      loadBotLogs(selectedBotLogs.value.id)
    }
  }

  /**
   * 显示删除确认弹窗
   */
  const showDeleteConfirm = (bot: BotConfig, onConfirm: () => Promise<void>) => {
    console.log('🗑️ [useBotDialogs] showDeleteConfirm called for bot:', bot)
    showConfirm({
      title: '删除机器人',
      message: `确定要删除机器人 "${bot.name}" 吗？`,
      details: `用户名: @${bot.username}`,
      warning: '此操作不可撤销，请谨慎操作！',
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消',
      onConfirm
    })
  }

  /**
   * 显示批量删除确认弹窗
   */
  const showBatchDeleteConfirm = (count: number, onConfirm: () => Promise<void>) => {
    showConfirm({
      title: '批量删除机器人',
      message: `确定要删除选中的 ${count} 个机器人吗？`,
      warning: '此操作不可撤销，请谨慎操作！',
      type: 'danger',
      confirmText: '删除全部',
      cancelText: '取消',
      onConfirm
    })
  }

  /**
   * 显示状态切换确认弹窗
   */
  const showStatusToggleConfirm = (
    bot: BotConfig, 
    targetStatus: boolean, 
    onConfirm: () => Promise<void>
  ) => {
    const action = targetStatus ? '启用' : '停用'
    showConfirm({
      title: `${action}机器人`,
      message: `确定要${action}机器人 "${bot.name}" 吗？`,
      details: `用户名: @${bot.username}`,
      type: targetStatus ? 'info' : 'warning',
      confirmText: action,
      cancelText: '取消',
      onConfirm
    })
  }

  /**
   * 显示重启确认弹窗
   */
  const showRestartConfirm = (bot: BotConfig, onConfirm: () => Promise<void>) => {
    showConfirm({
      title: '重启机器人',
      message: `确定要重启机器人 "${bot.name}" 吗？`,
      details: `用户名: @${bot.username}`,
      warning: '重启过程中机器人将暂时不可用',
      type: 'warning',
      confirmText: '重启',
      cancelText: '取消',
      onConfirm
    })
  }

  return {
    // 确认弹窗
    showConfirmDialog,
    confirmDialogConfig,
    showConfirm,
    hideConfirm,
    handleConfirm,
    handleCancel,

    // 机器人详情弹窗
    showBotDetailDialog,
    selectedBotDetail,
    showBotDetail,
    hideBotDetail,

    // 机器人日志弹窗
    showBotLogsDialog,
    selectedBotLogs,
    botLogs,
    logsLoading,
    showBotLogs,
    hideBotLogs,
    loadBotLogs,
    refreshBotLogs,

    // 便捷方法
    showDeleteConfirm,
    showBatchDeleteConfirm,
    showStatusToggleConfirm,
    showRestartConfirm
  }
}
