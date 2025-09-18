/**
 * Webhook测试逻辑composable
 * 负责状态检查、设置应用等测试功能
 */

import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import type { BotData, WebhookStatus } from '../types/webhook.types'

export function useWebhookTesting(props: { botData?: BotData | null }) {
  const webhookStatus = ref<WebhookStatus | null>(null)
  const checking = ref(false)
  const applying = ref(false)

  // 检查Webhook状态
  const checkWebhookStatus = async () => {
    if (!props.botData?.id) return
    
    try {
      checking.value = true
      webhookStatus.value = null
      
      const response = await fetch(`/api/bots/${props.botData.id}/webhook-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        webhookStatus.value = result.data.webhook_info
      } else {
        console.error('获取webhook状态失败')
      }
    } catch (error) {
      console.error('检查webhook状态失败:', error)
    } finally {
      checking.value = false
    }
  }

  // 应用webhook设置
  const applyWebhookSettings = async (webhookUrl: string) => {
    if (!props.botData?.id || !webhookUrl) return
    
    try {
      applying.value = true
      
      const response = await fetch(`/api/bots/${props.botData.id}/apply-webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        ElMessage.success('Webhook设置成功')
        // 自动刷新webhook状态
        await checkWebhookStatus()
      } else {
        ElMessage.error(result.message || 'Webhook设置失败')
      }
    } catch (error) {
      console.error('应用webhook设置失败:', error)
      ElMessage.error('应用webhook设置失败')
    } finally {
      applying.value = false
    }
  }

  // 获取状态描述文本
  const getStatusDescription = (status: WebhookStatus | null): string => {
    if (!status) return '未检查'
    if (status.last_error_message) return `错误: ${status.last_error_message}`
    return '正常'
  }

  // 获取状态颜色类
  const getStatusColorClass = (status: WebhookStatus | null): string => {
    if (!status) return 'text-gray-600'
    if (status.last_error_message) return 'text-red-600'
    return 'text-green-600'
  }

  return {
    webhookStatus,
    checking,
    applying,
    checkWebhookStatus,
    applyWebhookSettings,
    getStatusDescription,
    getStatusColorClass
  }
}
