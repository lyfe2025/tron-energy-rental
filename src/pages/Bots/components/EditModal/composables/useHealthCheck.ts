/**
 * 健康检查相关逻辑
 * 职责：处理机器人健康检查功能
 */
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import type { BotData } from '../../../composables/useBotFormShared'

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  error_message?: string
  last_check: string
  response_time_ms?: number
  details?: {
    work_mode: string
    check_type: string
    environment?: string
    webhook_url?: string
  }
}

export function useHealthCheck() {
  // 响应式状态
  const healthChecking = ref(false)
  const healthCheckResult = ref<HealthCheckResult | null>(null)
  const showHealthDetails = ref(false)

  // 执行健康检查
  const performHealthCheck = async (botData: BotData | null | undefined, emit: any) => {
    if (!botData?.id || healthChecking.value) {
      return
    }
    
    try {
      healthChecking.value = true
      showHealthDetails.value = false
      healthCheckResult.value = null
      console.log('开始健康检查:', botData.id)
      
      const response = await botsAPI.performHealthCheck(botData.id)
      const result = response.data
      
      // 保存健康检查结果
      if (result?.success && result?.data) {
        healthCheckResult.value = result.data as HealthCheckResult
        showHealthDetails.value = true
        console.log('健康检查结果:', result.data)
        
        if ((result.data as any).status === 'healthy') {
          ElMessage.success('健康检查通过')
        } else {
          ElMessage.warning(`健康检查发现问题`)
        }
        
        // 触发父组件刷新数据以获取最新的健康状态
        emit('refresh')
      } else {
        ElMessage.error(`健康检查失败：${result?.message || '未知错误'}`)
        
        // 即使失败也显示错误信息
        healthCheckResult.value = {
          status: 'unhealthy',
          error_message: result?.message || '健康检查请求失败',
          last_check: new Date().toISOString(),
          details: {
            work_mode: botData?.work_mode || 'unknown',
            check_type: 'api_request_failed'
          }
        }
        showHealthDetails.value = true
      }
      
    } catch (error: any) {
      console.error('健康检查失败:', error)
      
      // 根据错误类型显示不同的提示信息
      let errorMessage = '未知错误'
      
      if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
        errorMessage = '健康检查超时，这可能是网络问题或服务器响应较慢。请稍后重试。'
      } else if (error.friendlyMessage) {
        errorMessage = error.friendlyMessage
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      ElMessage.error(`健康检查失败：${errorMessage}`)
      
      // 保存错误信息用于显示
      healthCheckResult.value = {
        status: 'unhealthy',
        error_message: errorMessage,
        last_check: new Date().toISOString(),
        details: {
          work_mode: botData?.work_mode || 'unknown',
          check_type: 'network_error'
        }
      }
      showHealthDetails.value = true
      
    } finally {
      healthChecking.value = false
    }
  }

  return {
    healthChecking,
    healthCheckResult,
    showHealthDetails,
    performHealthCheck
  }
}
