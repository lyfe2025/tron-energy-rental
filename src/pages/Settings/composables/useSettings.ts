/**
 * 核心设置管理组合式函数 - 安全分离版本
 * 整合分离的功能模块，保持原有API接口完全不变
 */

import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useToast } from '../../../composables/useToast'
import { useAdvancedSettings } from './useAdvancedSettings'
import { useBasicSettings } from './useBasicSettings'
import { useNotificationSettings } from './useNotificationSettings'
import { usePricingSettings } from './usePricingSettings'
import { useSecuritySettings } from './useSecuritySettings'
import { useSettingsAPI } from './useSettingsAPI'
import { useSettingsCore } from './useSettingsCore'
import { useSettingsIO } from './useSettingsIO'
import { useSettingsValidation } from './useSettingsValidation'

export function useSettings() {
  // 通知系统
  const toast = useToast()
  
  // 确认对话框状态
  const showConfirmDialog = ref(false)
  const confirmDialogConfig = ref({
    title: '',
    message: '',
    type: 'warning' as 'warning' | 'danger',
    onConfirm: () => {}
  })
  
  // 显示确认对话框的辅助函数
  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'warning' | 'danger' = 'warning') => {
    return new Promise<boolean>((resolve) => {
      confirmDialogConfig.value = {
        title,
        message,
        type,
        onConfirm: () => {
          onConfirm()
          resolve(true)
        }
      }
      showConfirmDialog.value = true
    })
  }
  
  // 引入分离的设置模块
  const basicModule = useBasicSettings()
  const securityModule = useSecuritySettings()
  const notificationModule = useNotificationSettings()
  const pricingModule = usePricingSettings()
  const advancedModule = useAdvancedSettings()
  const validationModule = useSettingsValidation()
  
  // 引入分离的核心功能模块
  const coreModule = useSettingsCore()
  const apiModule = useSettingsAPI()
  const ioModule = useSettingsIO()

  // 计算属性
  const currentTabSettings = computed(() => {
    switch (coreModule.activeTab.value) {
      case 'basic': return basicModule.basicSettings
      case 'security': return securityModule.securitySettings
      case 'notifications': return notificationModule.notificationSettings
      case 'pricing': return pricingModule.pricingSettings
      case 'advanced': return advancedModule.advancedSettings
      default: return {}
    }
  })

  // 方法实现（调用分离的模块）
  const loadSettings = async () => {
    isLoading = true
    try {
      await apiModule.loadSettings(
        basicModule,
        securityModule,
        notificationModule,
        pricingModule,
        advancedModule,
        coreModule.setLoading
      )
      // 数据加载完成后，重置dirty状态，避免数据初始化触发未保存提示
      coreModule.setDirty(false)
    } finally {
      isLoading = false
    }
  }

  const saveSettings = async (tabId?: string) => {
    await apiModule.saveSettings(
      tabId,
      currentTabSettings.value,
      basicModule,
      securityModule,
      notificationModule,
      pricingModule,
      advancedModule,
      validationModule,
      coreModule.setSaving,
      coreModule.setDirty,
      coreModule.setLastSaved
    )
  }

  const switchTab = (tabId: string) => {
    if (coreModule.isDirty.value) {
      showConfirm(
        '未保存的更改',
        '有未保存的更改，是否先保存？',
        () => {
          saveSettings(coreModule.activeTab.value).then(() => {
            coreModule.setActiveTab(tabId)
          })
        }
      )
      return
    }
    coreModule.setActiveTab(tabId)
  }

  const updateSetting = (key: string, value: any) => {
    // 根据当前标签页更新对应模块的设置
    switch (coreModule.activeTab.value) {
      case 'basic':
        basicModule.updateBasicSetting(key as any, value)
        break
      case 'security':
        securityModule.updateSecuritySetting(key as any, value)
        break
      case 'notifications':
        notificationModule.updateNotificationSetting(key as any, value)
        break
      case 'pricing':
        pricingModule.updatePricingSetting(key as any, value)
        break
      case 'advanced':
        advancedModule.updateAdvancedSetting(key as any, value)
        break
    }
    coreModule.setDirty(true)
  }

  const exportSettings = () => {
    ioModule.exportSettings(
      basicModule,
      securityModule,
      notificationModule,
      pricingModule,
      advancedModule
    )
  }

  const importSettings = (file: File) => {
    ioModule.importSettings(
      file,
      basicModule,
      securityModule,
      notificationModule,
      pricingModule,
      advancedModule,
      coreModule.setDirty
    )
  }

  // 监听设置变化
  let isUpdating = false
  let isLoading = false
  
  watch(
    [() => basicModule.basicSettings, () => securityModule.securitySettings, 
     () => notificationModule.notificationSettings, () => pricingModule.pricingSettings, 
     () => advancedModule.advancedSettings],
    () => {
      // 在数据加载期间不触发dirty状态
      if (!isUpdating && !isLoading) {
        isUpdating = true
        nextTick(() => {
          coreModule.setDirty(true)
          isUpdating = false
        })
      }
    },
    { deep: true, flush: 'post' }
  )

  // 生命周期
  onMounted(() => {
    loadSettings()
  })

  // 添加缺失的方法
  const saveAllSettings = async () => {
    await saveSettings()
  }

  const resetToDefaults = async () => {
    // 重置当前标签页的设置为默认值
    showConfirm(
      '重置设置',
      '确定要重置当前标签页的设置为默认值吗？',
      async () => {
        try {
          switch (coreModule.activeTab.value) {
            case 'basic':
              basicModule.resetBasicSettings()
              break
            case 'security':
              securityModule.resetSecuritySettings()
              break
            case 'notifications':
              notificationModule.resetNotificationSettings()
              break
            case 'pricing':
              pricingModule.resetPricingSettings()
              break
            case 'advanced':
              advancedModule.resetAdvancedSettings()
              break
          }
          coreModule.setDirty(true)
          toast.success(`${coreModule.activeTab.value}设置已重置为默认值`)
        } catch (error) {
          console.error('重置设置失败:', error)
          toast.error('重置设置失败，请稍后重试')
        }
      },
      'warning'
    )
  }

  // 创建统一的settings对象
  const settings = computed(() => ({
    basic: basicModule.basicSettings,
    security: securityModule.securitySettings,
    notifications: notificationModule.notificationSettings,
    pricing: pricingModule.pricingSettings,
    advanced: advancedModule.advancedSettings
  }))

  return {
    // 响应式数据
    settings,
    activeTab: coreModule.activeTab,
    isSaving: coreModule.isSaving,
    isLoading: coreModule.isLoading,
    isDirty: coreModule.isDirty,
    lastSaved: coreModule.lastSaved,
    
    // 确认对话框状态
    showConfirmDialog,
    confirmDialogConfig,
    
    // 配置
    settingTabs: coreModule.settingTabs,
    
    // 计算属性
    currentTabSettings,
    hasUnsavedChanges: coreModule.hasUnsavedChanges,
    
    // 各模块设置
    basicSettings: basicModule.basicSettings,
    securitySettings: securityModule.securitySettings,
    notificationSettings: notificationModule.notificationSettings,
    pricingSettings: pricingModule.pricingSettings,
    advancedSettings: advancedModule.advancedSettings,
    
    // 方法
    loadSettings,
    saveSettings,
    saveAllSettings,
    resetToDefaults,
    switchTab,
    updateSetting,
    exportSettings,
    importSettings,
    showConfirm,
    
    // 各模块方法
    ...basicModule,
    ...securityModule,
    ...notificationModule,
    ...pricingModule,
    ...advancedModule,
    ...validationModule
  }
}