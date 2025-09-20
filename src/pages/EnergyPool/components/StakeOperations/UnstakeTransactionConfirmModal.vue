<!--
  TRON解锁交易确认弹窗组件 - 分离后的版本
  导入分离的UnstakeTransactionConfirmModal结构，保持原有API兼容性
-->
<template>
  <UnstakeTransactionConfirmModalComponent
    :transaction-data="transactionData"
    :network-params="networkParams"
    :estimated-resource="estimatedResource"
    :account-name="accountName"
    @confirm="$emit('confirm', $event)"
    @reject="$emit('reject')"
  />
</template>

<script setup lang="ts">
import UnstakeTransactionConfirmModalComponent from './UnstakeTransactionConfirmModal/index.vue';
import type {
    UnstakeTransactionConfirmEmits,
    UnstakeTransactionConfirmProps
} from './UnstakeTransactionConfirmModal/types';

defineProps<UnstakeTransactionConfirmProps>()
defineEmits<UnstakeTransactionConfirmEmits>()

// 导出类型以保持向后兼容
export type { UnstakeTransactionData } from './UnstakeTransactionConfirmModal/types';
</script>
