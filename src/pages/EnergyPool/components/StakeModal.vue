<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">质押TRX获取资源和投票权</h3>
            <p class="text-sm text-blue-600 mt-1" v-if="networkParams">
              {{ networkParams.networkName }} · 解锁期: {{ networkParams.unlockPeriodText }}
            </p>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6">
        <!-- TRON 2.0 升级说明 -->
        <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 class="text-sm font-medium text-blue-900 mb-1">质押 2.0 升级说明</h4>
              <p class="text-xs text-blue-700">仅支持给自己质押TRX获取资源和投票权。如需为他人获取资源，可在质押成功后将资源代理给他人。</p>
            </div>
          </div>
        </div>

        <!-- 资源类型选择 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-3">获取</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="form.resourceType = 'ENERGY'"
              :class="[
                'p-4 border rounded-lg text-center transition-all duration-200',
                form.resourceType === 'ENERGY'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              ]"
            >
              <div class="flex items-center justify-center mb-2">
                <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div class="font-medium mb-1">能量+投票权</div>
              <div class="text-xs text-gray-500 mb-2">用于智能合约调用</div>
              <div v-if="networkParams && form.amount" class="text-xs font-medium">
                <span class="text-green-600">约{{ formatResource(parseFloat(form.amount) * networkParams.energyRatio, 'ENERGY') }}</span>
              </div>
              <div v-else-if="networkParams" class="text-xs text-gray-400">
                1 TRX ≈ {{ formatResource(networkParams.energyRatio, 'ENERGY') }}
              </div>
            </button>
            <button
              type="button"
              @click="form.resourceType = 'BANDWIDTH'"
              :class="[
                'p-4 border rounded-lg text-center transition-all duration-200',
                form.resourceType === 'BANDWIDTH'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              ]"
            >
              <div class="flex items-center justify-center mb-2">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div class="font-medium mb-1">带宽+投票权</div>
              <div class="text-xs text-gray-500 mb-2">用于普通转账</div>
              
              <!-- 免费带宽显示 -->
              <div class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mb-2">
                <span class="font-medium">免费带宽: 600</span>
              </div>
              
              <div v-if="networkParams && form.amount" class="text-xs font-medium">
                <span class="text-green-600">约{{ formatResource(parseFloat(form.amount) * networkParams.bandwidthRatio, 'BANDWIDTH') }}</span>
              </div>
              <div v-else-if="networkParams" class="text-xs text-gray-400">
                1 TRX ≈ {{ formatResource(networkParams.bandwidthRatio, 'BANDWIDTH') }}
              </div>
            </button>
          </div>
        </div>

        <!-- 质押金额 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">质押数量</label>
          <div class="relative">
            <input
              v-model="form.amount"
              type="number"
              step="0.000001"
              :min="networkParams?.minStakeAmountTrx || 1"
              required
              class="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="请输入质押数量"
            />
            <div class="absolute inset-y-0 right-0 flex items-center pr-4">
              <span class="text-gray-500 font-medium">TRX</span>
            </div>
          </div>
          <div class="flex items-center justify-between mt-2">
            <p class="text-xs text-gray-500">
              最小质押: {{ networkParams?.minStakeAmountTrx || 1 }} TRX
            </p>
            <div v-if="networkParams && form.amount" class="text-xs">
              <span class="text-gray-500">可用:</span>
              <span class="text-green-600 font-medium">1,900 TRX</span>
              <button 
                type="button" 
                @click="form.amount = '1900'" 
                class="ml-1 text-blue-600 hover:text-blue-700 underline"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        <!-- 接收账户 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">接收账户</label>
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ accountAddress || '选择的账户地址' }}
                </p>
                <p class="text-xs text-gray-500">质押2.0仅支持给自己质押</p>
              </div>
              <div v-if="accountAddress" class="flex-shrink-0">
                <button
                  @click="fetchRealTimeAccountData"
                  :disabled="realTimeAccountData.loading.value"
                  class="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                >
                  <svg :class="{ 'animate-spin': realTimeAccountData.loading.value }" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{{ realTimeAccountData.loading.value ? '获取中' : '刷新' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 钱包资源信息 -->
        <div v-if="accountAddress && realTimeAccountData.realTimeData.value" class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-3">钱包资源信息</label>
          <div class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <!-- 总能量 -->
              <div class="text-center bg-white rounded p-3 border border-blue-100">
                <div class="text-lg font-bold text-blue-600">
                  {{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.total) }}
                </div>
                <div class="text-xs text-gray-600 mt-1">总能量</div>
              </div>
              
              <!-- 可用能量 -->
              <div class="text-center bg-white rounded p-3 border border-green-100">
                <div class="text-lg font-bold text-green-600">
                  {{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.available) }}
                </div>
                <div class="text-xs text-gray-600 mt-1">可用能量</div>
              </div>
              
              <!-- 总带宽 -->
              <div class="text-center bg-white rounded p-3 border border-purple-100">
                <div class="text-lg font-bold text-purple-600">
                  {{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.total) }}
                </div>
                <div class="text-xs text-gray-600 mt-1">总带宽</div>
              </div>
              
              <!-- 可用带宽 -->
              <div class="text-center bg-white rounded p-3 border border-orange-100">
                <div class="text-lg font-bold text-orange-600">
                  {{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.available) }}
                </div>
                <div class="text-xs text-gray-600 mt-1">可用带宽</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 预估获得 -->
        <div v-if="networkParams && form.amount && parseFloat(form.amount) > 0" class="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            * 预计获得 -- {{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}，同时获得 -- 投票权
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">获得{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
              <span class="font-semibold text-lg text-green-700">
                {{ formatResource(calculateEstimatedResource(), form.resourceType) }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">解锁时需等待:</span>
              <span class="font-medium text-blue-700">
                {{ networkParams.unlockPeriodText }} 方可提取
              </span>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-green-200">
            <p class="text-xs text-gray-600 leading-relaxed">
              <span class="text-orange-600">注意:</span> 实际获得的资源数量取决于当前质押量与全网质押量的比值，全网质押量时刻变化，因此实际获得的资源数量也将不断变化。
            </p>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="loading || !isFormValid || !networkParams"
            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
            <span v-else>确认</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRealTimeAccountData } from '@/composables/useRealTimeAccountData'
