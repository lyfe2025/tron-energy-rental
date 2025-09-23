/**
 * 机器人操作相关组合式函数
 */
import { useToast } from '@/composables/useToast'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ref } from 'vue'

export function useBotActions() {
  const { success, error, warning, info } = useToast()
  
  // 状态
  const showCreateModal = ref(false)
  const showEditModal = ref(false)
  const showNetworkModal = ref(false)
  const showManualSyncDialog = ref(false)
  const selectedBot = ref<any>(null)
  const manualSyncBotData = ref<any>(null)
  const manualSyncFormData = ref<any>(null)

  // 页面特有方法
  const handleEdit = (bot: any) => {
    selectedBot.value = bot
    showEditModal.value = true
  }

  const handleConfigureNetwork = (bot: any) => {
    selectedBot.value = bot
    showNetworkModal.value = true
  }

  const handleCreateBot = async (data: any, refreshData: () => Promise<void>) => {
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
      
      const response = await botsAPI.createBot(createData)
      
      if (response.data?.success) {
        console.log('✅ 机器人创建API调用成功')
        
        success('机器人创建成功！数据已保存到数据库')
        
        showCreateModal.value = false
        await refreshData()
        
        // 自动弹出手动同步对话框
        const createdBot = response.data.data.bot
        if (createdBot) {
          manualSyncBotData.value = {
            ...createdBot,
            token: createData.token
          }
          // 🔥 根本修复：确保手动同步接收完整的用户配置数据
          manualSyncFormData.value = {
            ...createdBot,    // API返回的基础数据（id, created_at等）
            ...createData,    // 用户填写的所有配置字段（work_mode, webhook_url, menu_button_enabled等）
            token: createData.token // 确保token正确
          }
          showManualSyncDialog.value = true
          
          
          setTimeout(() => {
            info('机器人已创建完成，现在可以选择性地同步设置到Telegram')
          }, 500)
        }
        
      } else {
        throw new Error(response.data?.message || '创建失败')
      }
    } catch (error: any) {
      console.error('❌ 创建机器人失败:', error)
      error(error.message || '创建机器人失败')
    }
  }

  const handleUpdateBot = async (data: any, refreshData: () => Promise<void>) => {
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
        keyboard_config: data.keyboard_config || null,
        is_active: data.is_active
      }
      
      console.log('🚀 开始更新机器人，数据:', updateData)
      
      const response = await botsAPI.updateBot(data.id, updateData)
      
      if (response.data?.success) {
        console.log('✅ 机器人更新API调用成功')
        
        success('机器人更新成功！数据已保存到数据库，如需同步到Telegram请使用手动同步功能')
        
        showEditModal.value = false
        selectedBot.value = null
        await refreshData()
        
      } else {
        throw new Error(response.data?.message || '更新失败')
      }
    } catch (error: any) {
      console.error('❌ 更新机器人失败:', error)
      
      // 针对超时错误给出更友好的提示
      if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
        warning(error.friendlyMessage || '操作超时，数据库更新可能已完成，请刷新页面查看最新状态')
        
        // 自动刷新数据
        setTimeout(async () => {
          try {
            await refreshData()
            console.log('🔄 数据已自动刷新')
          } catch (refreshError) {
            console.warn('自动刷新失败:', refreshError)
          }
        }, 2000)
        
      } else {
        error(error.friendlyMessage || error.message || '更新机器人失败')
      }
    }
  }

  // 处理手动同步成功
  const handleManualSyncSuccess = (syncResult?: any, refreshData?: () => Promise<void>) => {
    console.log('📡 手动同步完成:', syncResult)
    if (syncResult?.success) {
      success('Telegram同步完成！')
    } else if (syncResult?.hasPartialSuccess) {
      warning('Telegram同步部分成功，请查看详细日志')
    }
    
    // 刷新机器人数据以获取最新状态
    if (refreshData) {
      refreshData()
    }
  }

  const handleNetworkUpdated = async (refreshData: () => Promise<void>) => {
    console.log('🔄 [Bots] 网络配置更新，开始刷新数据...')
    await refreshData()
    console.log('✅ [Bots] 数据刷新完成')
  }

  const handleNetworkCancelled = () => {
    console.log('❌ [Bots] 网络配置已取消，清理状态...')
    
    // 清理相关状态
    showNetworkModal.value = false
    selectedBot.value = null
    
    console.log('✅ [Bots] 网络配置取消状态清理完成')
  }

  // 处理健康检查后的刷新
  const handleRefreshBots = async (refreshData: () => Promise<void>) => {
    console.log('🔄 [Bots] 健康检查完成，开始刷新机器人列表...')
    try {
      await refreshData()
      console.log('✅ [Bots] 机器人列表刷新完成')
    } catch (error) {
      console.error('❌ [Bots] 刷新机器人列表失败:', error)
    }
  }

  return {
    // 状态
    showCreateModal,
    showEditModal,
    showNetworkModal,
    showManualSyncDialog,
    selectedBot,
    manualSyncBotData,
    manualSyncFormData,

    // 方法
    handleEdit,
    handleConfigureNetwork,
    handleCreateBot,
    handleUpdateBot,
    handleManualSyncSuccess,
    handleNetworkUpdated,
    handleNetworkCancelled,
    handleRefreshBots
  }
}
