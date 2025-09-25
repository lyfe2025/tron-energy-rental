/**
 * 剪贴板操作 Composable
 * 从TelegramPreview.vue中分离出的剪贴板功能
 */
import { ref } from 'vue'

export function useClipboard() {
  const copyStatus = ref('')

  /**
   * 复制文本到剪贴板
   */
  const copyText = async (text: string, type: string = '内容') => {
    try {
      await navigator.clipboard.writeText(text)
      copyStatus.value = `✅ ${type}已复制！`
      console.log(`${type}已复制到剪贴板:`, text)
    } catch (err) {
      console.error('复制失败:', err)
      // 降级方案
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        copyStatus.value = `✅ ${type}已复制！`
        console.log(`${type}已复制到剪贴板（降级方案）:`, text)
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
   * 复制支付地址
   */
  const copyPaymentAddress = async (address: string) => {
    await copyText(address, '地址')
  }

  /**
   * 复制金额
   */
  const copyAmount = async (amount: string) => {
    await copyText(amount, '金额')
  }

  return {
    copyStatus,
    copyText,
    copyPaymentAddress,
    copyAmount
  }
}
