/**
 * 设置导入导出模块
 * 负责设置的导出和导入功能
 */

import { useToast } from '../../../composables/useToast'

export function useSettingsIO() {
  const toast = useToast()

  /**
   * 导出设置
   */
  const exportSettings = (
    basicModule: any,
    securityModule: any,
    notificationModule: any,
    pricingModule: any,
    advancedModule: any
  ) => {
    try {
      const allSettings = {
        basic: basicModule.basicSettings,
        security: securityModule.securitySettings,
        notifications: notificationModule.notificationSettings,
        pricing: pricingModule.pricingSettings,
        advanced: advancedModule.advancedSettings
      }
      
      const dataStr = JSON.stringify(allSettings, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `settings-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      URL.revokeObjectURL(url)
      toast.success('设置导出成功')
    } catch (error) {
      console.error('导出设置失败:', error)
      toast.error('导出设置失败，请稍后重试')
    }
  }

  /**
   * 导入设置
   */
  const importSettings = (
    file: File,
    basicModule: any,
    securityModule: any,
    notificationModule: any,
    pricingModule: any,
    advancedModule: any,
    setDirty: (dirty: boolean) => void
  ) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        
        // 更新各个模块的设置
        if (settings.basic) Object.assign(basicModule.basicSettings, settings.basic)
        if (settings.security) Object.assign(securityModule.securitySettings, settings.security)
        if (settings.notifications) Object.assign(notificationModule.notificationSettings, settings.notifications)
        if (settings.pricing) Object.assign(pricingModule.pricingSettings, settings.pricing)
        if (settings.advanced) Object.assign(advancedModule.advancedSettings, settings.advanced)
        
        setDirty(true)
        toast.success('设置导入成功')
      } catch (error) {
        console.error('Failed to import settings:', error)
        toast.error('设置导入失败：文件格式不正确')
      }
    }
    reader.onerror = () => {
      toast.error('文件读取失败，请检查文件是否损坏')
    }
    reader.readAsText(file)
  }

  return {
    exportSettings,
    importSettings
  }
}
