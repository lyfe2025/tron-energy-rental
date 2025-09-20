import { stakeAPI } from '@/services/api'
import { ref } from 'vue'
import type { FreezeParams, UnfreezeParams } from '../types/stake.types'

export function useStakeOperations() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 质押TRX
  const freezeTrx = async (data: FreezeParams) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.freezeTrx(data)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '质押TRX失败')
      }
    } catch (err: any) {
      error.value = err.message || '质押TRX失败'
      console.error('质押TRX失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 解质押TRX
  const unfreezeTrx = async (data: UnfreezeParams) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.unfreezeTrx(data)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '解质押TRX失败')
      }
    } catch (err: any) {
      error.value = err.message || '解质押TRX失败'
      console.error('解质押TRX失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 提取已解质押资金
  const withdrawUnfrozen = async (ownerAddress: string, networkId?: string, accountId?: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await stakeAPI.withdrawUnfrozen({ ownerAddress, networkId, accountId })
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '提取TRX失败')
      }
    } catch (err: any) {
      error.value = err.message || '提取TRX失败'
      console.error('提取TRX失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    freezeTrx,
    unfreezeTrx,
    withdrawUnfrozen
  }
}
