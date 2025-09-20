/**
 * 解锁验证逻辑
 */

import { stakeAPI } from '@/services/api';
import type { UnstakeAccountBalance, UnstakeFormData, UnstakeOperationProps } from '../types';

export function useUnstakeValidation(props: UnstakeOperationProps) {
  
  // 验证解锁表单
  const validateUnstakeForm = async (
    form: UnstakeFormData, 
    accountBalance: UnstakeAccountBalance | null
  ): Promise<{ valid: boolean; error?: string }> => {
    // 基础验证
    if (!form.amount || !form.amount.trim()) {
      return { valid: false, error: '请输入解锁数量' }
    }

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: '请输入有效的解锁数量' }
    }

    // 账户余额验证
    if (!accountBalance || accountBalance.staked <= 0) {
      return { valid: false, error: '没有可解质押的资源' }
    }

    // 获取实时的资源数据进行验证
    try {
      const response = await stakeAPI.getAccountResources(props.accountAddress || '', props.poolId)
      if (response.data.success && response.data.data) {
        const resources = response.data.data
        const energyDirectStaked = (resources.energy?.directStaked || 0) / 1000000
        const bandwidthDirectStaked = (resources.bandwidth?.directStaked || 0) / 1000000
        
        let maxUnstakeAmount = 0
        if (form.resourceType === 'ENERGY') {
          maxUnstakeAmount = energyDirectStaked
        } else {
          maxUnstakeAmount = bandwidthDirectStaked
        }
        
        if (amount > maxUnstakeAmount) {
          const formatAmount = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
          return { 
            valid: false, 
            error: `解质押金额不能超过该资源的已质押金额（${formatAmount(maxUnstakeAmount)} TRX）` 
          }
        }
        
        return { valid: true }
      } else {
        return { valid: false, error: '无法获取账户资源信息，请稍后重试' }
      }
    } catch (error: any) {
      console.error('❌ [useUnstakeValidation] 验证失败:', error)
      return { valid: false, error: '验证失败，请重试' }
    }
  }

  // 验证最小解锁金额
  const validateMinimumAmount = (amount: number): { valid: boolean; error?: string } => {
    const MIN_UNSTAKE_AMOUNT = 1 // 最小解锁金额为1 TRX
    
    if (amount < MIN_UNSTAKE_AMOUNT) {
      return { 
        valid: false, 
        error: `解锁金额不能少于 ${MIN_UNSTAKE_AMOUNT} TRX` 
      }
    }
    
    return { valid: true }
  }

  // 验证账户状态
  const validateAccountStatus = (accountBalance: UnstakeAccountBalance | null): { valid: boolean; error?: string } => {
    if (!accountBalance) {
      return { valid: false, error: '无法获取账户信息' }
    }

    if (accountBalance.staked <= 0) {
      return { valid: false, error: '该账户没有可解质押的资源' }
    }

    return { valid: true }
  }

  // 验证网络参数
  const validateNetworkParams = (networkParams: any): { valid: boolean; error?: string } => {
    if (!networkParams) {
      return { valid: false, error: '网络参数未加载，请稍后重试' }
    }

    return { valid: true }
  }

  return {
    validateUnstakeForm,
    validateMinimumAmount,
    validateAccountStatus,
    validateNetworkParams
  }
}
