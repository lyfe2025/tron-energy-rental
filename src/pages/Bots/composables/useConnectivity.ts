/**
 * 连接状态管理组合式函数
 */
import { useToast } from '@/composables/useToast'
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ref } from 'vue'
import type { ConnectivityState } from '../types/connectivity.types'

export function useConnectivity() {
  const { success, error, info } = useToast()
  
  // 状态
  const connectivityState = ref<ConnectivityState>({
    checking: false,
    status: null,
    latency: null,
    error: null,
    suggestions: [],
    lastChecked: null
  })

  // 防抖控制：防止用户快速重复点击
  let lastManualCheck = 0

  // Telegram API连接检测
  const checkTelegramConnection = async (silent = false) => {
    if (connectivityState.value.checking) return

    // 防抖：手动检测间隔至少3秒
    if (!silent) {
      const now = Date.now()
      if (now - lastManualCheck < 3000) {
        info('检测过于频繁，请稍后再试')
        return
      }
      lastManualCheck = now
    }

    console.log('🔍 开始检测Telegram API连接...')
    connectivityState.value.checking = true
    connectivityState.value.status = null

    try {
      const response = await botsAPI.checkTelegramApiConnectivity()
      
      if (response.data?.success && response.data.data?.accessible) {
        const data = response.data.data
        
        // 根据延迟设置状态
        const status = data.status === 'excellent' ? 'connected' :
                     data.status === 'good' ? 'connected' :
                     'slow'
        
        connectivityState.value = {
          checking: false,
          status,
          latency: data.latency || null,
          error: null,
          suggestions: data.suggestions || [],
          lastChecked: new Date()
        }

        console.log(`✅ Telegram API连接正常，延迟: ${data.latency}ms`)
        
        // 只在非静默模式下显示成功消息
        if (!silent) {
          const statusText = status === 'connected' && data.status === 'excellent' ? '优秀' :
                            status === 'connected' && data.status === 'good' ? '良好' :
                            '较慢'
          success(`Telegram API连接正常，网络状态: ${statusText} (${data.latency}ms)`)
          
          // 如果有建议，显示警告信息
          if (data.suggestions && data.suggestions.length > 0) {
            // 显示网络建议警告
            const { warning } = useToast()
            warning(`网络建议: ${data.suggestions[0]}`, { duration: 5000 })
          }
        }
        
      } else {
        // 连接失败
        const errorData = response.data?.data
        connectivityState.value = {
          checking: false,
          status: 'disconnected',
          latency: null,
          error: errorData?.error || '连接失败',
          suggestions: errorData?.suggestions || [],
          lastChecked: new Date()
        }

        console.error('❌ Telegram API连接失败:', errorData?.error)
        
        // 只在非静默模式下显示错误消息
        if (!silent) {
          const suggestions = errorData?.suggestions || []
          const primaryMessage = '🚨 Telegram API连接失败！'
          const suggestionText = suggestions.length > 0 ? 
            `\n建议：${suggestions.slice(0, 2).join('; ')}` : 
            '\n建议：检查网络设置或更换IP地址'

          error(primaryMessage + suggestionText, { duration: 8000 })

          // 如果有多个建议，分别显示
          if (suggestions.length > 2) {
            setTimeout(() => {
              const { warning } = useToast()
              warning(`其他建议：${suggestions.slice(2).join('; ')}`, { duration: 6000 })
            }, 1000)
          }
        }
      }
    } catch (error: any) {
      console.error('❌ 检测Telegram API连接失败:', error)
      
      connectivityState.value = {
        checking: false,
        status: 'disconnected',
        latency: null,
        error: error.message || '检测失败',
        suggestions: ['请检查网络连接', '尝试更换IP地址'],
        lastChecked: new Date()
      }

      // 只在非静默模式下显示错误消息
      if (!silent) {
        error(`网络检测失败: ${error.message || '未知错误'}`, { duration: 5000 })
      }
    }
  }

  // 启动连接监控
  const startConnectivityMonitoring = () => {
    // 页面加载后自动检测一次Telegram API连接（静默模式）
    setTimeout(() => {
      checkTelegramConnection(true) // 静默模式，不显示消息提示
    }, 2000)
    
    // 每10分钟自动检测一次（静默模式，避免过于频繁的消息提示）
    const connectivityCheckInterval = setInterval(() => {
      // 只有在用户不在执行其他操作时才自动检测
      if (!connectivityState.value.checking) {
        console.log('🔄 执行定期Telegram API连接检测...')
        checkTelegramConnection(true) // 静默模式
      }
    }, 10 * 60 * 1000) // 10分钟
    
    // 监听API错误事件，自动建议检查连接
    const handleConnectivitySuggestion = (event: any) => {
      const { reason, message } = event.detail
      console.log('📡 收到连接检测建议:', { reason, message })
      
      // 如果当前连接状态未知或已断开，显示建议检测的消息
      if (!connectivityState.value.checking && 
          (connectivityState.value.status === null || connectivityState.value.status === 'disconnected')) {
        
        info(`${message}。点击“检测连接”按钮进行检查`, { duration: 6000 })
        
        // 可选：自动进行一次检测（静默模式）
        setTimeout(() => {
          if (!connectivityState.value.checking) {
            console.log('🔄 自动执行连接检测...')
            checkTelegramConnection(true) // 静默模式，避免重复消息
          }
        }, 3000)
      }
    }
    
    // 添加事件监听
    window.addEventListener('api:suggest_connectivity_check', handleConnectivitySuggestion)
    
    // 返回清理函数
    return () => {
      clearInterval(connectivityCheckInterval)
      window.removeEventListener('api:suggest_connectivity_check', handleConnectivitySuggestion)
    }
  }

  return {
    connectivityState,
    checkTelegramConnection,
    startConnectivityMonitoring
  }
}
