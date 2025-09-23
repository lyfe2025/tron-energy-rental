/**
 * Webhook配置管理composable
 * 负责URL处理、密钥生成等配置相关逻辑
 */

import { useToast } from '@/composables/useToast'
import { computed, ref } from 'vue'
import type { BotData, WebhookConfig, WebhookUIState } from '../types/webhook.types'

export function useWebhookConfig(
  props: {
    modelValue: WebhookConfig
    mode?: 'create' | 'edit'
    botData?: BotData | null
    botUsername?: string
  },
  emit: (event: 'update:modelValue', value: WebhookConfig) => void
) {
  const { success } = useToast()
  
  // UI状态管理
  const uiState = ref<WebhookUIState>({
    checking: false,
    applying: false,
    showWebhookDetails: false,
    showConnectionsHelp: false,
    showUrlExplanation: false,
    secretVisible: true,
    secretGenerated: false
  })

  // 计算输入框显示的URL
  const displayWebhookUrl = computed({
    get() {
      if (!props.modelValue.webhook_url) return ''
      // 总是显示原始输入值，不自动提取基础URL
      return props.modelValue.webhook_url
    },
    set(value: string) {
      // 直接更新值，不进行自动修改
      updateField('webhook_url', value)
    }
  })

  // 计算最终的Webhook URL预览
  const finalWebhookUrl = computed(() => {
    const inputUrl = displayWebhookUrl.value
    if (!inputUrl) return ''
    
    // 智能提取基础URL：如果已经包含机器人用户名，则提取基础部分
    const baseUrl = getBaseUrlFromInput(inputUrl)
    
    if (props.mode === 'edit' && props.botData?.username) {
      // 编辑模式：使用实际的机器人用户名
      return `${baseUrl}/${props.botData.username}`
    } else if (props.mode === 'create' && props.botUsername) {
      // 创建模式：使用传入的用户名
      return `${baseUrl}/${props.botUsername}`
    } else {
      // 默认显示示例
      return `${baseUrl}/[机器人用户名]`
    }
  })

  // 智能提取基础URL，不破坏用户输入
  const getBaseUrlFromInput = (inputUrl: string) => {
    if (!inputUrl) return ''
    
    // 移除末尾的斜杠
    const cleanUrl = inputUrl.replace(/\/+$/, '')
    
    // 检查是否已经包含了机器人用户名
    if (props.mode === 'edit' && props.botData?.username) {
      // 如果URL以当前机器人用户名结尾，则移除它
      if (cleanUrl.endsWith(`/${props.botData.username}`)) {
        return cleanUrl.replace(`/${props.botData.username}`, '')
      }
    }
    
    // 检查是否包含了旧的机器人ID格式（UUID）
    if (props.botData?.id && cleanUrl.endsWith(`/${props.botData.id}`)) {
      return cleanUrl.replace(`/${props.botData.id}`, '')
    }
    
    // 如果没有检测到机器人标识符，直接返回清理后的URL
    return cleanUrl
  }

  // 从完整URL中提取基础URL（仅用于已保存的webhook URL）
  const extractBaseUrl = (fullUrl: string) => {
    if (!fullUrl) return ''
    
    // 移除末尾的斜杠
    const cleanUrl = fullUrl.replace(/\/+$/, '')
    
    // 优先检查具体的机器人用户名
    if (props.botData?.username && cleanUrl.endsWith(`/${props.botData.username}`)) {
      return cleanUrl.replace(`/${props.botData.username}`, '')
    }
    
    // 兼容旧的ID格式（UUID）
    if (props.botData?.id && cleanUrl.endsWith(`/${props.botData.id}`)) {
      return cleanUrl.replace(`/${props.botData.id}`, '')
    }
    
    // 只移除UUID格式的后缀（36位的UUID），不移除其他路径
    return cleanUrl.replace(/\/[a-f0-9\-]{36}$/, '')
  }

  // 更新字段值
  const updateField = <K extends keyof WebhookConfig>(field: K, value: WebhookConfig[K]) => {
    emit('update:modelValue', {
      ...props.modelValue,
      [field]: value
    })
  }

  // 生成随机Webhook密钥
  const generateWebhookSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    updateField('webhook_secret', result)
    uiState.value.secretGenerated = true
    uiState.value.secretVisible = true
    
    // 3秒后隐藏生成提示
    setTimeout(() => {
      uiState.value.secretGenerated = false
    }, 3000)
    
    success('已生成32位随机密钥')
  }

  // 切换密钥显示/隐藏
  const toggleSecretVisibility = () => {
    uiState.value.secretVisible = !uiState.value.secretVisible
  }

  return {
    uiState,
    displayWebhookUrl,
    finalWebhookUrl,
    getBaseUrlFromInput,
    extractBaseUrl,
    updateField,
    generateWebhookSecret,
    toggleSecretVisibility
  }
}
