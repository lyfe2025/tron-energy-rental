/**
 * 同步进程管理组合式函数
 */
import { ref } from 'vue'
import type { SyncData, SyncOptions, SyncResult } from '../types/sync.types'

export function useSyncProcess() {
  const syncing = ref(false)
  const syncLogs = ref<string[]>([])
  const syncResult = ref<SyncResult | null>(null)
  const showFullLogs = ref(false)

  // 重置状态
  const resetState = () => {
    syncing.value = false
    syncLogs.value = []
    syncResult.value = null
    showFullLogs.value = false
  }

  // 开始同步
  const startSync = async (
    botData: any,
    syncOptions: SyncOptions,
    currentFormData: any,
    selectedCount: number
  ) => {
    if (selectedCount === 0 || !botData) return
    
    try {
      syncing.value = true
      syncLogs.value = []
      syncResult.value = null
      
      // 开始同步过程
      syncLogs.value.push('🎯 开始同步到Telegram...')
      syncLogs.value.push(`📋 已选择 ${selectedCount} 项设置进行同步`)
      
      // 构建同步数据
      const syncData: SyncData = {
        options: { ...syncOptions },
        formData: currentFormData
      }
      
      syncLogs.value.push('📡 正在发送同步请求...')
      
      
      // 调用同步API
      const response = await fetch(`/api/bots/${botData.id}/manual-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(syncData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        syncResult.value = result.data
        
        // 显示详细的同步日志
        if (result.data.logs && result.data.logs.length > 0) {
          // 先添加分隔线
          syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          syncLogs.value.push('📝 详细同步日志:')
          syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          
          // 添加所有详细日志
          result.data.logs.forEach((log: string) => {
            syncLogs.value.push(log)
          })
          
          // 添加结束分隔线
          syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        }
      } else {
        syncResult.value = {
          success: false,
          hasPartialSuccess: false,
          results: {},
          errors: [result.message || '同步失败']
        }
        
        // 显示错误情况下的日志
        if (result.data && result.data.logs && result.data.logs.length > 0) {
          syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          syncLogs.value.push('📝 详细同步日志:')
          syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          
          result.data.logs.forEach((log: string) => {
            syncLogs.value.push(log)
          })
          
          syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        } else {
          syncLogs.value.push(`❌ 同步失败: ${result.message || '未知错误'}`)
        }
      }
      
    } catch (error: any) {
      console.error('同步失败:', error)
      
      // 添加网络错误日志
      syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      syncLogs.value.push('❌ 网络错误或请求失败:')
      syncLogs.value.push(`📄 错误详情: ${error.message || '未知网络错误'}`)
      if (error.stack) {
        syncLogs.value.push('🔍 技术详情: 请检查网络连接或联系技术支持')
      }
      syncLogs.value.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      syncResult.value = {
        success: false,
        hasPartialSuccess: false,
        results: {},
        errors: [error.message || '网络错误，请稍后重试']
      }
    } finally {
      syncing.value = false
    }
  }

  // 重试同步
  const retrySync = (
    botData: any,
    syncOptions: SyncOptions,
    currentFormData: any,
    selectedCount: number
  ) => {
    syncResult.value = null
    return startSync(botData, syncOptions, currentFormData, selectedCount)
  }

  return {
    syncing,
    syncLogs,
    syncResult,
    showFullLogs,
    resetState,
    startSync,
    retrySync
  }
}
