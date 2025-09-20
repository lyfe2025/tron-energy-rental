<!--
  解质押TRX模态框组件 - 分离后的版本
  导入分离的UnstakeModal结构，保持原有API兼容性
-->
<template>
  <UnstakeModalComponent
    :pool-id="poolId"
    :account-id="accountId"
    :account-address="accountAddress"
    :account-name="accountName"
    @close="$emit('close')"
    @success="$emit('success')"
  />
</template>

<script setup lang="ts">
import UnstakeModalComponent from './UnstakeModal/index.vue';
import type { UnstakeOperationProps } from './UnstakeModal/types';

interface Emits {
  close: []
  success: []
}

defineProps<UnstakeOperationProps>()
defineEmits<Emits>()
</script>
