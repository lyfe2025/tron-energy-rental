/**
 * 机器人编辑核心逻辑
 * 职责：处理机器人编辑的主要业务逻辑
 */
import { ElMessage } from 'element-plus'
import { computed, nextTick, ref } from 'vue'
import type { BotData } from '../../../composables/useBotFormShared'
import { useBotForm } from '../../../composables/useBotFormShared'

export function useBotEdit() {
  // 使用共享表单逻辑
  const { 
    formData, 
    priceConfigsStatus, 
    isFormValid, 
    fetchPriceConfigsStatus, 
    initializeFormData, 
    resetForm,
    applyModeChange 
  } = useBotForm('edit')

  // 响应式数据
  const saving = ref(false)
  const originalMode = ref<'polling' | 'webhook'>('polling')
  const showManualSyncDialog = ref(false)

  // 防止更新循环的标记
  let isUpdating = false

  // 计算属性：基础信息（只读，避免递归更新）
  const basicInfo = computed(() => ({
    name: formData.name,
    username: formData.username,
    token: formData.token,
    description: formData.description,
    short_description: formData.short_description
  }))

  // 计算属性：Webhook配置（只读，避免递归更新）
  const webhookConfig = computed(() => ({
    webhook_url: formData.webhook_url,
    webhook_secret: formData.webhook_secret,
    max_connections: formData.max_connections
  }))

  // 计算属性：消息配置（只读，避免递归更新）
  const messageConfig = computed(() => ({
    welcome_message: formData.welcome_message,
    help_message: formData.help_message,
    custom_commands: formData.custom_commands || [],
    is_active: formData.is_active
  }))

  // 计算属性：菜单按钮配置（只读，避免递归更新）
  const menuButtonConfig = computed(() => ({
    is_enabled: formData.menu_button_enabled || false,
    button_text: formData.menu_button_text || '菜单',
    menu_type: formData.menu_type || 'commands',
    web_app_url: formData.web_app_url || '',
    commands: formData.menu_commands || []
  }))

  // 基础信息更新处理函数
  const handleBasicInfoUpdate = (updatedInfo: any) => {
    if (isUpdating) return
    
    try {
      isUpdating = true
      
      // 只更新实际发生变化的字段
      const fieldsToUpdate: any = {}
      
      if (formData.name !== updatedInfo.name) fieldsToUpdate.name = updatedInfo.name
      if (formData.username !== updatedInfo.username) fieldsToUpdate.username = updatedInfo.username
      if (formData.token !== updatedInfo.token) fieldsToUpdate.token = updatedInfo.token
      if (formData.description !== updatedInfo.description) fieldsToUpdate.description = updatedInfo.description
      if (formData.short_description !== updatedInfo.short_description) fieldsToUpdate.short_description = updatedInfo.short_description
      
      // 只在有变化时才更新
      if (Object.keys(fieldsToUpdate).length > 0) {
        Object.assign(formData, fieldsToUpdate)
      }
    } finally {
      // 延迟重置标记，确保更新完全完成
      nextTick(() => {
        isUpdating = false
      })
    }
  }

  // Webhook配置更新处理函数
  const handleWebhookConfigUpdate = (updatedConfig: any) => {
    if (isUpdating) return
    
    try {
      isUpdating = true
      
      const fieldsToUpdate: any = {}
      
      if (formData.webhook_url !== updatedConfig.webhook_url) fieldsToUpdate.webhook_url = updatedConfig.webhook_url
      if (formData.webhook_secret !== updatedConfig.webhook_secret) fieldsToUpdate.webhook_secret = updatedConfig.webhook_secret
      if (formData.max_connections !== updatedConfig.max_connections) fieldsToUpdate.max_connections = updatedConfig.max_connections
      
      if (Object.keys(fieldsToUpdate).length > 0) {
        Object.assign(formData, fieldsToUpdate)
      }
    } finally {
      nextTick(() => {
        isUpdating = false
      })
    }
  }

  // 消息配置更新处理函数
  const handleMessageConfigUpdate = (updatedConfig: any) => {
    if (isUpdating) return
    
    try {
      isUpdating = true
      
      const fieldsToUpdate: any = {}
      
      if (formData.welcome_message !== updatedConfig.welcome_message) fieldsToUpdate.welcome_message = updatedConfig.welcome_message
      if (formData.help_message !== updatedConfig.help_message) fieldsToUpdate.help_message = updatedConfig.help_message
      if (formData.is_active !== updatedConfig.is_active) fieldsToUpdate.is_active = updatedConfig.is_active
      
      // 特殊处理数组类型
      const currentCommands = JSON.stringify(formData.custom_commands || [])
      const newCommands = JSON.stringify(updatedConfig.custom_commands || [])
      if (currentCommands !== newCommands) fieldsToUpdate.custom_commands = updatedConfig.custom_commands || []
      
      if (Object.keys(fieldsToUpdate).length > 0) {
        Object.assign(formData, fieldsToUpdate)
      }
    } finally {
      nextTick(() => {
        isUpdating = false
      })
    }
  }

  // 菜单按钮配置更新处理函数
  const handleMenuButtonConfigUpdate = (updatedConfig: any) => {
    if (isUpdating) return
    
    try {
      isUpdating = true
      
      const fieldsToUpdate: any = {}
      
      if (formData.menu_button_enabled !== updatedConfig.is_enabled) fieldsToUpdate.menu_button_enabled = updatedConfig.is_enabled
      if (formData.menu_button_text !== updatedConfig.button_text) fieldsToUpdate.menu_button_text = updatedConfig.button_text
      if (formData.menu_type !== updatedConfig.menu_type) fieldsToUpdate.menu_type = updatedConfig.menu_type
      if (formData.web_app_url !== updatedConfig.web_app_url) fieldsToUpdate.web_app_url = updatedConfig.web_app_url
      
      // 特殊处理数组类型
      const currentCommands = JSON.stringify(formData.menu_commands || [])
      const newCommands = JSON.stringify(updatedConfig.commands || [])
      if (currentCommands !== newCommands) fieldsToUpdate.menu_commands = updatedConfig.commands || []
      
      if (Object.keys(fieldsToUpdate).length > 0) {
        Object.assign(formData, fieldsToUpdate)
      }
    } finally {
      nextTick(() => {
        isUpdating = false
      })
    }
  }

  // 应用模式切换处理
  const handleApplyModeChange = async (botData: BotData | null | undefined, emit?: any) => {
    if (!botData) return
    
    try {
      saving.value = true
      const result = await applyModeChange(botData.id, originalMode.value)
      
      if (result.success) {
        originalMode.value = result.mode
        
        // 更新botData中的工作模式，确保状态显示同步
        if (botData) {
          botData.work_mode = result.mode
          botData.updated_at = new Date().toISOString()
        }
        
        // 如果有emit函数，触发刷新获取最新数据
        if (emit) {
          emit('refresh')
        }
        
        ElMessage.success(`✅ 已成功切换到 ${result.mode === 'webhook' ? 'Webhook' : 'Polling'} 模式`)
      }
    } catch (error: any) {
      console.error('模式切换失败:', error)
      ElMessage.error(`❌ 模式切换失败: ${error.message}`)
    } finally {
      saving.value = false
    }
  }

  // 手动同步成功处理
  const handleSyncSuccess = (emit: any) => {
    showManualSyncDialog.value = false
    ElMessage.success('同步操作已完成！')
    // 触发父组件刷新数据
    emit('refresh')
  }

  // 初始化表单数据
  const initializeForm = async (botData: BotData) => {
    console.log('🔄 初始化机器人编辑表单数据...')
    
    // 重置更新标记，确保可以进行初始化
    isUpdating = false
    
    // 使用 nextTick 确保DOM更新完成
    await nextTick()
    
    // 初始化数据
    initializeFormData(botData)
    originalMode.value = botData.work_mode || 'polling'
    
    // 延迟调用避免和其他响应式更新冲突
    setTimeout(() => {
      fetchPriceConfigsStatus()
    }, 100)
  }

  // 重置表单
  const resetFormData = () => {
    console.log('🔄 重置机器人编辑表单...')
    isUpdating = false
    resetForm()
  }

  return {
    // 响应式数据
    formData,
    priceConfigsStatus,
    isFormValid,
    saving,
    originalMode,
    showManualSyncDialog,

    // 计算属性
    basicInfo,
    webhookConfig,
    messageConfig,
    menuButtonConfig,

    // 更新处理函数
    handleBasicInfoUpdate,
    handleWebhookConfigUpdate,
    handleMessageConfigUpdate,
    handleMenuButtonConfigUpdate,

    // 操作函数
    handleApplyModeChange,
    handleSyncSuccess,
    initializeForm,
    resetFormData,
    fetchPriceConfigsStatus
  }
}
