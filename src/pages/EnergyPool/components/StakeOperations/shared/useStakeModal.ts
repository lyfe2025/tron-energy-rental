/**
 * 质押操作模态框的共享逻辑
 */

import networkParametersService from '@/services/networkParametersService'
import { computed, onMounted, ref, watch } from 'vue'
import { useStake } from '../../../composables/useStake'
import type {
    BaseOperationProps,
    ModalState,
    OperationResult,
    ResourceType
} from './types'

export function useStakeModal(props: BaseOperationProps) {
  const { freezeTrx, formatEnergy, formatTrx, formatBandwidth } = useStake()

  // 状态管理
  const state = ref<ModalState>({
    loading: false,
    loadingParams: false,
    error: '',
    networkParams: null
  })

  // 计算属性
  const isFormValid = computed(() => {
    return !!state.value.networkParams
  })

  // 格式化资源
  const formatResource = (amount: number, resourceType: ResourceType = 'ENERGY') => {
    if (resourceType === 'ENERGY') {
      return networkParametersService.formatResourceAmount(amount, 'ENERGY')
    } else {
      return networkParametersService.formatResourceAmount(amount, 'BANDWIDTH')
    }
  }

  // 计算预估资源
  const calculateEstimatedResource = (amount: string, resourceType: ResourceType) => {
    if (!state.value.networkParams || !amount) return 0
    
    const amountNum = parseFloat(amount)
    const ratio = resourceType === 'ENERGY' 
      ? state.value.networkParams.energyRatio 
      : state.value.networkParams.bandwidthRatio
      
    return amountNum * ratio
  }

  // 加载网络参数
  const loadNetworkParams = async () => {
    if (!props.poolId) return
    
    state.value.loadingParams = true
    state.value.error = ''
    
    try {
      const params = await networkParametersService.getNetworkParameters(props.poolId)
      state.value.networkParams = params
      console.log('[StakeModal] 网络参数加载完成:', params)
    } catch (err: any) {
      console.error('[StakeModal] 加载网络参数失败:', err)
      state.value.error = `无法加载网络参数: ${err.message}`
    } finally {
      state.value.loadingParams = false
    }
  }

  // 执行质押操作
  const executeStakeOperation = async (
    amount: number,
    resourceType: ResourceType
  ): Promise<OperationResult> => {
    if (!state.value.networkParams) {
      throw new Error('网络参数未加载')
    }

    state.value.loading = true
    state.value.error = ''

    try {
      const result = await freezeTrx({
        poolId: props.poolId,
        accountId: props.accountId,
        accountAddress: props.accountAddress,
        amount,
        resourceType,
        lockPeriod: 0 // TRON 2.0 不需要锁定期
      })

      if (result) {
        return {
          success: true,
          txid: result.txid,
          message: `质押成功！交易ID: ${result.txid}，质押金额: ${formatTrx(amount)}`
        }
      } else {
        throw new Error('质押操作失败')
      }
    } catch (err: any) {
      const errorMessage = err.message || '质押失败，请重试'
      state.value.error = errorMessage
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      state.value.loading = false
    }
  }

  // 组件挂载时加载网络参数
  onMounted(() => {
    loadNetworkParams()
  })

  // 监听poolId变化
  watch(() => props.poolId, () => {
    loadNetworkParams()
  }, { immediate: true })

  return {
    // 状态
    state,
    
    // 计算属性
    isFormValid,
    
    // 方法
    formatResource,
    calculateEstimatedResource,
    loadNetworkParams,
    executeStakeOperation,
    
    // 格式化方法
    formatTrx,
    formatEnergy,
    formatBandwidth
  }
}

// 导出通用的模态框样式类
export const modalClasses = {
  overlay: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
  container: 'bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto',
  containerSize: {
    small: 'max-w-md',
    medium: 'max-w-lg', 
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl'
  },
  header: 'px-6 py-4 border-b border-gray-200 flex-shrink-0',
  content: 'p-6 overflow-y-auto',
  footer: 'px-6 py-4 border-t border-gray-200 flex-shrink-0'
}

// 导出通用的按钮样式
export const buttonClasses = {
  primary: 'px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium',
  secondary: 'px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors',
  danger: 'px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium'
}
