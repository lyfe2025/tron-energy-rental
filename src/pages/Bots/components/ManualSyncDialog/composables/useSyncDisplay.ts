/**
 * 同步显示相关工具函数
 */
import { SYNC_ITEM_NAMES, type SyncResult } from '../types/sync.types'

export function useSyncDisplay() {
  // 获取描述预览
  const getDescriptionPreview = (text?: string) => {
    if (!text) return '未设置'
    return text.length > 20 ? text.substring(0, 20) + '...' : text
  }

  // 获取命令预览
  const getCommandsPreview = (currentFormData?: any) => {
    const menuCommands = currentFormData?.menu_commands?.length || 0
    const customCommands = currentFormData?.custom_commands?.length || 0
    return `菜单命令: ${menuCommands}, 自定义命令: ${customCommands}`
  }

  // 获取Webhook URL预览
  const getWebhookUrlPreview = (url?: string) => {
    if (!url) return '未设置'
    if (url.length > 40) {
      return url.substring(0, 40) + '...'
    }
    return url
  }

  // 获取同步项目名称
  const getSyncItemName = (key: string) => {
    return SYNC_ITEM_NAMES[key] || key
  }

  // 获取同步结果描述
  const getSyncResultDescription = (syncResult?: SyncResult) => {
    if (!syncResult) return ''
    
    const total = Object.keys(syncResult.results).length
    const success = Object.values(syncResult.results).filter((r: any) => r === true).length
    const failed = Object.values(syncResult.results).filter((r: any) => r === false).length
    
    if (syncResult.success) {
      return `所有 ${total} 项设置都已成功同步到Telegram`
    } else if (syncResult.hasPartialSuccess) {
      return `${success} 项成功，${failed} 项失败，共 ${total} 项`
    } else {
      return `${failed} 项同步失败，请查看详细信息`
    }
  }

  return {
    getDescriptionPreview,
    getCommandsPreview,
    getWebhookUrlPreview,
    getSyncItemName,
    getSyncResultDescription
  }
}
