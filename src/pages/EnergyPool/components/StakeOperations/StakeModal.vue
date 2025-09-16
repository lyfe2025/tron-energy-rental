<!--
  质押TRX模态框组件
  优化版本：解决页面超出问题，结构更清晰
-->
<template>
  <div :class="modalClasses.overlay">
    <div :class="[modalClasses.container, modalClasses.containerSize.medium]">
      <!-- 头部 - 固定不滚动 -->
      <div :class="modalClasses.header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">质押TRX获取资源和投票权</h3>
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

      <!-- 内容 - 可滚动 -->
      <div :class="modalClasses.content">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 质押2.0升级说明 -->
          <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
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
          <div>
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
                <div class="text-xs text-gray-500">用于智能合约调用</div>
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
                <div class="text-xs text-gray-500">用于普通转账</div>
              </button>
            </div>
          </div>

          <!-- 质押金额 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">质押数量</label>
            <div class="relative">
              <input
                v-model="form.amount"
                type="text"
                pattern="[0-9]*"
                required
                class="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="请输入质押数量（整数）"
                @input="(event) => validateIntegerInput(event, (value) => form.amount = value)"
              />
              <div class="absolute inset-y-0 right-0 flex items-center pr-4">
                <span class="text-gray-500 font-medium">TRX</span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-2">
              <p class="text-xs text-gray-500">
                最小质押: {{ state.networkParams?.minStakeAmountTrx || 1 }} TRX
              </p>
              <div v-if="state.networkParams" class="text-xs">
                <span class="text-gray-500">可用:</span>
                <span v-if="accountDataLoading" class="text-gray-400 animate-pulse">
                  加载中...
                </span>
                <span v-else-if="realTimeData" class="text-green-600 font-medium">
                  {{ availableTrxBalance.toLocaleString() }} TRX
                </span>
                <span v-else class="text-gray-400">
                  -- TRX
                </span>
                <button 
                  type="button" 
                  @click="handleMaxAmount"
                  :disabled="!realTimeData || availableTrxBalance <= 0"
                  class="ml-1 text-blue-600 hover:text-blue-700 underline disabled:text-gray-400 disabled:no-underline"
                >
                  MAX
                </button>
              </div>
            </div>
            
            <!-- 余额不足提示 -->
            <div v-if="form.amount && !isAmountValid && parseFloat(form.amount) > 0" class="mt-2">
              <div v-if="parseFloat(form.amount) > availableTrxBalance" class="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                ⚠️ 余额不足：需要 {{ form.amount }} TRX，可用 {{ availableTrxBalance.toLocaleString() }} TRX
              </div>
              <div v-else-if="parseFloat(form.amount) < (state.networkParams?.minStakeAmountTrx || 1)" class="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                ⚠️ 质押金额不能小于最小质押金额 {{ state.networkParams?.minStakeAmountTrx || 1 }} TRX
              </div>
              <div v-else-if="parseFloat(form.amount) !== Math.floor(parseFloat(form.amount))" class="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                ⚠️ 质押金额必须为整数
              </div>
            </div>
          </div>

          <!-- 接收账户 -->
          <div>
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
              </div>
            </div>
          </div>

          <!-- 预估获得 -->
          <div v-if="state.networkParams && form.amount && parseFloat(form.amount) > 0" class="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              预计获得 {{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }} + 投票权
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">获得资源数量:</span>
                <span class="font-semibold text-lg text-green-700">
                  {{ formatResource(calculateEstimatedResource(form.amount, form.resourceType), form.resourceType) }} {{ form.resourceType === 'ENERGY' ? '能量' : '带宽' }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">获得投票权:</span>
                <span class="font-semibold text-lg text-blue-700">
                  {{ form.amount }} TP
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">解锁时需等待:</span>
                <span class="font-medium text-blue-700">
                  {{ state.networkParams.unlockPeriodText }} 方可提取
                </span>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-green-200">
              <div class="space-y-2 text-xs text-gray-600 leading-relaxed">
                <p>
                  <span class="text-orange-600 font-medium">重要说明:</span> 实际获得的资源数量基于TRON官方公式计算：
                </p>
                <p class="bg-gray-50 p-2 rounded font-mono text-xs">
                  资源数量 = 您的质押TRX ÷ 全网质押TRX × 全网每日总资源
                </p>
                <p>
                  • 全网每日固定能量总量：<span class="font-medium">180,000,000,000</span><br>
                  • 全网每日固定带宽总量：<span class="font-medium">43,200,000,000</span><br>
                  • 由于全网质押量时刻变化，实际资源数量也将动态调整
                </p>
                <p class="text-blue-600 text-xs">
                  <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  计算已基于{{ state.networkParams.networkName }}实际测试数据校准，确保预估准确性
                </p>
              </div>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="state.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ state.error }}</p>
          </div>
        </form>
      </div>

      <!-- 底部操作按钮 - 固定不滚动 -->
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
            :disabled="state.loading || !enhancedIsFormValid || !state.networkParams || accountDataLoading"
            :class="buttonClasses.primary"
            class="flex-1"
          >
            <span v-if="state.loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
            <span v-else>确认</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 交易确认弹窗 -->
    <TransactionConfirmModal
      v-if="showTransactionConfirm && transactionData"
      :transaction-data="transactionData"
      :network-params="state.networkParams"
      :estimated-resource="calculateEstimatedResource(form.amount, form.resourceType)"
      :account-name="accountName || '未知账户'"
      @confirm="handleTransactionConfirm"
      @reject="handleTransactionReject"
    />

    <!-- 交易结果弹窗 -->
    <TransactionResultModal
      v-if="showTransactionResult"
      :estimated-resource="calculateEstimatedResource(form.amount, form.resourceType)"
      :resource-type="form.resourceType"
      @confirm="handleTransactionResultConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { useNumberInput } from '@/composables/useNumberInput'
import { useRealTimeAccountData } from '@/composables/useRealTimeAccountData'
import { computed, onMounted, ref, watch } from 'vue'
import type { StakeFormData, StakeOperationProps } from './shared/types'
import { buttonClasses, modalClasses, useStakeModal } from './shared/useStakeModal'
import type { TransactionData } from './TransactionConfirmModal.vue'
import TransactionConfirmModal from './TransactionConfirmModal.vue'
import TransactionResultModal from './TransactionResultModal.vue'

interface Emits {
  close: []
  success: []
}

const props = defineProps<StakeOperationProps>()
const emit = defineEmits<Emits>()

const {
  state,
  isFormValid,
  formatResource,
  calculateEstimatedResource,
  executeStakeOperation,
  accountName
} = useStakeModal(props)

// 实时账户数据
const {
  realTimeData,
  loading: accountDataLoading,
  fetchRealTimeData,
  formatTrx
} = useRealTimeAccountData()

// 数字输入验证
const { validateNumberInput } = useNumberInput()

// 整数输入验证函数
const validateIntegerInput = (event: Event, callback: (value: string) => void) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // 只允许数字
  const numericValue = value.replace(/[^0-9]/g, '')
  
  // 更新输入框值
  target.value = numericValue
  
  // 调用回调函数
  callback(numericValue)
}

