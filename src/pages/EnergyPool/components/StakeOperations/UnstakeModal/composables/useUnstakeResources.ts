/**
 * 解锁资源处理逻辑
 */

import { stakeAPI } from '@/services/api'
import { ref, watch } from 'vue'
import type { UnstakeAccountBalance, UnstakeOperationProps } from '../types'

export function useUnstakeResources(props: UnstakeOperationProps) {
  // 账户余额状态
  const accountBalance = ref<UnstakeAccountBalance | null>(null)
  
  // 待提取的解锁资源
  const withdrawableAmount = ref(0)

  // 加载账户资源和余额信息
  const loadAccountBalance = async () => {
    if (!props.accountAddress || !props.poolId) return

    try {
      console.log('🔍 [useUnstakeResources] 加载账户余额:', { 
        accountAddress: props.accountAddress, 
        networkId: props.poolId 
      })

      // 同时获取账户资源和质押状态
      const [resourceResponse, statusResponse] = await Promise.all([
        stakeAPI.getAccountResources(props.accountAddress, props.poolId),
        stakeAPI.getAccountStakeStatus(props.accountAddress, props.poolId)
      ])
      
      if (resourceResponse.data.success && resourceResponse.data.data) {
        const resources = resourceResponse.data.data
        
        console.log('🔍 [useUnstakeResources] API返回的原始数据:', resources)
        
        // 设置待提取资源（从质押状态API获取）
        if (statusResponse.data.success && statusResponse.data.data) {
          withdrawableAmount.value = statusResponse.data.data.stakeStatus.withdrawableTrx || 0
          console.log('🔍 [useUnstakeResources] 待提取资源:', withdrawableAmount.value, 'TRX')
        }
        
        // 根据TRON网络的实际数据结构计算质押信息
        // 1 TRX = 1,000,000 SUN
        const energyTotalStaked = (resources.energy?.totalStaked || 0) / 1000000
        const bandwidthTotalStaked = (resources.bandwidth?.totalStaked || 0) / 1000000
        const energyDelegatedIn = (resources.energy?.delegatedIn || 0) / 1000000
        const bandwidthDelegatedIn = (resources.bandwidth?.delegatedIn || 0) / 1000000
        
        // 总质押数量（直接质押 + 代理质押，都是可解质押的）
        const totalStaked = energyTotalStaked + bandwidthTotalStaked
        
        // 计算总的代理金额（包括代理给别人和别人代理给自己的）
        const totalDelegated = totalStaked + energyDelegatedIn + bandwidthDelegatedIn
        
        accountBalance.value = {
          available: (resources.energy?.available || 0) + (resources.bandwidth?.available || 0),
          staked: totalStaked, // 自己质押的TRX总量（可解质押）
          delegated: totalDelegated, // 总代理金额
          withdrawable: 0, // 需要从解质押记录中计算
          energyStaked: energyTotalStaked, // 能量质押的TRX数量（直接+代理）
          bandwidthStaked: bandwidthTotalStaked, // 带宽质押的TRX数量（直接+代理）
          // 代理给他人数量（用于“代理中资源”显示）
          energyDelegatedOut: (resources.energy?.delegatedOut || 0) / 1000000,
          bandwidthDelegatedOut: (resources.bandwidth?.delegatedOut || 0) / 1000000,
          // 直接质押数量（可解质押）
          energyDirectStaked: (resources.energy?.directStaked || 0) / 1000000,
          bandwidthDirectStaked: (resources.bandwidth?.directStaked || 0) / 1000000
        }
        
        console.log('✅ [useUnstakeResources] 账户余额计算结果:', accountBalance.value)
      } else {
        console.warn('⚠️ [useUnstakeResources] 账户资源API返回空数据')
        accountBalance.value = {
          available: 0,
          staked: 0,
          delegated: 0,
          withdrawable: 0,
          energyStaked: 0,
          bandwidthStaked: 0,
          energyDelegatedOut: 0,
          bandwidthDelegatedOut: 0,
          energyDirectStaked: 0,
          bandwidthDirectStaked: 0
        }
      }
    } catch (err: any) {
      console.error('❌ [useUnstakeResources] 加载账户余额失败:', err)
      throw new Error('加载账户信息失败: ' + (err.message || '未知错误'))
    }
  }

  // 设置最大可解质押金额
  const setMaxAmount = async (resourceType: 'ENERGY' | 'BANDWIDTH') => {
    try {
      // 重新获取最新的资源数据
      const response = await stakeAPI.getAccountResources(props.accountAddress || '', props.poolId)
      if (response.data.success && response.data.data) {
        const resources = response.data.data
        const energyDirectStaked = (resources.energy?.directStaked || 0) / 1000000
        const bandwidthDirectStaked = (resources.bandwidth?.directStaked || 0) / 1000000
        
        let maxAmount = 0
        if (resourceType === 'ENERGY') {
          maxAmount = energyDirectStaked
        } else {
          maxAmount = bandwidthDirectStaked
        }
        
        if (maxAmount > 0) {
          // 保留6位小数，去掉多余的零
          const amountStr = maxAmount.toFixed(6).replace(/\.?0+$/, '')
          console.log(`💡 [useUnstakeResources] 设置最大${resourceType}解质押金额:`, amountStr, 'TRX')
          return amountStr
        } else {
          throw new Error(`该账户没有质押${resourceType === 'ENERGY' ? '能量' : '带宽'}资源`)
        }
      }
      throw new Error('无法获取账户资源信息')
    } catch (error: any) {
      console.error('❌ [useUnstakeResources] 获取最大解质押金额失败:', error)
      throw error
    }
  }

  // 监听props变化，重新加载数据
  watch(() => [props.poolId, props.accountAddress], ([newPoolId, newAddress]) => {
    if (newPoolId && newAddress) {
      console.log('🔄 [useUnstakeResources] Props变化，重新加载数据:', { newPoolId, newAddress })
      loadAccountBalance()
    }
  }, { immediate: true })

  return {
    // 状态
    accountBalance,
    withdrawableAmount,
    
    // 方法
    loadAccountBalance,
    setMaxAmount
  }
}