import networkParametersService, { type NetworkParameters } from '@/services/networkParametersService'
import { computed, onMounted, ref, watch } from 'vue'
import { useStake } from '../composables/useStake'

interface Props {
  poolId: string
  accountId?: string
  accountAddress?: string
}

interface Emits {
  close: []
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { freezeTrx, formatEnergy, formatTrx } = useStake()

// 实时账户数据
const realTimeAccountData = useRealTimeAccountData()

// 表单数据
const form = ref({
  resourceType: 'ENERGY' as 'ENERGY' | 'BANDWIDTH',
  amount: ''
})

// 状态
const loading = ref(false)
const loadingParams = ref(false)
const error = ref('')
const networkParams = ref<NetworkParameters | null>(null)

// 计算属性
const isFormValid = computed(() => {
  if (!networkParams.value) return false
  
  const amount = parseFloat(form.value.amount || '0')
  return amount >= (networkParams.value.minStakeAmountTrx || 1) && 
         form.value.resourceType
})

// 格式化资源
const formatResource = (amount: number, resourceType: 'ENERGY' | 'BANDWIDTH' = form.value.resourceType) => {
  if (resourceType === 'ENERGY') {
    return networkParametersService.formatResourceAmount(amount, 'ENERGY')
  } else {
    return networkParametersService.formatResourceAmount(amount, 'BANDWIDTH')
  }
}

// 计算预估资源
const calculateEstimatedResource = () => {
  if (!networkParams.value || !form.value.amount) return 0
  
  const amount = parseFloat(form.value.amount)
  const ratio = form.value.resourceType === 'ENERGY' 
    ? networkParams.value.energyRatio 
    : networkParams.value.bandwidthRatio
    
  return amount * ratio
}

// 加载网络参数
const loadNetworkParams = async () => {
  if (!props.poolId) return
  
  loadingParams.value = true
  error.value = ''
  
  try {
    const params = await networkParametersService.getNetworkParameters(props.poolId)
    networkParams.value = params
    console.log('[StakeModal] 网络参数加载完成:', params)
  } catch (err: any) {
    console.error('[StakeModal] 加载网络参数失败:', err)
    error.value = `无法加载网络参数: ${err.message}`
  } finally {
    loadingParams.value = false
  }
}

// 获取实时账户数据
const fetchRealTimeAccountData = async () => {
  if (!props.accountAddress) return
  
  console.log('[StakeModal] 开始获取实时账户数据:', props.accountAddress)
  
  try {
    await realTimeAccountData.fetchRealTimeData(
      props.accountAddress,
      props.poolId
    )
    console.log('[StakeModal] 实时账户数据获取成功')
  } catch (err: any) {
    console.error('[StakeModal] 获取实时账户数据失败:', err)
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!isFormValid.value || !networkParams.value) return

  loading.value = true
  error.value = ''

  try {
    const result = await freezeTrx({
      poolId: props.poolId,
      accountId: props.accountId,
      accountAddress: props.accountAddress,
      amount: parseFloat(form.value.amount),
      resourceType: form.value.resourceType,
      lockPeriod: 0 // TRON 2.0 不需要锁定期
    })

    if (result) {
      emit('success')
      // 显示成功消息
      alert(`质押成功！交易ID: ${result.txid}，质押金额: ${formatTrx(parseFloat(form.value.amount))}`)
    }
  } catch (err: any) {
    error.value = err.message || '质押失败，请重试'
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载网络参数和实时数据
onMounted(async () => {
  await loadNetworkParams()
  await fetchRealTimeAccountData()
})

// 监听poolId变化
watch(() => props.poolId, async () => {
  await loadNetworkParams()
  await fetchRealTimeAccountData()
}, { immediate: true })

// 监听accountAddress变化
watch(() => props.accountAddress, async () => {
  if (props.accountAddress) {
    await fetchRealTimeAccountData()
  } else {
    realTimeAccountData.clearData()
  }
})
</script>