// 表单数据
const form = ref<StakeFormData>({
  resourceType: 'ENERGY',
  amount: ''
})

// 计算可用TRX余额（转换为TRX单位，向下取整）
const availableTrxBalance = computed(() => {
  return realTimeData.value ? Math.floor(realTimeData.value.balance / 1000000) : 0
})

// 计算表单验证状态（包括余额检查）
const isAmountValid = computed(() => {
  if (!form.value.amount) return false
  const amount = parseFloat(form.value.amount)
  if (isNaN(amount) || amount <= 0) return false
  
  // 检查是否为整数
  if (amount !== Math.floor(amount)) return false
  
  // 检查最小质押金额
  const minStakeAmount = state.value.networkParams?.minStakeAmountTrx || 1
  if (amount < minStakeAmount) return false
  
  // 检查是否超过可用余额
  if (amount > availableTrxBalance.value) return false
  
  return true
})

// 重新计算表单验证状态
const enhancedIsFormValid = computed(() => {
  return isFormValid.value && isAmountValid.value
})

// 交易确认弹窗状态
const showTransactionConfirm = ref(false)
const transactionData = ref<TransactionData | null>(null)

// 交易结果弹窗状态
const showTransactionResult = ref(false)

// 处理表单提交 - 显示交易确认弹窗
const handleSubmit = async () => {
  if (!enhancedIsFormValid.value || !state.value.networkParams) return

  // 准备交易数据
  transactionData.value = {
    amount: parseFloat(form.value.amount),
    resourceType: form.value.resourceType,
    accountAddress: props.accountAddress,
    poolId: props.poolId,
    accountId: props.accountId
  }

  // 显示交易确认弹窗
  showTransactionConfirm.value = true
}

// 处理最大金额按钮
const handleMaxAmount = () => {
  if (availableTrxBalance.value > 0) {
    // 设置为最大可用余额（不保留手续费，因为TRON质押手续费很低）
    form.value.amount = availableTrxBalance.value.toString()
  }
}

// 获取账户数据
const loadAccountData = async () => {
  if (props.accountAddress) {
    try {
      await fetchRealTimeData(props.accountAddress, props.poolId, false)
    } catch (err) {
      console.error('获取账户数据失败:', err)
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadAccountData()
})

// 监听账户地址变化
watch(() => props.accountAddress, (newAddress) => {
  if (newAddress) {
    loadAccountData()
  }
}, { immediate: true })

// 处理交易确认
const handleTransactionConfirm = async (data: TransactionData) => {
  try {
    const result = await executeStakeOperation(
      data.amount,
      data.resourceType
    )

    if (result.success) {
      // 关闭交易确认弹窗，显示交易结果弹窗
      showTransactionConfirm.value = false
      showTransactionResult.value = true
    }
  } catch (err: any) {
    console.error('质押操作失败:', err)
  }
}

// 处理交易拒绝
const handleTransactionReject = () => {
  showTransactionConfirm.value = false
  transactionData.value = null
}

// 处理交易结果确认
const handleTransactionResultConfirm = () => {
  showTransactionResult.value = false
  emit('success')
}
</script>
