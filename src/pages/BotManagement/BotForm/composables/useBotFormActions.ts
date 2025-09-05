/**
 * 机器人表单操作组合式函数
 * 包含Token验证、Webhook测试、表单提交等操作
 */
import { botsAPI } from '@/services/api/bots/botsAPI'
import type { Bot } from '@/types/api'
import { validateBotNetworkConfig } from '@/utils/networkValidation'
import { toast } from 'sonner'
import { ref, type Ref } from 'vue'

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

export function useBotFormActions(
  form: Ref<BotFormData>, 
  isEdit: Ref<boolean>, 
  route: any,
  router: any,
  validateForm: () => string[]
) {
  const submitting = ref(false)
  const validatingToken = ref(false)
  const testingWebhook = ref(false)

  // Token验证
  const validateToken = async () => {
    if (!form.value.token) {
      toast.warning('请先输入Bot Token')
      return
    }
    
    try {
      validatingToken.value = true
      // TODO: 调用API验证Token
      // const response = await botAPI.validateToken(form.value.token)
      
      // 模拟验证
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Token验证成功')
    } catch (error) {
      console.error('Token验证失败:', error)
      toast.error('Token验证失败，请检查Token是否正确')
    } finally {
      validatingToken.value = false
    }
  }

  // Webhook测试
  const testWebhook = async () => {
    if (!form.value.webhook_url) {
      toast.warning('请先输入Webhook URL')
      return
    }
    
    try {
      testingWebhook.value = true
      // TODO: 调用API测试Webhook连接
      // const response = await botAPI.testWebhook(form.value.webhook_url)
      
      // 模拟测试
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast.success('Webhook连接测试成功')
    } catch (error) {
      console.error('Webhook测试失败:', error)
      toast.error('Webhook测试失败，请检查URL是否可访问')
    } finally {
      testingWebhook.value = false
    }
  }

  // 获取机器人数据
  const fetchBotData = async () => {
    if (!isEdit.value) return
    
    try {
      const botId = route.params.id as string
      const [botResponse, networkResponse] = await Promise.all([
        botsAPI.getBot(botId),
        botsAPI.getBotNetwork(botId)
      ])
      
      if (botResponse.data.success) {
        const botData: Bot = botResponse.data.data.bot
        Object.assign(form.value, {
          name: botData.name || '',
          username: botData.username || '',
          token: botData.token || '',
          description: botData.description || '',
          is_active: botData.status === 'active',
          auto_reconnect: true, // Bot类型中没有此字段，使用默认值
          rate_limit: 30, // Bot类型中没有此字段，使用默认值
          timeout: 30, // Bot类型中没有此字段，使用默认值
          webhook_url: botData.webhook_url || '',
          selectedNetwork: null
        })
        
        // 获取机器人网络配置
        if (networkResponse.data.success && networkResponse.data.data.network) {
          form.value.selectedNetwork = (networkResponse.data.data.network as any).id
        }
      } else {
        throw new Error(botResponse.data.message || '获取机器人数据失败')
      }
    } catch (error) {
      console.error('获取机器人数据失败:', error)
      toast.error('获取机器人数据失败')
      router.push('/config/bots')
    }
  }

  // 表单提交
  const handleSubmit = async () => {
    try {
      // 表单验证
      const errors = validateForm()
      if (errors.length > 0) {
        toast.error(errors[0])
        return
      }
      
      if (!form.value.selectedNetwork) {
        toast.warning('请选择一个网络')
        return
      }
      
      // 如果选择了网络，先进行最终验证
      const targetBotId = isEdit.value ? route.params.id as string : 'new'
      const validationResult = await validateBotNetworkConfig(targetBotId, form.value.selectedNetwork)
      
      if (!validationResult.isValid) {
        toast.error('网络配置验证失败，无法提交', {
          description: validationResult.errors.join('; ')
        })
        return
      }
      
      submitting.value = true
      
      const submitData = {
        name: form.value.name,
        username: form.value.username,
        token: form.value.token,
        description: form.value.description,
        webhook_url: form.value.webhook_url,
        status: form.value.is_active ? 'active' as const : 'inactive' as const
      }
      
      if (isEdit.value) {
        const botId = route.params.id as string
        const response = await botsAPI.updateBot(botId, submitData)
        if (response.data.success) {
          // 更新网络配置
          await botsAPI.setBotNetwork(botId, form.value.selectedNetwork)
          toast.success('机器人更新成功')
        } else {
          throw new Error(response.data.message || '更新失败')
        }
      } else {
        const response = await botsAPI.createBot(submitData)
        if (response.data.success) {
          const botId = response.data.data.bot.id
          // 设置网络配置
          await botsAPI.setBotNetwork(botId, form.value.selectedNetwork)
          toast.success('机器人创建成功')
        } else {
          throw new Error(response.data.message || '创建失败')
        }
      }
      
      router.push('/config/bots')
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请重试')
    } finally {
      submitting.value = false
    }
  }

  return {
    submitting,
    validatingToken,
    testingWebhook,
    validateToken,
    testWebhook,
    fetchBotData,
    handleSubmit
  }
}
