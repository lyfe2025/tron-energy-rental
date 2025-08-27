import { authAPI } from '@/services/api'
import type { User } from '@/types/api'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// 认证状态store
export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // 初始化用户信息
  const initializeAuth = async () => {
    if (!token.value) return

    try {
      isLoading.value = true
      const response = await authAPI.verifyToken()
      
      if (response.data.success && response.data.data?.user) {
        user.value = response.data.data.user
        // 更新本地存储的用户信息
        localStorage.setItem('admin_user', JSON.stringify(user.value))
      } else {
        // Token无效，清除认证信息
        await logout()
      }
    } catch (err: any) {
      console.error('Token验证失败:', err)
      await logout()
    } finally {
      isLoading.value = false
    }
  }

  // 登录
  const login = async (credentials: { email: string; password: string }) => {
    try {
      isLoading.value = true
      console.log('🔍 [Auth Store] 开始登录，当前error状态:', error.value)
      // 不清除之前的错误，让用户能看到具体的错误信息
      // error.value = null

      const response = await authAPI.login(credentials)
      
      if (response.data.success && response.data.data) {
        const { token: newToken, user: userData } = response.data.data
        
        // 登录成功，清除错误信息
        console.log('🔍 [Auth Store] 登录成功，清除error状态')
        error.value = null
        
        // 保存认证信息
        token.value = newToken
        user.value = userData
        
        // 保存到本地存储
        localStorage.setItem('admin_token', newToken)
        localStorage.setItem('admin_user', JSON.stringify(userData))
        
        return { success: true, message: '登录成功' }
      } else {
        const errorMsg = response.data.message || '登录失败，请检查您的凭据'
        console.log('🔍 [Auth Store] 登录失败，设置error状态:', errorMsg)
        error.value = errorMsg
        return { success: false, error: errorMsg }
      }
    } catch (err: any) {
      let errorMsg = '登录失败，请检查网络连接'
      
      if (err.response?.data?.message) {
        // 后端返回的具体错误信息
        errorMsg = err.response.data.message
      } else if (err.response?.status === 401) {
        errorMsg = '邮箱或密码错误，请检查您的登录信息'
      } else if (err.response?.status === 403) {
        errorMsg = '账户已被禁用，请联系管理员'
      } else if (err.response?.status === 429) {
        errorMsg = '登录尝试过于频繁，请稍后再试'
      } else if (err.response?.status >= 500) {
        errorMsg = '服务器错误，请稍后重试'
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMsg = '网络连接失败，请检查网络设置'
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMsg = '请求超时，请检查网络连接'
      }
      
      console.log('🔍 [Auth Store] 登录异常，设置error状态:', errorMsg)
      error.value = errorMsg
      console.error('登录错误:', err)
      return { success: false, error: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = async () => {
    // 清除状态
    token.value = null
    user.value = null
    error.value = null
    
    // 清除本地存储
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  // 刷新token
  const refreshToken = async () => {
    try {
      const response = await authAPI.refreshToken()
      
      if (response.data.success && response.data.data?.token) {
        const newToken = response.data.data.token
        token.value = newToken
        localStorage.setItem('admin_token', newToken)
        return true
      }
      return false
    } catch (err) {
      console.error('刷新token失败:', err)
      await logout()
      return false
    }
  }

  // 清除错误
  const clearError = () => {
    console.log('🔍 [Auth Store] clearError被调用，当前error状态:', error.value)
    error.value = null
  }

  // 设置错误（用于外部设置错误信息）
  const setError = (errorMessage: string) => {
    error.value = errorMessage
  }

  // 从本地存储恢复用户信息
  const restoreUserFromStorage = () => {
    try {
      const storedUser = localStorage.getItem('admin_user')
      if (storedUser) {
        user.value = JSON.parse(storedUser)
      }
    } catch (err) {
      console.error('恢复用户信息失败:', err)
      localStorage.removeItem('admin_user')
    }
  }

  // 初始化时恢复用户信息
  if (token.value) {
    restoreUserFromStorage()
  }

  return {
    // 状态
    token,
    user,
    isLoading,
    error,
    
    // 计算属性
    isAuthenticated,
    isAdmin,
    
    // 方法
    initializeAuth,
    login,
    logout,
    refreshToken,
    clearError,
    setError,
    restoreUserFromStorage,
  }
})