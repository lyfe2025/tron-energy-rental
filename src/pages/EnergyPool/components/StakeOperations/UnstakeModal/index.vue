<!--
  解质押TRX模态框 - 主入口组件
  分离后的版本，保持原有功能不变
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
        <UnstakeForm
          :form="form"
          :account-balance="accountBalance"
          :withdrawable-amount="withdrawableAmount"
          :account-address="accountAddress"
          :unlock-period-text="state.networkParams?.unlockPeriodText"
          :loading="state.loading"
          :error="state.error"
          :validate-number-input="validateNumberInput"
          :format-trx-amount="formatTrxAmount"
          :get-current-resource-staked="getCurrentResourceStaked"
          :get-delegating-resources="getDelegatingResources"
          :calculate-estimated-resource="calculateEstimatedResource"
          :format-resource="formatResource"
          @submit="handleSubmit"
          @update-resource-type="handleResourceTypeChange"
          @set-max="handleSetMaxAmount"
        />
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

    <!-- 交易确认弹窗 -->
    <UnstakeTransactionConfirmModal
      v-if="showTransactionConfirm && transactionData"
      :transaction-data="transactionData"
      :network-params="state.networkParams"
      :estimated-resource="calculateEstimatedResource(form.amount, form.resourceType)"
      :account-name="accountName || '未知账户'"
      @confirm="handleTransactionConfirm"
      @reject="handleTransactionReject"
    />

    <!-- 解锁成功弹窗 -->
    <UnstakeSuccessModal
      v-if="showSuccessModal && successData"
      :data="successData"
      @close="hideSuccessModal"
      @viewTransaction="handleViewTransaction"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { buttonClasses, modalClasses } from '../shared/useStakeModal'
import UnstakeSuccessModal from '../UnstakeSuccessModal.vue'
import UnstakeTransactionConfirmModal from '../UnstakeTransactionConfirmModal.vue'
import UnstakeForm from './components/UnstakeForm.vue'
import { useUnstakeModal } from './composables'
import type { UnstakeOperationEmits, UnstakeOperationProps } from './types'

const props = defineProps<UnstakeOperationProps>()
const emit = defineEmits<UnstakeOperationEmits>()

// 使用解锁模态框逻辑
const {
  // 状态
  state,
  form,
  accountBalance,
  withdrawableAmount,
  
  // 计算属性
  isFormValid,
  accountName,
  
  // 表单相关方法
  validateNumberInput,
  formatTrxAmount,
  getCurrentResourceStaked,
  getDelegatingResources,
  handleSetMaxAmount,
  handleResourceTypeChange,
  
  // 资源相关方法
  formatResource,
  calculateEstimatedResource,
  loadAccountBalance,
  
  // 提交相关方法
  handleSubmit,
  handleTransactionConfirm,
  handleTransactionReject,
  
  // 确认弹窗状态
  showTransactionConfirm,
  transactionData,
  
  // 成功弹窗状态和方法
  showSuccessModal,
  successData,
  hideSuccessModal,
  handleViewTransaction
} = useUnstakeModal(props)

// 成功处理 - 包装emit
const handleSuccess = () => {
  emit('success')
}

// 重写handleTransactionConfirm以包含成功处理
const handleTransactionConfirmWithSuccess = async (data: any) => {
  try {
    await handleTransactionConfirm(data)
    handleSuccess()
  } catch (error) {
    // 错误已经在 handleTransactionConfirm 中处理
    console.error('解锁确认处理失败:', error)
  }
}

// 组件挂载时加载数据
onMounted(() => {
  console.log('🚀 [UnstakeModal] 组件挂载，开始加载数据')
  loadAccountBalance()
})
</script>
