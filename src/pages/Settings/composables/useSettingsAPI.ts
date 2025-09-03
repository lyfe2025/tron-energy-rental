/**
 * 设置API操作模块
 * 负责设置的加载和保存功能
 */

import { useToast } from '../../../composables/useToast'
import { systemConfigsAPI } from '../../../services/api'
import { useSettingsConfig } from './useSettingsConfig'

export function useSettingsAPI() {
  const toast = useToast()
  const { configKeyMappings, parseConfigValue, buildConfigArray } = useSettingsConfig()

  /**
   * 加载设置
   */
  const loadSettings = async (
    basicModule: any,
    securityModule: any,
    notificationModule: any,
    pricingModule: any,
    advancedModule: any,
    setLoading: (loading: boolean) => void
  ) => {
    setLoading(true)
    try {
      // 从后端获取所有必要的系统配置
      const response = await systemConfigsAPI.getAllSettingsConfigs()
      
      if (response.data.success && response.data.data) {
        const configs = response.data.data
        
        // 将后端配置映射到各个设置模块
        configs.forEach((config: any) => {
          const frontendKey = configKeyMappings[config.config_key as keyof typeof configKeyMappings]
          if (frontendKey) {
            const parsedValue = parseConfigValue(config.config_value, config.config_type)
            
            // 根据配置键前缀分发到对应模块
            if (config.config_key.startsWith('system.')) {
              (basicModule.basicSettings as any)[frontendKey] = parsedValue
            } else if (config.config_key.startsWith('security.')) {
              (securityModule.securitySettings as any)[frontendKey] = parsedValue
            } else if (config.config_key.startsWith('notification.')) {
              (notificationModule.notificationSettings as any)[frontendKey] = parsedValue
            } else if (config.config_key.startsWith('pricing.')) {
              (pricingModule.pricingSettings as any)[frontendKey] = parsedValue
            } else if (config.config_key.startsWith('cache.') || 
                      config.config_key.startsWith('logging.') || 
                      config.config_key.startsWith('api.') || 
                      config.config_key.startsWith('feature.')) {
              (advancedModule.advancedSettings as any)[frontendKey] = parsedValue
            }
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
      setLoading(false)
    }
  }

  /**
   * 保存设置
   */
  const saveSettings = async (
    tabId: string | undefined,
    currentTabSettings: any,
    basicModule: any,
    securityModule: any,
    notificationModule: any,
    pricingModule: any,
    advancedModule: any,
    validationModule: any,
    setSaving: (saving: boolean) => void,
    setDirty: (dirty: boolean) => void,
    setLastSaved: (date: Date) => void
  ) => {
    setSaving(true)
    
    // 显示保存中的通知
    const loadingToastId = toast.loading('正在保存设置...')
    
    try {
      // 验证设置
      if (tabId) {
        const currentSettings = { [tabId]: currentTabSettings }
        const errors = validationModule.validateSettingsForm(currentSettings, tabId)
        if (errors.length > 0) {
          toast.dismiss(loadingToastId)
          toast.error(errors.join('; '))
          return
        }
      }

      // 构建要保存的配置数据
      const settingsToProcess = tabId ? { [tabId]: currentTabSettings } : {
        basic: basicModule.basicSettings,
        security: securityModule.securitySettings,
        notifications: notificationModule.notificationSettings,
        pricing: pricingModule.pricingSettings,
        advanced: advancedModule.advancedSettings
      }

      const configs = buildConfigArray(settingsToProcess)

      if (configs.length === 0) {
        toast.dismiss(loadingToastId)
        toast.warning('没有找到需要保存的配置项')
        return
      }
      
      // 调用后端API批量更新配置
      const changeReason = tabId ? `更新${tabId}设置` : '批量更新系统设置'
      const response = await systemConfigsAPI.updateConfigs(configs, changeReason)
      
      toast.dismiss(loadingToastId)
      
      if (response.data.success) {
        setDirty(false)
        setLastSaved(new Date())
        
        const savedCount = configs.length
        const tabName = tabId || '全部'
        toast.saveSuccess(`${tabName}设置保存成功，共更新 ${savedCount} 项配置`)
      } else {
        throw new Error(response.data.message || '保存失败')
      }
      
    } catch (error: any) {
      toast.dismiss(loadingToastId)
      console.error('保存设置失败:', error)
      
      let errorMessage = '设置保存失败，请稍后重试'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.saveError(errorMessage)
      throw error
    } finally {
      setSaving(false)
    }
  }

  return {
    loadSettings,
    saveSettings
  }
}
