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
  menu_button_enabled?: boolean
  menu_button_text?: string
  menu_type?: 'commands' | 'web_app'
  web_app_url?: string
  menu_commands?: MenuCommand[]
  custom_commands?: CustomCommand[]
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
    type: 'reply',
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
  welcome_message: mode === 'create' ? `🎉 欢迎使用TRON能量租赁机器人！

👋 你好，{first_name}！

🔋 我们提供快速、安全的TRON能量租赁服务：
• 💰 超低价格，性价比最高
• ⚡ 秒级到账，即买即用
• 🛡️ 安全可靠，无需私钥
• 🎯 多种套餐，满足不同需求

📱 使用 /menu 查看主菜单
❓ 使用 /help 获取帮助` : '',
  help_message: mode === 'create' ? `📖 TRON能量租赁机器人使用指南

🤖 基础命令：
• /start - 启动机器人
• /menu - 显示主菜单
• /help - 显示帮助信息
• /balance - 查询账户余额
• /orders - 查看订单历史

🔋 能量租赁流程：
1️⃣ 选择能量套餐
2️⃣ 输入接收地址
3️⃣ 确认订单信息
4️⃣ 完成支付
5️⃣ 等待能量到账

💡 注意事项：
• 请确保TRON地址正确
• 支付后请耐心等待确认
• 能量有效期为24小时

🆘 如需帮助，请联系客服` : '',
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

  // 防止重复请求的标记
  let fetchingPriceConfigs = false

  // 获取价格配置状态
  const fetchPriceConfigsStatus = async () => {
    // 防止重复调用
    if (fetchingPriceConfigs) {
      return
    }

    try {
      fetchingPriceConfigs = true
      const response = await fetch('/api/price-configs/public/active')
      if (response.ok) {
        const configs = await response.json()
        const statusMap: { [key: string]: boolean } = {}
        configs.forEach((config: any) => {
          statusMap[config.mode_type] = config.is_active
        })
        // 检查是否实际发生了变化，避免不必要的更新
        const currentStatus = JSON.stringify(priceConfigsStatus.value)
        const newStatus = JSON.stringify(statusMap)
        if (currentStatus !== newStatus) {
          priceConfigsStatus.value = statusMap
        }
      }
    } catch (error) {
      console.error('获取价格配置状态失败:', error)
    } finally {
      fetchingPriceConfigs = false
    }
  }

  // 防止重复初始化的标记
  let initializing = false

  // 初始化表单数据（编辑模式）
  const initializeFormData = (botData?: BotData | null) => {
    if (!botData || initializing) return
    
    console.log('🔄 初始化表单数据:', botData)
    
    // 防止重复初始化
    initializing = true
    
    try {
      // 构建新数据对象
      const newData = {
        name: botData.name || '',
        username: botData.username || '',
        token: botData.token || '',
        description: botData.description || '',
        short_description: botData.short_description || '',
        work_mode: (botData.work_mode as 'polling' | 'webhook') || 'polling',
        webhook_url: botData.webhook_url || '',
        webhook_secret: botData.webhook_secret || '',
        max_connections: botData.max_connections || 40,
        welcome_message: botData.welcome_message || '',
        help_message: botData.help_message || '',
        keyboard_config: botData.keyboard_config || getDefaultKeyboardConfig(),
        menu_button_enabled: botData.menu_button_enabled || false,
        menu_button_text: botData.menu_button_text || '菜单',
        menu_type: (botData.menu_type as 'commands' | 'web_app') || 'commands',
        web_app_url: botData.web_app_url || '',
        menu_commands: botData.menu_commands || [],
        custom_commands: botData.custom_commands || [],
        is_active: botData.status === 'active'
      }

      console.log('📝 准备更新表单数据:', newData)

      // 直接批量更新，不检查变化（因为这是初始化）
      Object.assign(formData, newData)
      
      console.log('✅ 表单数据初始化完成:', formData)
    } finally {
      // 延迟重置标记，确保同步操作完成
      setTimeout(() => {
        initializing = false
      }, 50)
    }
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

    // 构建请求数据，确保max_connections在有效范围内
    const requestData: any = {
      work_mode: formData.work_mode
    }

    // 如果是webhook模式，包含相关配置
    if (formData.work_mode === 'webhook') {
      requestData.webhook_url = formData.webhook_url || null
      requestData.webhook_secret = formData.webhook_secret || null
      
      // 确保max_connections在有效范围内(1-100)
      const maxConn = formData.max_connections
      if (maxConn && maxConn >= 1 && maxConn <= 100) {
        requestData.max_connections = maxConn
      } else {
        // 如果无效，使用默认值40
        requestData.max_connections = 40
      }
    }
    // polling模式不发送webhook相关字段

    const response = await fetch(`/api/bots/${botId}/switch-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify(requestData)
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
