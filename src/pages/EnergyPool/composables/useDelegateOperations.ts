import { stakeAPI } from '@/services/api'
import { ref } from 'vue'
import type { DelegateParams, UndelegateParams } from '../types/stake.types'

export function useDelegateOperations() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 代理资源
  const delegateResource = async (data: DelegateParams) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.delegateResource(data)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '代理资源失败')
      }
    } catch (err: any) {
      error.value = err.message || '代理资源失败'
      console.error('代理资源失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 取消代理资源
  const undelegateResource = async (data: UndelegateParams) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.undelegateResource(data)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '取消代理资源失败')
      }
    } catch (err: any) {
      error.value = err.message || '取消代理资源失败'
      console.error('取消代理资源失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    delegateResource,
    undelegateResource
  }
}
