/**
 * 同步选项管理组合式函数
 */
import { computed, reactive, type ComputedRef } from 'vue'
import type { SyncOptions } from '../types/sync.types'

export function useSyncOptions(currentFormData?: ComputedRef<any> | any) {
  // 同步选项
  const syncOptions = reactive<SyncOptions>({
    name: false,
    description: false,
    shortDescription: false,
    commands: false,
    workMode: false,
    webhookUrl: false,
    menuButton: false,
    replyKeyboard: false,
    inlineKeyboard: false,
    keyboardType: false,
    priceConfig: false
  })

  // 计算已选择的数量
  const selectedCount = computed(() => {
    return Object.values(syncOptions).filter(Boolean).length
  })

  // 🔥 获取当前响应式数据的辅助函数
  const getCurrentData = () => {
    // 如果是计算属性，获取其值；否则直接使用
    return currentFormData && typeof currentFormData === 'object' && 'value' in currentFormData 
      ? currentFormData.value 
      : currentFormData
  }

  // 全选
  const selectAll = () => {
    // 🔥 使用最新的响应式数据
    const formData = getCurrentData()
    
    
    // 重新计算键盘配置信息，与组件显示逻辑保持一致
    const keyboardConfig = formData?.keyboard_config
    const hasKeyboardConfig = keyboardConfig?.main_menu && 
                              keyboardConfig.main_menu.rows && 
                              Array.isArray(keyboardConfig.main_menu.rows) && 
                              keyboardConfig.main_menu.rows.length > 0
    const keyboardType = keyboardConfig?.main_menu?.type || 'inline'
    
    // 基础信息项，总是可以选择的
    const basicOptions = ['name', 'description', 'shortDescription', 'commands']
    // 配置验证项，总是可以选择的
    const validationOptions = ['keyboardType', 'priceConfig']
    // 高级设置项，需要根据条件判断
    const advancedOptions = ['workMode', 'webhookUrl', 'menuButton', 'replyKeyboard', 'inlineKeyboard']
    
    Object.keys(syncOptions).forEach(key => {
      // 基础信息项和配置验证项：总是选中
      if (basicOptions.includes(key) || validationOptions.includes(key)) {
        syncOptions[key as keyof SyncOptions] = true
        return
      }
      
      // 高级设置项：根据条件判断
      if (advancedOptions.includes(key)) {
        // 工作模式：总是可以选择
        if (key === 'workMode') {
          syncOptions[key as keyof SyncOptions] = true
          return
        }
        
        // Webhook URL: 在webhook模式下总是选择(无论是否已设置URL)
        if (key === 'webhookUrl') {
          // 🔥 修复字段名兼容性问题 - 使用最新的响应式数据
          const workMode = formData?.work_mode || formData?.workMode
          const isWebhookMode = workMode === 'webhook'
          
          if (isWebhookMode) {
            syncOptions[key as keyof SyncOptions] = true
          }
          return
        }
        
        // 菜单按钮: 全选时总是包含(所有机器人都支持菜单按钮功能)
        if (key === 'menuButton') {
          syncOptions[key as keyof SyncOptions] = true
          return
        }
        
        // 回复键盘 - 基于键盘类型，不依赖具体按钮配置
        if (key === 'replyKeyboard') {
          const canUseReplyKeyboard = keyboardType === 'reply'
          if (canUseReplyKeyboard) {
            syncOptions[key as keyof SyncOptions] = true
          }
          return
        }
        
        // 内嵌键盘 - 基于键盘类型，不依赖具体按钮配置
        // 内嵌键盘是默认类型，即使没有配置也应该可以同步
        if (key === 'inlineKeyboard') {
          const canUseInlineKeyboard = keyboardType === 'inline' || !formData?.keyboard_config?.main_menu?.type
          if (canUseInlineKeyboard) {
            syncOptions[key as keyof SyncOptions] = true
          }
          return
        }
      }
    })
  }

  // 全不选
  const selectNone = () => {
    Object.keys(syncOptions).forEach(key => {
      syncOptions[key as keyof SyncOptions] = false
    })
  }

  // 重置选项
  const resetOptions = () => {
    Object.keys(syncOptions).forEach(key => {
      syncOptions[key as keyof SyncOptions] = false
    })
  }

  return {
    syncOptions,
    selectedCount,
    selectAll,
    selectNone,
    resetOptions
  }
}
