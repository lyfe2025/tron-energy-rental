/**
 * Bot表单共享逻辑
 * 职责：提供机器人表单相关的共享逻辑和工具函数
 */
import { computed, reactive, ref } from 'vue'

// 自定义命令类型定义
export interface CustomCommand {
  command: string
  response_message: string
  is_enabled: boolean
}

// 菜单命令类型定义  
export interface MenuCommand {
  command: string
  description: string
}

// 表单数据类型定义
export interface BotFormData {
  name: string
  username: string
  token: string
  description: string
  short_description: string
  network_id?: string
  work_mode: 'polling' | 'webhook'
  webhook_url: string
  webhook_secret: string
  max_connections: number
  welcome_message: string
  help_message: string
  custom_commands: CustomCommand[]
  menu_button_enabled: boolean
  menu_button_text: string
  menu_type: 'commands' | 'web_app'
  web_app_url: string
  menu_commands: MenuCommand[]
  keyboard_config: any
  is_active: boolean
}

// 机器人数据类型定义
export interface BotData {
  id: string
  name: string
  username: string
  token?: string
  description?: string
  short_description?: string
  work_mode?: 'polling' | 'webhook'
  webhook_url?: string
  webhook_secret?: string
  max_connections?: number
  welcome_message?: string
  help_message?: string
  keyboard_config?: any
  status: string
  health_status?: string
  last_health_check?: string
  total_users?: number
  total_orders?: number
  created_at: string
  updated_at: string
}

/**
 * 获取默认键盘配置
 */
export const getDefaultKeyboardConfig = () => ({
  main_menu: {
    type: 'inline',
    title: 'TRON资源租赁主菜单',
    description: '选择您需要的服务',
    is_enabled: true,
    rows: [
      {
        is_enabled: true,
        buttons: [
          {
            text: '⚡ 能量闪租',
            callback_data: 'energy_flash',
            is_enabled: true,
            price_config_dependency: 'energy_flash'
          },
          {
            text: '🔥 笔数套餐',
            callback_data: 'transaction_package',
            is_enabled: true,
            price_config_dependency: 'transaction_package'
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '🔄 TRX闪兑',
            callback_data: 'trx_exchange',
            is_enabled: true,
            price_config_dependency: 'trx_exchange'
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '📋 我的订单',
            callback_data: 'my_orders',
            is_enabled: true,
            price_config_dependency: undefined
          },
          {
            text: '💰 账户余额',
            callback_data: 'check_balance',
            is_enabled: true,
            price_config_dependency: undefined
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '❓ 帮助支持',
            callback_data: 'help_support',
            is_enabled: true,
            price_config_dependency: undefined
          },
          {
            text: '🔄 刷新菜单',
            callback_data: 'refresh_menu',
            is_enabled: true,
            price_config_dependency: undefined
          }
        ]
      }
    ]
  },
  inline_keyboards: {},
  reply_keyboards: {},
  quick_actions: []
})

/**
 * 获取默认表单数据
 */
export const getDefaultFormData = (mode: 'create' | 'edit' = 'create'): BotFormData => ({
  name: '',
  username: '',
  token: '',
  description: '',
  short_description: '',
  network_id: mode === 'create' ? '' : undefined,
  work_mode: 'polling',
  webhook_url: '',
  webhook_secret: '',
  max_connections: 40,
  welcome_message: mode === 'create' ? `欢迎使用TRON能量租赁机器人！

🎯 我们提供：
⚡ 能量闪租 - 快速获取能量
🔥 笔数套餐 - 批量交易优惠  
🔄 TRX闪兑 - 便捷兑换服务

点击下方按钮开始使用👇` : '',
  help_message: mode === 'create' ? `📋 使用帮助

🔹 /start - 显示主菜单
🔹 /help - 显示此帮助信息
🔹 /balance - 查询账户余额
🔹 /orders - 查看我的订单

❓ 遇到问题？
联系客服：@support` : '',
  custom_commands: [],
  menu_button_enabled: false,
  menu_button_text: '菜单',
  menu_type: 'commands',
  web_app_url: '',
  menu_commands: [
    {
      command: 'start',
      description: '开始使用机器人'
    },
    {
      command: 'help',
      description: '获取帮助信息'
    }
  ],
  keyboard_config: getDefaultKeyboardConfig(),
  is_active: true
})

/**
 * Webhook URL验证
 */
export const isValidWebhookUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname !== 'localhost'
  } catch {
    return false
  }
}

/**
 * 时间格式化工具函数
 */
