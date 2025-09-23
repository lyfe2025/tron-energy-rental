import { useToast } from '@/composables/useToast'
import { ElMessageBox } from 'element-plus'
import { ref } from 'vue'
import type { NotificationSettings } from '../types/settings.types'

export function useSettingsImportExport(
  botId: string,
  getAllSettings: () => NotificationSettings,
  applySettings: (settings: Partial<NotificationSettings>) => void
) {
  const { success, error, warning } = useToast()
  
  const showImportDialog = ref(false)
  const importData = ref<any>(null)

  const exportSettings = () => {
    const settings = {
      ...getAllSettings(),
      exportTime: new Date().toISOString(),
      botId: botId
    }
    
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `bot-notification-settings-${botId}-${Date.now()}.json`
    link.click()
    
    URL.revokeObjectURL(url)
    success('配置已导出')
  }

  const importSettings = () => {
    showImportDialog.value = true
  }

  const handleFileChange = (file: any) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        importData.value = JSON.parse(e.target?.result as string)
        success('文件读取成功')
      } catch (error) {
        error('文件格式错误')
        importData.value = null
      }
    }
    reader.readAsText(file.raw)
  }

  const confirmImport = async () => {
    if (!importData.value) {
      warning('请先选择配置文件')
      return
    }
    
    try {
      await ElMessageBox.confirm(
        '导入配置将覆盖当前所有设置，确定要继续吗？',
        '确认导入',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      
      // 导入配置
      applySettings(importData.value)
      
      showImportDialog.value = false
      importData.value = null
      success('配置导入成功')
    } catch {
      // 用户取消
    }
  }

  return {
    showImportDialog,
    importData,
    exportSettings,
    importSettings,
    handleFileChange,
    confirmImport
  }
}
