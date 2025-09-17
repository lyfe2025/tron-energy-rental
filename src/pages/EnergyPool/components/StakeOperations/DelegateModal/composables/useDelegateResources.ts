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
  const availableEnergy = computed(() => {
    if (!accountResources.value) return 0
    // 可代理的能量 = 可用能量 (已经排除了代理出去的部分)
    return Math.max(0, accountResources.value.energy.available)
  })

  const availableBandwidth = computed(() => {
    if (!accountResources.value) return 0
    // 可代理的带宽 = 可用带宽 (已经排除了代理出去的部分)
    return Math.max(0, accountResources.value.bandwidth.available)
  })

  // 根据TRON官方API获取代理期限范围
  const lockPeriodRange = computed(() => {
    if (!state.value.networkParams) {
      return { min: 0.01, max: 30, recommended: '0.01-14', description: '正在获取网络参数...' }
    }
    
    // 使用TRON官方API的maxDelegateLockPeriod参数
    const maxDays = state.value.networkParams.maxDelegateLockPeriodDays || 30 // 默认30天
    
    return {
      min: 0.01, // 最小0.01天（约14.4分钟）
      max: maxDays,
      recommended: `0.01-${Math.min(14, maxDays)}`,
      description: `基于TRON官方API的代理期限限制（最长${maxDays}天，最小0.01天）`
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
