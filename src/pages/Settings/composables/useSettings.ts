import { Bell, DollarSign, Settings, Shield, Wrench } from 'lucide-vue-next'
import { computed, onMounted, reactive, watch } from 'vue'
import type {
    SettingsManagementState,
    SettingsTab,
    SystemSettings
} from '../types/settings.types'

export function useSettings() {
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

  // 方法
  const loadSettings = async () => {
    state.isLoading = true
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      // 实际项目中这里会调用API获取设置
      console.log('Settings loaded')
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      state.isLoading = false
    }
  }

  const saveSettings = async (tabId?: string) => {
    state.isSaving = true
    try {
      // 模拟API调用保存设置
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const settingsToSave = tabId ? 
        { [tabId]: state.settings[tabId as keyof SystemSettings] } : 
        state.settings
      
      console.log('Saving settings:', settingsToSave)
      
      state.isDirty = false
      state.lastSaved = new Date()
      
      // 显示成功消息
      // ElMessage.success('设置保存成功')
      
    } catch (error) {
      console.error('Failed to save settings:', error)
      // ElMessage.error('设置保存失败')
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
      // 这里应该调用API获取默认设置
      state.isDirty = true
      console.log('Reset to defaults for tab:', state.activeTab)
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
    const dataStr = JSON.stringify(state.settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `settings-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  const importSettings = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        state.settings = { ...state.settings, ...settings }
        state.isDirty = true
        // ElMessage.success('设置导入成功')
      } catch (error) {
        console.error('Failed to import settings:', error)
        // ElMessage.error('设置导入失败：文件格式不正确')
      }
    }
    reader.readAsText(file)
  }

  // 监听设置变化
  watch(
    () => state.settings,
    () => {
      state.isDirty = true
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
