<!--
  代理资源模态框组件
  重构版本：UI和业务逻辑完全分离，代码更简洁
-->
<template>
  <div :class="modalClasses.overlay">
    <div :class="[modalClasses.container, modalClasses.containerSize.large]">
      <!-- 头部 -->
      <div :class="modalClasses.header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">代理资源</h3>
            <p class="text-sm text-blue-600 mt-1" v-if="state.networkParams">
              {{ state.networkParams.networkName }} · 将您的资源代理给他人使用
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
          <!-- 代理说明 -->
          <DelegateExplanation
            :resourceType="form.resourceType"
          />

          <!-- 代理资源类型选择 -->
          <DelegateResourceSelector
            v-model:resourceType="form.resourceType"
            :availableEnergy="availableEnergy"
            :availableBandwidth="availableBandwidth"
            :loadingResources="loadingResources"
          />

          <!-- 接收方地址 -->
          <DelegateAddressInput
            v-model:receiverAddress="form.receiverAddress"
            :validation="addressValidation"
            :isValidating="isValidatingAddress"
            @validate="validateAddress"
          />

          <!-- 代理数量 -->
          <DelegateAmountInput
            v-model:amount="form.amount"
            :resourceType="form.resourceType"
            :availableAmount="form.resourceType === 'ENERGY' ? availableEnergy : availableBandwidth"
            :loadingResources="loadingResources"
            :validationError="amountError"
            @setMaxAmount="setMaxAmount"
            @validate="validateAmount"
          />

          <!-- 代理期限 -->
          <DelegateLockPeriodInput
            v-model:enableLockPeriod="form.enableLockPeriod"
            v-model:lockPeriod="form.lockPeriod"
            :lockPeriodRange="lockPeriodRange"
            :validationError="lockPeriodError"
            @validate="validateLockPeriod"
          />

          <!-- 代理预览 -->
          <DelegatePreview
            :amount="form.amount"
            :receiverAddress="form.receiverAddress"
            :resourceType="form.resourceType"
            :enableLockPeriod="form.enableLockPeriod"
            :lockPeriod="form.lockPeriod"
          />

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
            @click="handleDelegateSubmit"
            :disabled="state.loading || !state.networkParams || !form.receiverAddress || !form.amount || (amountError && !amountError.startsWith('✅')) || (form.enableLockPeriod && (!!lockPeriodError || !form.lockPeriod)) || isValidatingAddress || !addressValidation || !addressValidation.isValid"
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
            <span v-else>确认代理</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 交易确认模态框 -->
  <DelegateTransactionConfirmModal
    v-if="showTransactionConfirm && transactionData"
    :transactionData="transactionData"
    :networkParams="state.networkParams"
    :accountName="accountName"
    @confirm="handleTransactionConfirm"
    @reject="handleTransactionReject"
  />

  <!-- 成功弹窗 -->
  <DelegateSuccessModal
    v-if="showSuccessModal"
    :transactionData="transactionData"
    :txid="successTxid"
    :explorerUrl="successExplorerUrl"
    @close="handleSuccessModalClose"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { DelegateOperationProps } from './shared/types'
import { buttonClasses, modalClasses, useStakeModal } from './shared/useStakeModal'

// 导入子组件
import {
  DelegateAddressInput,
  DelegateAmountInput,
  DelegateExplanation,
  DelegateLockPeriodInput,
  DelegatePreview,
  DelegateResourceSelector
} from './DelegateModal'

// 导入确认交易模态框
import DelegateTransactionConfirmModal, { type DelegateTransactionData } from './DelegateTransactionConfirmModal/index.vue'

// 导入成功弹窗
import DelegateSuccessModal from './DelegateSuccessModal.vue'

// 导入签名服务
import { delegateSigningService } from '@/services/delegateSigningService'

// 导入业务逻辑
import { useDelegateModal } from './DelegateModal/composables'

interface Emits {
  close: []
  success: []
}

const props = defineProps<DelegateOperationProps>()
const emit = defineEmits<Emits>()

// 🔧 在setup()顶层定义route，以便在事件处理函数中使用
const route = useRoute()

console.log('🎯 [DelegateModal] 组件被创建')
console.log('🎯 [DelegateModal] Props:', {
  poolId: props.poolId,
  accountId: props.accountId,
  accountAddress: props.accountAddress,
  accountName: props.accountName
})

