/**
 * Telegram预览逻辑
 * 从原组件中提取预览相关功能，包括地址复制等交互逻辑
 */

import { ref } from 'vue'
import type { EnergyFlashConfig } from '../types/energy-flash.types'

export function usePreviewLogic(config: EnergyFlashConfig | null) {
  // 复制状态
  const copyStatus = ref('')

  /**
   * 复制地址到剪贴板
   */
  const copyAddress = async () => {
    const address = config?.config?.payment_address
    if (!address) {
      copyStatus.value = '⚠️ 没有地址可复制'
      setTimeout(() => {
        copyStatus.value = ''
      }, 2000)
      return
    }
    
    try {
      await navigator.clipboard.writeText(address)
      copyStatus.value = '✅ 已复制！'
      console.log('地址已复制到剪贴板:', address)
    } catch (err) {
      console.error('复制失败:', err)
      // 降级方案：使用传统的复制方法
      try {
        const textArea = document.createElement('textarea')
        textArea.value = address
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        copyStatus.value = '✅ 已复制！'
        console.log('地址已复制到剪贴板（降级方案）:', address)
      } catch (fallbackErr) {
        console.error('降级复制方案也失败:', fallbackErr)
        copyStatus.value = '❌ 复制失败'
      }
    }
    
    // 2秒后清除状态提示
    setTimeout(() => {
      copyStatus.value = ''
    }, 2000)
  }

  /**
   * 图片错误处理
   */
  const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement
    console.error('图片加载失败:', img.src)
  }

  return {
    copyStatus,
    copyAddress,
    handleImageError
  }
}
