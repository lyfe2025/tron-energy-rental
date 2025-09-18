<!--
  解质押TRX模态框组件
  优化版本：结构清晰，不会超出页面
-->
<template>
  <div :class="modalClasses.overlay">
    <div :class="[modalClasses.container, modalClasses.containerSize.medium]">
      <!-- 头部 -->
      <div :class="modalClasses.header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">解质押TRX</h3>
            <p class="text-sm text-blue-600 mt-1" v-if="state.networkParams">
              {{ state.networkParams.networkName }} · 解锁期: {{ state.networkParams.unlockPeriodText }}
            </p>
          </div>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 内容 -->
      <div :class="modalClasses.content">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 解质押说明 -->
          <div class="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.662-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h4 class="text-sm font-medium text-orange-900 mb-1">解质押说明</h4>
                <p class="text-xs text-orange-700">解质押后需要等待{{ state.networkParams?.unlockPeriodText || '14天' }}才能提取TRX。解质押期间无法获得资源收益。</p>
              </div>
            </div>
          </div>

          <!-- 代理中资源显示（参考官方界面） -->
          <div v-if="extendedState.accountBalance && getDelegatingResources() > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span class="text-sm font-medium text-blue-800">正在代理中资源</span>
                <button class="text-xs text-blue-600 hover:text-blue-700 underline" title="代理中的资源需要通过「回收代理」操作来取回">
                  ?
                </button>
              </div>
              <div class="text-sm font-semibold text-blue-900">
                {{ formatTrxAmount(getDelegatingResources()) }} TRX
              </div>
            </div>
            <div class="mt-2 text-xs text-blue-700">
              <div class="flex justify-between">
                <span>• 能量代理: {{ formatTrxAmount(extendedState.accountBalance.energyDelegatedOut) }} TRX</span>
                <span>• 带宽代理: {{ formatTrxAmount(extendedState.accountBalance.bandwidthDelegatedOut) }} TRX</span>
              </div>
              <div class="mt-1 text-xs text-blue-600 italic">
                💡 代理中的资源需要通过「回收代理」操作来取回，不能直接解质押
              </div>
            </div>
          </div>

          <!-- 待提取解锁资源显示（参考官方"同时提取 50 TRX 质押本金"） -->
          <div v-if="withdrawableAmount > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium text-green-800">
                同时提取 {{ formatTrxAmount(withdrawableAmount) }} TRX 质押本金
              </span>
            </div>
            <p class="text-xs text-green-700 mt-1">解锁期已到，可立即提取到钱包</p>
          </div>

          <!-- 资源类型选择 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">请选择需要解锁的TRX</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="form.resourceType = 'ENERGY'"
                :class="[
                  'p-4 border-2 rounded-lg text-left transition-all duration-200',
                  form.resourceType === 'ENERGY'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                ]"
              >
                <div class="flex items-center mb-2">
                  <svg class="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span class="font-medium text-gray-900">能量+投票权</span>
                </div>
                <div class="text-sm font-semibold text-gray-700">
                  可解锁 {{ formatTrxAmount(extendedState.accountBalance?.energyDirectStaked || 0) }} TRX
                </div>
              </button>
              <button
                type="button"
                @click="form.resourceType = 'BANDWIDTH'"
                :class="[
                  'p-4 border-2 rounded-lg text-left transition-all duration-200',
                  form.resourceType === 'BANDWIDTH'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                ]"
              >
                <div class="flex items-center mb-2">
                  <svg class="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span class="font-medium text-gray-900">带宽+投票权</span>
                </div>
                <div class="text-sm font-semibold text-gray-700">
                  可解锁 {{ formatTrxAmount(extendedState.accountBalance?.bandwidthDirectStaked || 0) }} TRX
                </div>
              </button>
            </div>
          </div>

          <!-- 解质押金额 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">解锁数量</label>
              <div class="text-sm text-gray-600">
                可解锁：<span class="font-semibold text-blue-600">{{ getCurrentResourceStaked() }} TRX</span> 
                <span class="text-blue-500 font-bold">MAX</span>
              </div>
            </div>
            <div class="relative">
              <input
                v-model="form.amount"
                type="text"
                pattern="[0-9]*\.?[0-9]*"
                required
                class="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="请输入解锁数量"
                @input="(event) => validateNumberInput(event, (value) => form.amount = value)"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-4">
                <span class="text-gray-500 font-medium">TRX</span>
              </div>
            </div>
            <div class="flex items-center justify-end mt-2">
              <button 
                type="button" 
                @click="setMaxAmount" 
                :disabled="!extendedState.accountBalance || getCurrentResourceStakedAmount() <= 0"
                class="text-xs text-blue-600 hover:text-blue-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                最大值
              </button>
            </div>
          </div>

          <!-- 账户信息 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">解质押账户</label>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ accountAddress || '选择的账户地址' }}
                  </p>
                  <p class="text-xs text-gray-500">从该账户解质押资源</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 解质押预览 -->
          <div v-if="form.amount && parseFloat(form.amount) > 0" class="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <svg class="w-4 h-4 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              解质押操作预览
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">解质押数量:</span>
                <span class="font-semibold text-lg text-red-700">
                  {{ parseFloat(form.amount).toLocaleString() }} TRX
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">释放{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}:</span>
                <span class="font-medium text-orange-700">
                  {{ formatResource(calculateEstimatedResource(form.amount, form.resourceType), form.resourceType) }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">资金可提取时间:</span>
                <span class="font-medium text-red-700">
                  {{ state.networkParams?.unlockPeriodText || '14天' }} 后
                </span>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-orange-200">
              <p class="text-xs text-gray-600 leading-relaxed">
                <span class="text-red-600">重要提醒:</span> 解质押操作不可逆转，解质押期间将无法获得{{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}资源收益。
              </p>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="state.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ state.error }}</p>
          </div>
        </form>
      </div>

      <!-- 底部操作按钮 -->
      <div :class="modalClasses.footer">
        <div class="flex space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            :class="buttonClasses.secondary"
            class="flex-1"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="state.loading || !isFormValid || !state.networkParams"
            :class="buttonClasses.danger"
            class="flex-1"
          >
            <span v-if="state.loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              解锁中...
            </span>
            <span v-else>解锁并提取</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNumberInput } from '@/composables/useNumberInput'
import { stakeAPI } from '@/services/api'
import { computed, onMounted, ref, watch } from 'vue'
import type { UnstakeFormData, UnstakeOperationProps } from './shared/types'
import { buttonClasses, modalClasses, useStakeModal } from './shared/useStakeModal'

interface Emits {
  close: []
  success: []
}

const props = defineProps<UnstakeOperationProps>()
const emit = defineEmits<Emits>()

const {
  state,
  isFormValid,
  formatResource,
  calculateEstimatedResource,
  loadNetworkParams
} = useStakeModal(props)

// 数字输入验证
const { validateNumberInput } = useNumberInput()

// 表单数据
const form = ref<UnstakeFormData>({
  resourceType: 'ENERGY',
  amount: ''
})

// 账户余额状态
const accountBalance = ref<{
  available: number
  staked: number
  delegated: number
  withdrawable: number
  energyStaked: number
  bandwidthStaked: number
  // 代理出去的数量（真正的"代理中资源"）
  energyDelegatedOut: number
  bandwidthDelegatedOut: number
  // 直接质押的数量（可解质押）
  energyDirectStaked: number
  bandwidthDirectStaked: number
} | null>(null)

// 扩展的state计算属性，包含账户余额
const extendedState = computed(() => ({
  ...state.value,
  accountBalance: accountBalance.value
}))

// 格式化TRX数量显示
const formatTrxAmount = (amount: number) => {
  if (amount === 0) return '0'
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
}

// 获取当前选择资源类型的可解质押数量（用于显示）
const getCurrentResourceStaked = () => {
  const amount = getCurrentResourceStakedAmount()
  return formatTrxAmount(amount)
}

// 获取当前选择资源类型的可解质押数量（数值）
// 解质押只能解锁直接质押的数量，不包括代理出去的
const getCurrentResourceStakedAmount = () => {
  if (!extendedState.value.accountBalance) return 0
  
  if (form.value.resourceType === 'ENERGY') {
    return extendedState.value.accountBalance.energyDirectStaked || 0
  } else {
    return extendedState.value.accountBalance.bandwidthDirectStaked || 0
  }
}

// 获取正在代理中的资源总量（参考官方界面"正在代理中资源 442 TRX"）
// 代理中资源 = 代理质押（delegate）：用户质押TRX代理给别人
const getDelegatingResources = () => {
  if (!extendedState.value.accountBalance) return 0
  
  // 获取真实的代理出去的数量（delegatedOut）
  const energyDelegated = extendedState.value.accountBalance.energyDelegatedOut || 0
  const bandwidthDelegated = extendedState.value.accountBalance.bandwidthDelegatedOut || 0
  return energyDelegated + bandwidthDelegated
}

// 待提取的解锁资源（参考官方界面"同时提取 50 TRX 质押本金"）
// 这里暂时返回固定值，实际应该从API获取解锁记录
const withdrawableAmount = ref(0)

// 设置最大可解质押金额
const setMaxAmount = async () => {
  try {
    // 重新获取最新的资源数据
    const response = await stakeAPI.getAccountResources(props.accountAddress || '', props.poolId)
    if (response.data.success && response.data.data) {
      const resources = response.data.data
      const energyDirectStaked = (resources.energy?.directStaked || 0) / 1000000
      const bandwidthDirectStaked = (resources.bandwidth?.directStaked || 0) / 1000000
      
      let maxAmount = 0
      if (form.value.resourceType === 'ENERGY') {
        maxAmount = energyDirectStaked
      } else {
        maxAmount = bandwidthDirectStaked
      }
      
      if (maxAmount > 0) {
        // 保留6位小数，去掉多余的零
        form.value.amount = maxAmount.toFixed(6).replace(/\.?0+$/, '')
        console.log(`💡 [UnstakeModal] 设置最大${form.value.resourceType}解质押金额:`, form.value.amount, 'TRX')
      } else {
        state.value.error = `该账户没有质押${form.value.resourceType === 'ENERGY' ? '能量' : '带宽'}资源`
      }
    }
  } catch (error: any) {
    console.error('❌ [UnstakeModal] 获取最大解质押金额失败:', error)
    state.value.error = '获取最大解质押金额失败'
  }
}

// 加载账户资源和余额信息
const loadAccountBalance = async () => {
  if (!props.accountAddress || !props.poolId) return

  try {
    console.log('🔍 [UnstakeModal] 加载账户余额:', { 
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
      
      console.log('🔍 [UnstakeModal] API返回的原始数据:', resources)
      
      // 设置待提取资源（从质押状态API获取）
      if (statusResponse.data.success && statusResponse.data.data) {
        withdrawableAmount.value = statusResponse.data.data.stakeStatus.withdrawableTrx || 0
        console.log('🔍 [UnstakeModal] 待提取资源:', withdrawableAmount.value, 'TRX')
      }
      
      // 根据TRON网络的实际数据结构计算质押信息
      // 现在API返回了完整的质押数据：totalStaked = 直接质押 + 代理质押
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
        // 代理出去数量（用于"代理中资源"显示）
        energyDelegatedOut: (resources.energy?.delegatedOut || 0) / 1000000,
        bandwidthDelegatedOut: (resources.bandwidth?.delegatedOut || 0) / 1000000,
        // 直接质押数量（可解质押）
        energyDirectStaked: (resources.energy?.directStaked || 0) / 1000000,
        bandwidthDirectStaked: (resources.bandwidth?.directStaked || 0) / 1000000
      }
      
      console.log('✅ [UnstakeModal] 账户余额计算结果:', {
        原始数据: {
          energyTotalStaked_SUN: resources.energy?.totalStaked,
          bandwidthTotalStaked_SUN: resources.bandwidth?.totalStaked,
          energyDelegatedIn_SUN: resources.energy?.delegatedIn,
          bandwidthDelegatedIn_SUN: resources.bandwidth?.delegatedIn,
          energyDirectStaked_SUN: resources.energy?.directStaked,
          bandwidthDirectStaked_SUN: resources.bandwidth?.directStaked,
          energyDelegateStaked_SUN: resources.energy?.delegateStaked,
          bandwidthDelegateStaked_SUN: resources.bandwidth?.delegateStaked
        },
        计算结果: {
          energyTotalStaked_TRX: energyTotalStaked,
          bandwidthTotalStaked_TRX: bandwidthTotalStaked,
          totalStaked_TRX: totalStaked,
          totalDelegated_TRX: totalDelegated
        },
        最终余额: accountBalance.value
      })
    } else {
      console.warn('⚠️ [UnstakeModal] 账户资源API返回空数据')
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
    console.error('❌ [UnstakeModal] 加载账户余额失败:', err)
    state.value.error = '加载账户信息失败: ' + (err.message || '未知错误')
    accountBalance.value = null
  }
}

// 处理表单提交
const handleSubmit = async () => {
  if (!isFormValid.value || !state.value.networkParams) return
  if (!accountBalance.value || accountBalance.value.staked <= 0) {
    state.value.error = '没有可解质押的资源'
    return
  }

  const amount = parseFloat(form.value.amount)
  
  // 根据资源类型检查可解质押数量（只能解锁直接质押的）
  const response = await stakeAPI.getAccountResources(props.accountAddress || '', props.poolId)
  if (response.data.success && response.data.data) {
    const resources = response.data.data
    const energyDirectStaked = (resources.energy?.directStaked || 0) / 1000000
    const bandwidthDirectStaked = (resources.bandwidth?.directStaked || 0) / 1000000
    
    let maxUnstakeAmount = 0
    if (form.value.resourceType === 'ENERGY') {
      maxUnstakeAmount = energyDirectStaked
    } else {
      maxUnstakeAmount = bandwidthDirectStaked
    }
    
    if (amount > maxUnstakeAmount) {
      state.value.error = `解质押金额不能超过该资源的已质押金额（${formatTrxAmount(maxUnstakeAmount)} TRX）`
      return
    }
  } else {
    state.value.error = '无法获取账户资源信息，请稍后重试'
    return
  }

  try {
    state.value.loading = true
    state.value.error = ''

    // 调用解质押API
    const result = await stakeAPI.unfreezeTrx({
      networkId: props.poolId,
      poolAccountId: props.accountId || '',
      accountAddress: props.accountAddress || '',
      amount,
      resourceType: form.value.resourceType
    })

    if (result.data.success) {
      emit('success')
      alert(`解质押成功！解质押金额: ${formatTrxAmount(amount)} TRX，等待期后可提取`)
    } else {
      throw new Error(result.data.message || '解质押失败')
    }
  } catch (err: any) {
    console.error('❌ [UnstakeModal] 解质押失败:', err)
    state.value.error = err.message || '解质押失败，请重试'
  } finally {
    state.value.loading = false
  }
}

// 监听网络ID变化，重新加载数据
watch(() => props.poolId, (newPoolId) => {
  if (newPoolId) {
    console.log('🔄 [UnstakeModal] 网络ID变化，重新加载数据:', newPoolId)
    loadNetworkParams()
    loadAccountBalance()
  }
}, { immediate: true })

// 监听账户地址变化，重新加载数据
watch(() => props.accountAddress, (newAddress) => {
  if (newAddress) {
    console.log('🔄 [UnstakeModal] 账户地址变化，重新加载数据:', newAddress)
    loadAccountBalance()
  }
}, { immediate: true })

// 监听资源类型变化，重新加载数据
watch(() => form.value.resourceType, (newType) => {
  console.log('🔄 [UnstakeModal] 资源类型变化:', newType)
  // 清空当前输入的金额
  form.value.amount = ''
  // 清空错误信息
  state.value.error = ''
}, { immediate: false })

// 组件挂载时加载数据
onMounted(() => {
  console.log('🚀 [UnstakeModal] 组件挂载，开始加载数据')
  loadAccountBalance()
})
</script>
