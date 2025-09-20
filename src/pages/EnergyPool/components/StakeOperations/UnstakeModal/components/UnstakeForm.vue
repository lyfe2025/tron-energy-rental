<!--
  解锁表单主组件
-->
<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <!-- 解质押说明 -->
    <UnstakeExplanation :unlock-period-text="unlockPeriodText" />

    <!-- 代理中资源显示 -->
    <UnstakeDelegatingResources
      v-if="accountBalance"
      :delegating-amount="getDelegatingResources(accountBalance)"
      :energy-delegated-out="accountBalance.energyDelegatedOut"
      :bandwidth-delegated-out="accountBalance.bandwidthDelegatedOut"
      :format-trx-amount="formatTrxAmount"
    />

    <!-- 待提取解锁资源显示 -->
    <UnstakeWithdrawableResources
      :withdrawable-amount="withdrawableAmount"
      :format-trx-amount="formatTrxAmount"
    />

    <!-- 资源类型选择 -->
    <UnstakeResourceSelector
      :model-value="form.resourceType"
      :energy-staked="getCurrentResourceStaked('ENERGY')"
      :bandwidth-staked="getCurrentResourceStaked('BANDWIDTH')"
      @update:resource-type="$emit('updateResourceType', $event)"
    />

    <!-- 解质押金额 -->
    <UnstakeAmountInput
      v-model="form.amount"
      :available-amount="getCurrentResourceStaked(form.resourceType)"
      :disabled="loading"
      :validate-number-input="validateNumberInput"
      @set-max="$emit('setMax')"
    />

    <!-- 账户信息 -->
    <UnstakeAccountInfo :account-address="accountAddress" />

    <!-- 解质押预览 -->
    <UnstakePreview
      :amount="form.amount"
      :resource-type="form.resourceType"
      :estimated-resource="calculateEstimatedResource(form.amount, form.resourceType)"
      :unlock-period-text="unlockPeriodText"
      :format-resource="formatResource"
    />

    <!-- 错误提示 -->
    <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-600">{{ error }}</p>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { ResourceType, UnstakeAccountBalance, UnstakeFormData } from '../types'
import UnstakeAccountInfo from './UnstakeAccountInfo.vue'
import UnstakeAmountInput from './UnstakeAmountInput.vue'
import UnstakeDelegatingResources from './UnstakeDelegatingResources.vue'
import UnstakeExplanation from './UnstakeExplanation.vue'
import UnstakePreview from './UnstakePreview.vue'
import UnstakeResourceSelector from './UnstakeResourceSelector.vue'
import UnstakeWithdrawableResources from './UnstakeWithdrawableResources.vue'

interface Props {
  form: UnstakeFormData
  accountBalance: UnstakeAccountBalance | null
  withdrawableAmount: number
  accountAddress?: string
  unlockPeriodText?: string
  loading: boolean
  error: string
  
  // 方法
  validateNumberInput: (event: Event, callback: (value: string) => void) => void
  formatTrxAmount: (amount: number) => string
  getCurrentResourceStaked: (resourceType: ResourceType) => string
  getDelegatingResources: (accountBalance: UnstakeAccountBalance | null) => number
  calculateEstimatedResource: (amount: string, resourceType: ResourceType) => number
  formatResource: (amount: number, resourceType: ResourceType) => string
}

interface Emits {
  submit: []
  updateResourceType: [resourceType: ResourceType]
  setMax: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>