// 使用共享的模态框状态管理
const {
  state,
  isFormValid
} = useStakeModal(props)

// 使用整合的代理业务逻辑
const {
  form,
  accountResources,
  loadingResources,
  availableEnergy,
  availableBandwidth,
  lockPeriodRange,
  lockPeriodError,
  amountError,
  addressValidation,
  isValidatingAddress,
  validateAddress,
  validateLockPeriod,
  validateAmount,
  setMaxAmount,
  handleSubmit
} = useDelegateModal(props, state, isFormValid, emit)


// 交易确认模态框状态
const showTransactionConfirm = ref(false)
const transactionData = ref<DelegateTransactionData | null>(null)

// 成功弹窗状态
const showSuccessModal = ref(false)
const successTxid = ref<string>()
const successExplorerUrl = ref<string>()


// 包装原始的 handleSubmit，先显示交易确认
const handleDelegateSubmit = async () => {
  // 验证所有必填字段 - 修正：成功消息(以✅开头)不应阻止提交
  const hasAmountError = amountError.value && !amountError.value.startsWith('✅')
  if (!isFormValid.value || !state.value.networkParams || !form.value.receiverAddress || !form.value.amount || hasAmountError) {
    state.value.error = '请填写完整的代理信息'
    return
  }
  
  // 验证接收方地址
  if (!addressValidation.value || !addressValidation.value.isValid) {
    const errorMsg = addressValidation.value ? 
      `地址验证失败: ${addressValidation.value.errors.join(', ')}` : 
      '请输入有效的TRON地址'
    state.value.error = errorMsg
    return
  }
  
  // 验证代理数量
  if (!validateAmount()) {
    state.value.error = '代理数量设置有误，请检查'
    return
  }
  
  // 验证代理期限（仅在启用时验证）
  if (!validateLockPeriod()) {
    state.value.error = '代理期限设置有误，请检查'
    return
  }

  // 清空错误信息
  state.value.error = ''

  // 准备交易数据
  transactionData.value = {
    amount: form.value.amount,
    resourceType: form.value.resourceType,
    receiverAddress: form.value.receiverAddress,
    accountAddress: props.accountAddress,
    enableLockPeriod: form.value.enableLockPeriod,
    lockPeriod: form.value.lockPeriod,
    poolId: props.poolId,
    accountId: props.accountId
  }

  // 显示交易确认模态框
  showTransactionConfirm.value = true
}

// 处理交易确认
const handleTransactionConfirm = async (confirmedData: DelegateTransactionData) => {
  showTransactionConfirm.value = false
  
  // 保留交易数据以供成功弹窗使用
  transactionData.value = confirmedData
  
  try {
    state.value.loading = true
    state.value.error = ''

    // 验证交易数据
    const validationErrors = delegateSigningService.validateTransactionData(confirmedData)
    if (validationErrors.length > 0) {
      state.value.error = validationErrors.join(', ')
      return
    }

    // 获取网络ID
    const networkId = (route.params.networkId as string) || state.value.networkParams?.networkId
    if (!networkId) {
      state.value.error = '网络ID未找到，请刷新页面重试'
      return
    }
    
    // 执行代理操作
    const result = await delegateSigningService.signDelegateTransaction(confirmedData, networkId)

    if (result.success) {
      // 代理成功，显示成功弹窗
      successTxid.value = result.txid
      successExplorerUrl.value = delegateSigningService.getExplorerUrl(networkId)
      showSuccessModal.value = true
    } else {
      // 代理失败，显示错误信息
      state.value.error = result.error || '代理操作失败'
    }
  } catch (err: any) {
    state.value.error = err.message || '代理失败，请重试'
  } finally {
    state.value.loading = false
  }
}

// 处理交易拒绝
const handleTransactionReject = () => {
  showTransactionConfirm.value = false
  transactionData.value = null
}

// 处理成功弹窗关闭
const handleSuccessModalClose = () => {
  showSuccessModal.value = false
  successTxid.value = undefined
  successExplorerUrl.value = undefined
  
  // 在成功弹窗关闭时才触发success事件，让父组件刷新数据
  emit('success')
  emit('close')
}
</script>