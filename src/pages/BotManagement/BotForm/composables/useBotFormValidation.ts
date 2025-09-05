/**
 * 机器人表单验证组合式函数
 * 包含表单验证逻辑和网络验证功能
 */
import { validateBotNetworkConfig } from '@/utils/networkValidation'
import { toast } from 'sonner'
import { ref, watch, type Ref } from 'vue'

// 接口定义
interface BotFormData {
  name: string
  username: string
  token: string
  description: string
  is_active: boolean
  auto_reconnect: boolean
  rate_limit: number
  timeout: number
  webhook_url: string
  selectedNetwork: string | null
}

export function useBotFormValidation(form: Ref<BotFormData>, isEdit: Ref<boolean>, route: any) {
  const isValidatingNetwork = ref(false)
  const networkValidationResult = ref(null)

  // 表单验证函数
  const validateForm = () => {
    const errors: string[] = []
    
    if (!form.value.name.trim()) {
      errors.push('请输入机器人名称')
    } else if (form.value.name.length < 2 || form.value.name.length > 50) {
      errors.push('名称长度在 2 到 50 个字符')
    }
    
    if (!form.value.username.trim()) {
      errors.push('请输入用户名')
    } else if (form.value.username.length < 5 || form.value.username.length > 32) {
      errors.push('用户名长度在 5 到 32 个字符')
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.value.username)) {
      errors.push('用户名只能包含字母、数字和下划线')
    }
    
    if (!form.value.token.trim()) {
      errors.push('请输入Bot Token')
    } else if (!/^bot\d+:[A-Za-z0-9_-]+$/.test(form.value.token)) {
      errors.push('Token格式不正确')
    }
    
    if (form.value.rate_limit < 1 || form.value.rate_limit > 100) {
      errors.push('消息限制范围 1-100')
    }
    
    if (form.value.timeout < 5 || form.value.timeout > 300) {
      errors.push('超时时间范围 5-300 秒')
    }
    
    if (form.value.webhook_url && !/^https:\/\/[\w.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(form.value.webhook_url)) {
      errors.push('Webhook URL格式不正确，必须使用HTTPS协议')
    }
    
    return errors
  }

  // 验证网络选择
  const validateNetworkSelection = async (networkId: string) => {
    const targetBotId = isEdit.value ? route.params.id as string : 'new'
    
    isValidatingNetwork.value = true
    networkValidationResult.value = null
    
    try {
      const result = await validateBotNetworkConfig(targetBotId, networkId)
      networkValidationResult.value = result
      
      if (!result.isValid) {
        toast.error('网络配置验证失败', {
          description: result.errors.join('; ')
        })
      } else if (result.warnings.length > 0) {
        toast.warning('网络配置警告', {
          description: result.warnings.join('; ')
        })
      }
    } catch (error: any) {
      console.error('Network validation error:', error)
      toast.error('网络验证失败', {
        description: error.message
      })
    } finally {
      isValidatingNetwork.value = false
    }
  }

  // 监听网络选择变化并进行验证
  watch(() => form.value.selectedNetwork, async (newNetworkId) => {
    if (newNetworkId && (isEdit.value ? route.params.id : 'new')) {
      await validateNetworkSelection(newNetworkId)
    }
  })

  return {
    validateForm,
    validateNetworkSelection,
    isValidatingNetwork,
    networkValidationResult
  }
}
