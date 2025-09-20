/**
 * 代理资源管理逻辑 Composable
 */
import { stakeAPI, type AccountResources } from '@/services/api/stake/stakeAPI'
import { computed, ref, watch } from 'vue'

export function useDelegateResources(props: any, state: any) {
  // 账户资源数据
  const accountResources = ref<AccountResources | null>(null)
  // 初始状态设置为true，如果有账户地址就应该显示加载中
  const loadingResources = ref(!!props.accountAddress)

  // 获取当前可代理的资源数量
  // 🔧 修正：根据TRON官方文档，可代理的资源不能包括他人代理给自己的资源
  const availableEnergy = computed(() => {
    if (!accountResources.value) return 0
    
    const energyData = accountResources.value.energy
    // 可代理的能量 = 可用能量 - 他人代理给自己的能量
    // 这确保只有自己质押获得的能量可以代理给他人
    const delegatedInEnergy = (energyData.delegatedIn / 1000000) * 76.2 // 将TRX转换为能量值
    const delegatableEnergy = Math.max(0, energyData.available - delegatedInEnergy)
    
    console.log('🔍 [useDelegateResources] 可代理能量计算:', {
      '总可用能量': energyData.available,
      '他人代理给自己能量TRX': energyData.delegatedIn / 1000000,
      '他人代理给自己能量值': delegatedInEnergy,
      '最终可代理能量': delegatableEnergy,
      '说明': '只有自己质押获得的能量可以代理给他人'
    })
    
    return Math.floor(delegatableEnergy) // 向下取整，确保不超过实际可代理数量
  })

  const availableBandwidth = computed(() => {
    if (!accountResources.value) return 0
    
    const bandwidthData = accountResources.value.bandwidth
    // 可代理的带宽 = 质押获得的带宽 - 已代理给他人的部分
    // 使用limit字段（仅质押获得）而不是available字段（包含他人代理给自己）
    const stakingOnlyBandwidth = bandwidthData.limit // 仅质押获得的带宽
    const alreadyDelegatedOut = bandwidthData.delegatedOut // 已代理给他人的TRX数量（SUN）
    
    // 将已代理给他人的TRX转换为带宽值进行计算
    const delegatedOutBandwidth = (alreadyDelegatedOut / 1000000) * 1000 // TRX转带宽的简化计算
    const delegatableBandwidth = Math.max(0, stakingOnlyBandwidth - delegatedOutBandwidth)
    
    console.log('🔍 [useDelegateResources] 可代理带宽计算:', {
      '质押获得带宽': stakingOnlyBandwidth,
      '已代理给他人TRX': alreadyDelegatedOut / 1000000,
      '已代理给他人带宽值': delegatedOutBandwidth,
      '最终可代理带宽': delegatableBandwidth,
      '说明': '只计算自己质押获得的带宽，排除他人代理给自己的部分'
    })
    
    return Math.floor(delegatableBandwidth) // 向下取整，确保不超过实际可代理数量
  })

  // 根据TRON官方API获取代理期限范围
  const lockPeriodRange = computed(() => {
    if (!state.value.networkParams) {
      return { min: 0.000833, max: 720, recommended: '0.000833-336', description: '正在获取网络参数...' }
    }
    
    // 使用TRON官方API的maxDelegateLockPeriod参数，直接使用小时数
    const maxHours = state.value.networkParams.maxDelegateLockPeriodHours || 720 // 默认720小时（30天）
    
    return {
      min: 0.000833, // 最小0.000833小时（3秒，1个区块）
      max: maxHours,
      recommended: `0.0167-${Math.min(336, maxHours)}`, // 推荐从1分钟开始，336小时=14天
      description: `基于TRON官方API的代理期限限制（最长${maxHours}小时，最小0.000833小时即3秒）`
    }
  })

  // 获取账户资源信息
  const fetchAccountResources = async () => {
    if (!props.accountAddress) {
      console.warn('没有提供账户地址，无法获取资源信息')
      loadingResources.value = false
      return
    }

    if (!state.value.networkParams?.networkId) {
      console.warn('网络参数未加载完成，暂缓获取资源信息')
      return
    }

    try {
      loadingResources.value = true
      console.log('🔍 获取账户资源信息:', {
        address: props.accountAddress,
        networkId: state.value.networkParams?.networkId
      })

      const response = await stakeAPI.getAccountResources(
        props.accountAddress, 
        state.value.networkParams?.networkId
      )

      if (response.data.success) {
        accountResources.value = response.data.data
        console.log('✅ 账户资源获取成功:', accountResources.value)
      } else {
        console.error('❌ 获取账户资源失败:', response.data.error)
        state.value.error = response.data.error || '获取账户资源失败'
      }
    } catch (error: any) {
      console.error('❌ 获取账户资源异常:', error)
      state.value.error = error.message || '获取账户资源失败'
    } finally {
      loadingResources.value = false
    }
  }

  // 设置监听器
  const setupResourceWatchers = () => {
    // 监听网络参数变化，重新获取资源信息
    watch(() => state.value.networkParams, (newParams) => {
      if (newParams && props.accountAddress) {
        fetchAccountResources()
      }
    }, { immediate: true })

    // 监听账户地址变化，立即开始加载资源信息
    watch(() => props.accountAddress, (newAddress) => {
      if (newAddress) {
        // 有账户地址就显示加载状态
        loadingResources.value = true
        // 如果网络参数已经准备好，立即获取资源信息
        if (state.value.networkParams) {
          fetchAccountResources()
        }
      } else {
        // 没有账户地址则停止加载状态
        loadingResources.value = false
        accountResources.value = null
      }
    }, { immediate: true })
  }

  return {
    accountResources,
    loadingResources,
    availableEnergy,
    availableBandwidth,
    lockPeriodRange,
    fetchAccountResources,
    setupResourceWatchers
  }
}