export const formatTime = (timeString?: string) => {
  if (!timeString) return ''
  
  try {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN')
  } catch {
    return timeString
  }
}

/**
 * 健康状态颜色
 */
export const getHealthStatusColor = (status?: string) => {
  switch (status) {
    case 'healthy': 
      return 'bg-green-100 text-green-800'
    case 'unhealthy': 
      return 'bg-yellow-100 text-yellow-800'
    case 'error': 
      return 'bg-red-100 text-red-800'
    default: 
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * 健康状态文本
 */
export const getHealthStatusText = (status?: string) => {
  switch (status) {
    case 'healthy': return '健康'
    case 'unhealthy': return '异常'
    case 'error': return '错误'
    default: return '未知'
  }
}

/**
 * 机器人表单逻辑 composable
 */
export const useBotForm = (mode: 'create' | 'edit' = 'create') => {
  const formData = reactive<BotFormData>(getDefaultFormData(mode))
  const priceConfigsStatus = ref<{ [key: string]: boolean }>({})

  // 表单验证
  const isFormValid = computed(() => {
    const basicValid = !!(
      formData.name.trim() &&
      formData.username.trim() &&
      formData.token.trim() &&
      formData.name.length >= 2 &&
      formData.name.length <= 50 &&
      formData.username.length >= 5 &&
      formData.username.length <= 32 &&
      /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$/.test(formData.username) &&
      /^\d+:[a-zA-Z0-9_-]+$/.test(formData.token)
    )
    
    // 如果选择webhook模式，需要验证webhook_url
    if (formData.work_mode === 'webhook') {
      return basicValid && !!(formData.webhook_url.trim() && isValidWebhookUrl(formData.webhook_url))
    }
    
    return basicValid
  })

  // 获取价格配置状态
  const fetchPriceConfigsStatus = async () => {
    try {
      const response = await fetch('/api/price-configs/public/active')
      if (response.ok) {
        const configs = await response.json()
        const statusMap: { [key: string]: boolean } = {}
        configs.forEach((config: any) => {
          statusMap[config.mode_type] = config.is_active
        })
        priceConfigsStatus.value = statusMap
      }
    } catch (error) {
      console.error('获取价格配置状态失败:', error)
    }
  }

  // 初始化表单数据（编辑模式）
  const initializeFormData = (botData?: BotData | null) => {
    if (!botData) return
    
    Object.assign(formData, {
      name: botData.name || '',
      username: botData.username || '',
      token: botData.token || '',
      description: botData.description || '',
      short_description: botData.short_description || '',
      work_mode: botData.work_mode || 'polling',
      webhook_url: botData.webhook_url || '',
      webhook_secret: botData.webhook_secret || '',
      max_connections: botData.max_connections || 40,
      welcome_message: botData.welcome_message || '',
      help_message: botData.help_message || '',
      keyboard_config: botData.keyboard_config || getDefaultKeyboardConfig(),
      is_active: botData.status === 'active'
    })
  }

  // 重置表单
  const resetForm = () => {
    Object.assign(formData, getDefaultFormData(mode))
  }

  // 从Telegram同步机器人信息
  const syncFromTelegram = async (botId: string) => {
    const response = await fetch(`/api/bots/${botId}/sync-from-telegram`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      // 更新表单数据
      if (result.data) {
        formData.name = result.data.name || formData.name
        formData.description = result.data.description || formData.description
        formData.short_description = result.data.short_description || formData.short_description
      }
      return { success: true, data: result.data }
    } else {
      throw new Error(result.message || '同步失败，请稍后重试')
    }
  }

  // 应用模式切换
  const applyModeChange = async (botId: string, originalMode: 'polling' | 'webhook') => {
    if (formData.work_mode === originalMode) return

    const response = await fetch(`/api/bots/${botId}/switch-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify({
        work_mode: formData.work_mode,
        webhook_url: formData.work_mode === 'webhook' ? formData.webhook_url : null,
        webhook_secret: formData.work_mode === 'webhook' ? formData.webhook_secret : null,
        max_connections: formData.work_mode === 'webhook' ? formData.max_connections : null
      })
    })
    
    if (response.ok) {
      return { success: true, mode: formData.work_mode }
    } else {
      const error = await response.json()
      throw new Error(error.message || '模式切换失败')
    }
  }

  return {
    formData,
    priceConfigsStatus,
    isFormValid,
    fetchPriceConfigsStatus,
    initializeFormData,
    resetForm,
    syncFromTelegram,
    applyModeChange
  }
}
