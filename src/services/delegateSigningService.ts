/**
 * 代理资源签名服务
 * 处理代理资源的真实区块链签名操作
 */

import type { DelegateTransactionData } from '@/pages/EnergyPool/components/StakeOperations/DelegateTransactionConfirmModal/index.vue'
import { useNetworkStore } from '@/stores/network'
import { stakeAPI, type DelegateOperationData } from './api/stake/stakeAPI'

export interface DelegateSigningResult {
  success: boolean
  txid?: string
  message?: string
  error?: string
}

class DelegateSigningService {
  /**
   * 执行代理资源签名操作
   */
  async signDelegateTransaction(
    transactionData: DelegateTransactionData,
    networkId: string
  ): Promise<DelegateSigningResult> {
    try {
      const poolAccountId = transactionData.accountId || transactionData.poolId

      // 构建API调用数据
      const apiData: DelegateOperationData = {
        amount: parseFloat(transactionData.amount),
        resourceType: transactionData.resourceType,
        toAddress: transactionData.receiverAddress,
        accountAddress: transactionData.accountAddress,
        lockPeriod: transactionData.enableLockPeriod ? transactionData.lockPeriod : undefined,
        networkId: networkId,
        poolAccountId: poolAccountId
      }

      // 调用后端API进行代理操作
      const response = await stakeAPI.delegateResource(apiData)

      if (response.data.success) {
        const result: DelegateSigningResult = {
          success: true,
          txid: response.data.data?.txid,
          message: response.data.message || '代理资源成功'
        }

        return result
      } else {
        const errorResult: DelegateSigningResult = {
          success: false,
          error: response.data.message || '代理操作失败'
        }

        console.error('❌ [DelegateSigningService] 代理失败:', errorResult)
        return errorResult
      }

    } catch (error: any) {
      console.error('❌ [DelegateSigningService] 代理异常:', error)

      // 解析错误信息
      let errorMessage = '代理操作失败，请重试'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      // 🔧 增强错误处理 - 优先使用后端友好化的错误消息
      console.log('🔍 [DelegateSigningService] 原始错误消息:', errorMessage)
      
      // 如果错误消息还是十六进制格式，尝试本地解码
      if (typeof errorMessage === 'string' && /^[0-9a-fA-F]+$/.test(errorMessage) && errorMessage.length > 10) {
        try {
          // 在前端环境中手动解码十六进制字符串
          const decodedMessage = errorMessage.match(/.{1,2}/g)
            ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
            .join('') || errorMessage
          console.log('🔍 [DelegateSigningService] 解码后的错误消息:', decodedMessage)
          
          if (decodedMessage.includes('delegateBalance must be less than or equal to available FreezeEnergyV2 balance')) {
            errorMessage = '❌ 账户可用的质押ENERGY余额不足，请先质押更多TRX获得ENERGY，或减少代理数量'
          } else if (decodedMessage.includes('delegateBalance must be greater than or equal to 1 TRX')) {
            errorMessage = '❌ 代理数量必须至少为1 TRX'
          } else if (decodedMessage.includes('delegateBalance must be less than or equal to available FreezeBandwidthV2 balance')) {
            errorMessage = '❌ 账户可用的质押BANDWIDTH余额不足，请先质押更多TRX获得BANDWIDTH，或减少代理数量'
          } else {
            errorMessage = `❌ TRON网络错误: ${decodedMessage}`
          }
        } catch (e) {
          console.log('⚠️ [DelegateSigningService] 本地解码失败，使用原始错误')
        }
      }
      
      // 兜底错误处理
      if (errorMessage.includes('insufficient')) {
        errorMessage = '❌ 余额不足，请检查账户资源'
      } else if (errorMessage.includes('network')) {
        errorMessage = '❌ 网络连接失败，请检查网络状态'
      } else if (errorMessage.includes('address')) {
        errorMessage = '❌ 地址格式错误，请检查接收方地址'
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 验证代理交易数据
   */
  validateTransactionData(transactionData: DelegateTransactionData): string[] {
    const errors: string[] = []

    if (!transactionData.amount || parseFloat(transactionData.amount) <= 0) {
      errors.push('代理数量必须大于0')
    }

    if (!transactionData.receiverAddress) {
      errors.push('接收方地址不能为空')
    }

    if (!transactionData.accountAddress) {
      errors.push('代理方地址不能为空')
    }

    if (transactionData.enableLockPeriod && (!transactionData.lockPeriod || transactionData.lockPeriod <= 0)) {
      errors.push('启用锁定期时必须设置有效的锁定期限')
    }

    if (!transactionData.resourceType || !['ENERGY', 'BANDWIDTH'].includes(transactionData.resourceType)) {
      errors.push('资源类型必须是能量或带宽')
    }

    return errors
  }

  /**
   * 获取TRON区块链浏览器URL
   * 从网络表中获取对应的区块链浏览器URL
   */
  getExplorerUrl(networkId: string): string {
    try {
      const networkStore = useNetworkStore()
      const network = networkStore.getNetworkById(networkId)
      
      if (network?.explorer_url) {
        return network.explorer_url
      }
      
      // 如果网络表中没有找到，使用默认URL
      return 'https://tronscan.org'
      
    } catch (error) {
      return 'https://tronscan.org'
    }
  }
}

export const delegateSigningService = new DelegateSigningService()
