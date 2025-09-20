<!--
  TRON解锁交易确认弹窗 - 主入口组件
  分离后的版本，保持原有功能不变
-->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 头部 -->
      <TransactionHeader />

      <!-- 内容 -->
      <div class="p-6 space-y-6">
        <!-- 交易图标 -->
        <TransactionIcon />

        <!-- 交易详情 -->
        <TransactionDetails
          :transaction-data="transactionData"
          :network-params="networkParams"
          :account-name="accountName"
          :network-name="networkName"
          :truncate-address="truncateAddress"
        />

        <!-- 交易费用 -->
        <TransactionFees
          :transaction-data="transactionData"
          :network-params="networkParams"
          :estimated-resource="estimatedResource"
          :estimated-bandwidth-fee="estimatedBandwidthFee"
          :estimated-service-fee="estimatedServiceFee"
          :fee-state="feeState"
          :show-details="showDetails"
          :format-resource="formatResource"
          @retry-fees="retryFetchFees"
          @toggle-details="toggleDetails"
        />
      </div>

      <!-- 底部按钮 -->
      <TransactionActions
        :loading="loading"
        @confirm="handleConfirm"
        @reject="handleReject"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TransactionActions from './components/TransactionActions.vue'
import TransactionDetails from './components/TransactionDetails.vue'
import TransactionFees from './components/TransactionFees.vue'
import TransactionHeader from './components/TransactionHeader.vue'
import TransactionIcon from './components/TransactionIcon.vue'
import { useTransactionConfirm } from './composables'
import type {
    UnstakeTransactionConfirmEmits,
    UnstakeTransactionConfirmProps
} from './types'

const props = defineProps<UnstakeTransactionConfirmProps>()
const emit = defineEmits<UnstakeTransactionConfirmEmits>()

// 使用交易确认逻辑
const {
  // 状态
  loading,
  showDetails,
  
  // 费用相关
  feeState,
  estimatedBandwidthFee,
  estimatedServiceFee,
  retryFetchFees,
  
  // 计算属性
  networkName,
  
  // 方法
  truncateAddress,
  formatResource,
  toggleDetails,
  handleReject,
  handleConfirm
} = useTransactionConfirm(props, emit)
</script>
