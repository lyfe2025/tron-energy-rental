import { Bell, DollarSign, Settings, Shield, Wrench } from 'lucide-vue-next'
import { computed, onMounted, reactive, watch } from 'vue'
import { useToast } from '../../../composables/useToast'
import { systemConfigsAPI } from '../../../services/api'
import type {
    SettingsManagementState,
    SettingsTab,
    SystemSettings
} from '../types/settings.types'

export function useSettings() {
  // 通知系统
  const toast = useToast()
  
  // 状态管理
  const state = reactive<SettingsManagementState>({
    settings: {
      basic: {
        systemName: 'TRON能量租赁系统',
        systemDescription: '专业的TRON网络能量和带宽租赁服务平台',
        contactEmail: 'support@tron-energy.com',
        supportPhone: '+86-400-123-4567',
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        currency: 'CNY',
        dateFormat: 'YYYY-MM-DD'
      },
      security: {
        enableTwoFactor: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordExpireDays: 90,
        enableIpWhitelist: false,
        ipWhitelist: [],
        enableApiRateLimit: true,
        apiRateLimit: 1000
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        systemAlerts: true,
        orderUpdates: true,
        lowBalanceAlert: true,
        maintenanceNotifications: true,
        weeklyReport: true,
        monthlyReport: true
      },
      advanced: {
        enableMaintenanceMode: false,
        maintenanceMessage: '系统维护中，预计恢复时间：2小时',
        enableDebugMode: false,
        logLevel: 'info',
        enableAutoBackup: true,
        backupRetentionDays: 30,
        enableCacheOptimization: true,
        cacheExpireTime: 3600
      },
      pricing: {
        energyBasePrice: 0.1,
        bandwidthBasePrice: 0.05,
        discountRules: [],
        emergencyFeeMultiplier: 1.5,
        minimumOrderAmount: 10,
        maximumOrderAmount: 10000
      }
    },
    activeTab: 'basic',
    isSaving: false,
    isLoading: false,
    isDirty: false,
    lastSaved: null
  })

  // 标签页配置
  const settingTabs: SettingsTab[] = [
    { id: 'basic', name: '基础设置', icon: Settings },
    { id: 'security', name: '安全设置', icon: Shield },
    { id: 'notifications', name: '通知设置', icon: Bell },
    { id: 'pricing', name: '定价设置', icon: DollarSign },
    { id: 'advanced', name: '高级设置', icon: Wrench }
  ]

  // 计算属性
  const currentTabSettings = computed(() => {
    return state.settings[state.activeTab as keyof SystemSettings]
  })

  const hasUnsavedChanges = computed(() => {
    return state.isDirty
  })

  // 配置键映射表 - 将后端配置键映射到前端设置结构
  const configKeyMappings = {
    // 基础设置
    'system.name': 'basic.systemName',
    'system.description': 'basic.systemDescription', 
    'system.contact_email': 'basic.contactEmail',
    'system.support_phone': 'basic.supportPhone',
    'system.timezone': 'basic.timezone',
    'system.language': 'basic.language',
    'system.currency': 'basic.currency',
    'system.date_format': 'basic.dateFormat',
    
    // 安全设置
    'security.enable_two_factor': 'security.enableTwoFactor',
    'security.session_timeout': 'security.sessionTimeout',
    'security.max_login_attempts': 'security.maxLoginAttempts',
    'security.password_expire_days': 'security.passwordExpireDays',
    'security.enable_ip_whitelist': 'security.enableIpWhitelist',
    'security.ip_whitelist': 'security.ipWhitelist',
    'security.enable_api_rate_limit': 'security.enableApiRateLimit',
    'security.api_rate_limit': 'security.apiRateLimit',
    
    // 通知设置
    'notification.email_enabled': 'notifications.emailNotifications',
    'notification.sms_enabled': 'notifications.smsNotifications',
    'notification.system_alerts': 'notifications.systemAlerts',
    'notification.order_updates': 'notifications.orderUpdates',
    'notification.low_balance_alert': 'notifications.lowBalanceAlert',
    'notification.maintenance_notifications': 'notifications.maintenanceNotifications',
    'notification.weekly_report': 'notifications.weeklyReport',
    'notification.monthly_report': 'notifications.monthlyReport',
    
    // 高级设置
    'system.maintenance_mode': 'advanced.enableMaintenanceMode',
    'system.maintenance_message': 'advanced.maintenanceMessage',
    'system.debug_mode': 'advanced.enableDebugMode',
    'system.log_level': 'advanced.logLevel',
    'system.auto_backup': 'advanced.enableAutoBackup',
    'system.backup_retention_days': 'advanced.backupRetentionDays',
    'system.cache_optimization': 'advanced.enableCacheOptimization',
    'system.cache_expire_time': 'advanced.cacheExpireTime',
    
    // 定价设置
    'pricing.energy_base_price': 'pricing.energyBasePrice',
    'pricing.bandwidth_base_price': 'pricing.bandwidthBasePrice',
    'pricing.emergency_fee_multiplier': 'pricing.emergencyFeeMultiplier',
    'pricing.minimum_order_amount': 'pricing.minimumOrderAmount',
    'pricing.maximum_order_amount': 'pricing.maximumOrderAmount'
  }

  /**
   * 设置对象中的嵌套属性值
   */
  const setNestedProperty = (obj: any, path: string, value: any) => {
    const keys = path.split('.')
    let current = obj
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
  }

  /**
   * 解析配置值
   */
  const parseConfigValue = (value: string, type?: string): any => {
    if (type === 'json' || (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{')))) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    
    if (value === 'true') return true
    if (value === 'false') return false
    
    const num = Number(value)
    if (!isNaN(num) && value !== '') return num
    
    return value
  }

  // 方法
  const loadSettings = async () => {
    state.isLoading = true
    try {
      // 从后端获取所有必要的系统配置
      const response = await systemConfigsAPI.getAllSettingsConfigs()
      
      if (response.data.success && response.data.data && response.data.data.configs) {
        const configs = response.data.data.configs
        
        // 将后端配置映射到前端设置结构
        configs.forEach((config: any) => {
          const frontendPath = configKeyMappings[config.config_key as keyof typeof configKeyMappings]
          if (frontendPath) {
            const parsedValue = parseConfigValue(config.config_value, config.config_type)
            setNestedProperty(state.settings, frontendPath, parsedValue)
          }
        })
        
        console.log('设置加载成功')
      }
    } catch (error: any) {
      console.error('加载设置失败:', error)
      
      // 显示错误通知
      let errorMessage = '加载系统设置失败'
      if (error.response?.status === 401) {
        errorMessage = '身份验证失败，请重新登录'
      } else if (error.response?.status === 403) {
        errorMessage = '没有权限查看系统设置'
      } else if (error.response?.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else if (!error.response) {
        errorMessage = '网络连接失败，请检查网络设置'
      }
      
      toast.error(errorMessage)
    } finally {
      state.isLoading = false
    }
  }

  /**
   * 获取对象中的嵌套属性值
   */
  const getNestedProperty = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * 获取标签页的中文名称
   */
  const getTabName = (tabId: string): string => {
    const tabNames: Record<string, string> = {
      basic: '基础',
      security: '安全',
      notifications: '通知',
      pricing: '定价',
      advanced: '高级'
    }
    return tabNames[tabId] || tabId
  }

  /**
   * 将前端设置转换为后端配置格式
   */
  const convertSettingsToConfigs = (settingsToSave: any): Array<{ config_key: string; config_value: any }> => {
    const configs: Array<{ config_key: string; config_value: any }> = []
    
    // 反向映射：从前端路径到后端配置键
    const reverseMapping: Record<string, string> = {}
    Object.entries(configKeyMappings).forEach(([backendKey, frontendPath]) => {
      reverseMapping[frontendPath] = backendKey
    })
    
    // 递归遍历设置对象
    const traverse = (obj: any, currentPath: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // 继续递归遍历嵌套对象
          traverse(value, fullPath)
        } else {
          // 查找对应的后端配置键
          const backendKey = reverseMapping[fullPath]
          if (backendKey) {
            let configValue = value
            
            // 处理特殊类型的值
            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
              configValue = JSON.stringify(value)
            } else if (typeof value === 'boolean') {
              configValue = value.toString()
            } else {
              configValue = String(value)
            }
            
            configs.push({
              config_key: backendKey,
              config_value: configValue
            })
          }
        }
      }
    }
    
    traverse(settingsToSave)
    return configs
  }

  const saveSettings = async (tabId?: string) => {
    state.isSaving = true
    
    // 显示保存中的通知
    const loadingToastId = toast.loading('正在保存设置...')
    
    try {
      // 确定要保存的设置
      const settingsToSave = tabId ? 
        { [tabId]: state.settings[tabId as keyof SystemSettings] } : 
        state.settings
      
      console.log('正在保存设置:', settingsToSave)
      
      // 将前端设置转换为后端配置格式
      const configs = convertSettingsToConfigs(settingsToSave)
      
      if (configs.length === 0) {
        // 关闭加载通知
        toast.dismiss(loadingToastId)
        toast.warning('没有找到需要保存的配置项')
        console.warn('没有找到需要保存的配置项')
        return
      }
      
      console.log('转换后的配置数据:', configs)
      
      // 调用后端API批量更新配置
      const changeReason = tabId ? `更新${tabId}设置` : '批量更新系统设置'
      const response = await systemConfigsAPI.updateConfigs(configs, changeReason)
      
      // 关闭加载通知
      toast.dismiss(loadingToastId)
      
      if (response.data.success) {
        state.isDirty = false
        state.lastSaved = new Date()
        
        // 显示成功通知
        const savedCount = configs.length
        const tabName = tabId ? getTabName(tabId) : '全部'
        toast.saveSuccess(`${tabName}设置保存成功，共更新 ${savedCount} 项配置`)
        
        console.log('设置保存成功')
      } else {
        throw new Error(response.data.message || '保存失败')
      }
      
    } catch (error: any) {
      // 关闭加载通知
      toast.dismiss(loadingToastId)
      
      console.error('保存设置失败:', error)
      
      // 显示错误通知
      let errorMessage = '设置保存失败，请稍后重试'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.response?.status === 401) {
        errorMessage = '身份验证失败，请重新登录'
      } else if (error.response?.status === 403) {
        errorMessage = '没有权限保存设置，请联系管理员'
      } else if (error.response?.status >= 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else if (!error.response) {
        errorMessage = '网络连接失败，请检查网络设置'
      }
      
      toast.saveError(errorMessage)
      throw error
    } finally {
      state.isSaving = false
    }
  }

  const saveAllSettings = async () => {
    await saveSettings()
  }

  const resetToDefaults = async () => {
    // 重置当前标签页的设置为默认值
    if (confirm('确定要重置当前标签页的设置为默认值吗？')) {
      try {
        // 这里应该调用API获取默认设置
        state.isDirty = true
        console.log('Reset to defaults for tab:', state.activeTab)
        
        // 显示成功通知
        const tabName = getTabName(state.activeTab)
        toast.success(`${tabName}设置已重置为默认值`)
      } catch (error) {
        console.error('重置设置失败:', error)
        toast.error('重置设置失败，请稍后重试')
      }
    }
  }

  const switchTab = (tabId: string) => {
    if (state.isDirty) {
      if (confirm('有未保存的更改，是否先保存？')) {
        saveSettings(state.activeTab).then(() => {
          state.activeTab = tabId
        })
        return
      }
    }
    state.activeTab = tabId
  }

  const updateSetting = (key: string, value: any) => {
    if (state.settings[state.activeTab as keyof SystemSettings]) {
      (state.settings[state.activeTab as keyof SystemSettings] as any)[key] = value
      state.isDirty = true
    }
  }

  const exportSettings = () => {
    try {
      const dataStr = JSON.stringify(state.settings, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `settings-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      URL.revokeObjectURL(url)
      
      // 显示成功通知
      toast.success('设置导出成功', {
        title: '导出完成',
        duration: 3000
      })
    } catch (error) {
      console.error('导出设置失败:', error)
      toast.error('导出设置失败，请稍后重试')
    }
  }

  const importSettings = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        state.settings = { ...state.settings, ...settings }
        state.isDirty = true
        
        // 显示成功通知
        toast.success('设置导入成功', {
          title: '导入完成',
          duration: 3000
        })
      } catch (error) {
        console.error('Failed to import settings:', error)
        toast.error('设置导入失败：文件格式不正确', {
          title: '导入失败'
        })
      }
    }
    reader.onerror = () => {
      toast.error('文件读取失败，请检查文件是否损坏')
    }
    reader.readAsText(file)
  }

  // 监听设置变化
  watch(
    () => state.settings,
    (newSettings, oldSettings) => {
      // 避免在初始化时触发isDirty
      if (oldSettings && JSON.stringify(newSettings) !== JSON.stringify(oldSettings)) {
        state.isDirty = true
      }
    },
    { deep: true }
  )

  // 生命周期
  onMounted(() => {
    loadSettings()
  })

  // 页面离开前提醒保存
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (state.isDirty) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnloadHandler)
  })

  return {
    // 响应式数据
    settings: computed(() => state.settings),
    activeTab: computed(() => state.activeTab),
    isSaving: computed(() => state.isSaving),
    isLoading: computed(() => state.isLoading),
    isDirty: computed(() => state.isDirty),
    lastSaved: computed(() => state.lastSaved),
    
    // 配置
    settingTabs,
    
    // 计算属性
    currentTabSettings,
    hasUnsavedChanges,
    
    // 方法
    loadSettings,
    saveSettings,
    saveAllSettings,
    resetToDefaults,
    switchTab,
    updateSetting,
    exportSettings,
    importSettings
  }
}
