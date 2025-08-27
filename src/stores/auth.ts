import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/services/api'
import type { ApiResponse } from '@/services/api'
import type { User } from '@/types/api'

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
  const login = async (credentials: { username: string; password: string }) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await authAPI.login(credentials)
      
      if (response.data.success && response.data.data) {
        const { token: newToken, user: userData } = response.data.data
        
        // 保存认证信息
        token.value = newToken
        user.value = userData
        
        // 保存到本地存储
        localStorage.setItem('admin_token', newToken)
        localStorage.setItem('admin_user', JSON.stringify(userData))
        
        return { success: true }
      } else {
        const errorMsg = response.data.message || '登录失败'
        error.value = errorMsg
        return { success: false, error: errorMsg }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '登录失败，请检查网络连接'
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
    error.value = null
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
    restoreUserFromStorage,
  }
})