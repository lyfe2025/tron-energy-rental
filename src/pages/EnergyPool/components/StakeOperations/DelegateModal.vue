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
            @click="handleSubmit"
            :disabled="state.loading || !isFormValid || !state.networkParams || !form.receiverAddress || !form.amount || !!amountError || (form.enableLockPeriod && (!!lockPeriodError || !form.lockPeriod)) || isValidatingAddress || !addressValidation || !addressValidation.isValid"
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
</template>

<script setup lang="ts">
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

// 导入业务逻辑
import { useDelegateModal } from './DelegateModal/composables'

interface Emits {
  close: []
  success: []
}

const props = defineProps<DelegateOperationProps>()
const emit = defineEmits<Emits>()

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

console.log('🎯 [DelegateModal] 业务逻辑初始化完成')
</script>