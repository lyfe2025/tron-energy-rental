import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref } from 'vue'
import type {
    AdvancedSettings,
    AudienceSettings,
    GlobalSettings,
    NotificationSettings,
    PriorityConfigItem,
    RateLimitSettings,
    SaveSettingsRequest,
    SettingsResponse,
    TimeSettings
} from '../types/settings.types'

export function useSettingsData(botId: string) {
  const saving = ref(false)
  const testing = ref(false)

  // 全局设置
  const globalSettings = reactive<GlobalSettings>({
    enabled: true,
    testMode: false,
    debugMode: false,
    defaultLanguage: 'zh-CN',
    defaultParseMode: 'Markdown',
    sendDelay: 1000
  })

  // 时间设置
  const timeSettings = reactive<TimeSettings>({
    enableTimeRestriction: false,
    allowedTimeRange: ['09:00', '21:00'],
    timezone: 'Asia/Shanghai',
    holidayOptions: []
  })

  // 频率限制设置
  const rateLimitSettings = reactive<RateLimitSettings>({
    messagesPerSecond: 10,
    messagesPerMinute: 600,
    batchDelay: 1000,
    userHourlyLimit: 20,
    userDailyLimit: 100,
    duplicateMessageInterval: 30,
    maxRetries: 3,
    retryDelay: 5000,
    failureAction: 'retry'
  })

  // 用户群体设置
  const audienceSettings = reactive<AudienceSettings>({
    defaultAudience: ['allUsers'],
    excludeGroups: ['blockedUsers', 'optOutUsers'],
    smartDelivery: true,
    personalizedContent: false,
    adaptiveScheduling: false
  })

  // 高级设置
  const advancedSettings = reactive<AdvancedSettings>({
    webhookUrl: '',
    webhookSecret: '',
    logRetentionDays: 30,
    analyticsRetentionDays: 90,
    failedMessageRetentionDays: 7,
    enableFailover: false,
    fallbackBotToken: ''
  })

  // 优先级配置
  const priorityConfig = ref<PriorityConfigItem[]>([
    { type: '订单通知', priority: 'high', weight: 8, maxDelay: 1 },
    { type: '支付通知', priority: 'high', weight: 9, maxDelay: 0.5 },
    { type: '系统维护', priority: 'high', weight: 10, maxDelay: 0 },
    { type: '代理审核', priority: 'medium', weight: 5, maxDelay: 6 },
    { type: '营销推广', priority: 'low', weight: 2, maxDelay: 24 },
    { type: '价格更新', priority: 'medium', weight: 6, maxDelay: 2 }
  ])

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/telegram-bot-notifications/${botId}/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const data: SettingsResponse = await response.json()
        
        // 更新各种设置
        Object.assign(globalSettings, data.data.global || {})
        Object.assign(timeSettings, data.data.time || {})
        Object.assign(rateLimitSettings, data.data.rateLimit || {})
        Object.assign(audienceSettings, data.data.audience || {})
        Object.assign(advancedSettings, data.data.advanced || {})
        
        if (data.data.priority) {
          priorityConfig.value = data.data.priority
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      ElMessage.error('加载设置失败')
    }
  }

  const saveAllSettings = async (): Promise<boolean> => {
    saving.value = true
    try {
      const settings: NotificationSettings = {
        global: globalSettings,
        time: timeSettings,
        rateLimit: rateLimitSettings,
        audience: audienceSettings,
        advanced: advancedSettings,
        priority: priorityConfig.value
      }
      
      const request: SaveSettingsRequest = { settings }
      
      const response = await fetch(`/api/telegram-bot-notifications/${botId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(request)
      })
      
      if (response.ok) {
        ElMessage.success('设置保存成功')
        return true
      } else {
        ElMessage.error('保存失败')
        return false
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      ElMessage.error('保存失败')
      return false
    } finally {
      saving.value = false
    }
  }

  const handleGlobalToggle = async (enabled: boolean) => {
    if (!enabled) {
      try {
        await ElMessageBox.confirm(
          '关闭通知功能将停止所有通知发送，确定要继续吗？',
          '确认关闭',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        ElMessage.info('通知功能已关闭')
      } catch {
        globalSettings.enabled = true
      }
    }
  }

  const testWebhook = async (): Promise<boolean> => {
    if (!advancedSettings.webhookUrl) {
      ElMessage.warning('请先输入Webhook URL')
      return false
    }
    
    testing.value = true
    try {
      const response = await fetch('/api/telegram-bot-notifications/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          url: advancedSettings.webhookUrl,
          secret: advancedSettings.webhookSecret
        })
      })
      
      if (response.ok) {
        ElMessage.success('Webhook测试成功')
        return true
      } else {
        ElMessage.error('Webhook测试失败')
        return false
      }
    } catch (error) {
      ElMessage.error('Webhook测试失败')
      return false
    } finally {
      testing.value = false
    }
  }

  const resetToDefaults = async () => {
    try {
      await ElMessageBox.confirm(
        '确定要恢复到默认设置吗？这将清空所有自定义配置。',
        '确认重置',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      
      // 重置到默认值
      Object.assign(globalSettings, {
        enabled: true,
        testMode: false,
        debugMode: false,
        defaultLanguage: 'zh-CN',
        defaultParseMode: 'Markdown',
        sendDelay: 1000
      })
      
      Object.assign(timeSettings, {
        enableTimeRestriction: false,
        allowedTimeRange: ['09:00', '21:00'],
        timezone: 'Asia/Shanghai',
        holidayOptions: []
      })
      
      Object.assign(rateLimitSettings, {
        messagesPerSecond: 10,
        messagesPerMinute: 600,
        batchDelay: 1000,
        userHourlyLimit: 20,
        userDailyLimit: 100,
        duplicateMessageInterval: 30,
        maxRetries: 3,
        retryDelay: 5000,
        failureAction: 'retry'
      })
      
      Object.assign(audienceSettings, {
        defaultAudience: ['allUsers'],
        excludeGroups: ['blockedUsers', 'optOutUsers'],
        smartDelivery: true,
        personalizedContent: false,
        adaptiveScheduling: false
      })
      
      Object.assign(advancedSettings, {
        webhookUrl: '',
        webhookSecret: '',
        logRetentionDays: 30,
        analyticsRetentionDays: 90,
        failedMessageRetentionDays: 7,
        enableFailover: false,
        fallbackBotToken: ''
      })
      
      ElMessage.success('已恢复到默认设置')
    } catch {
      // 用户取消
    }
  }

  return {
    // 状态
    saving,
    testing,
    globalSettings,
    timeSettings,
    rateLimitSettings,
    audienceSettings,
    advancedSettings,
    priorityConfig,
    
    // 方法
    loadSettings,
    saveAllSettings,
    handleGlobalToggle,
    testWebhook,
    resetToDefaults
  }
}
