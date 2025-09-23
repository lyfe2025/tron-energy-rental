/**
 * 管理员页面网络状态管理组合式函数
 * 从 useAdminPage.ts 中安全分离的网络处理逻辑
 */

import { ref } from 'vue'
import { useToast } from '../../../composables/useToast'
import { useAuthStore } from '../../../stores/auth'

export function useAdminNetwork() {
  const { success, error, warning } = useToast()
  const authStore = useAuthStore()

  // 网络状态
  const isOnline = ref(navigator.onLine)
  const retryCount = ref(0)
  const maxRetries = 3

  // 网络状态监听
  const setupNetworkListeners = () => {
    const handleOnline = () => {
      isOnline.value = true
      success('网络连接已恢复')
    }
    
    const handleOffline = () => {
      isOnline.value = false
      warning('网络连接已断开，请检查网络设置')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }

  // 错误处理函数
  const handleApiError = (error: any, operation: string) => {
    console.error(`${operation}失败:`, error)
    
    let errorMsg = `${operation}失败`
    
    if (!isOnline.value) {
      errorMsg = '网络连接异常，请检查网络设置'
    } else if (error?.response?.status === 401) {
      errorMsg = '登录已过期，请重新登录'
      authStore.logout()
    } else if (error?.response?.status === 403) {
      errorMsg = '权限不足，无法执行此操作'
    } else if (error?.response?.status >= 500) {
      errorMsg = '服务器异常，请稍后重试'
    } else if (error?.response?.data?.message) {
      errorMsg = error.response.data.message
    } else if (typeof error === 'string') {
      errorMsg = error
    } else if (error?.message && typeof error.message === 'string') {
      errorMsg = error.message
    } else if (error instanceof Error) {
      errorMsg = error.message
    } else {
      // 处理其他类型的错误对象
      errorMsg = `${operation}失败，请稍后重试`
    }
    
    error(errorMsg)
    return errorMsg
  }

  // 重试机制
  const retryOperation = async (operation: () => Promise<void>, operationName: string) => {
    try {
      await operation()
      retryCount.value = 0
    } catch (error) {
      if (retryCount.value < maxRetries && isOnline.value) {
        retryCount.value++
        warning(`${operationName}失败，正在重试 (${retryCount.value}/${maxRetries})`)
        setTimeout(() => retryOperation(operation, operationName), 1000 * retryCount.value)
      } else {
        handleApiError(error, operationName)
      }
    }
  }

  return {
    // 状态
    isOnline,
    retryCount,
    maxRetries,
    
    // 方法
    setupNetworkListeners,
    handleApiError,
    retryOperation
  }
}
