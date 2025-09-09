<template>
  <!-- 使用简化的配置组件 -->
  <SimplifiedTransactionConfig
    :config="config"
    :saving="saving"
    :onToggle="onToggle"
    :onSave="onSave"
  />
</template>

<script setup lang="ts">
import type { ConfigCardProps } from '../types';
import SimplifiedTransactionConfig from './TransactionPackage/SimplifiedTransactionConfig.vue';

/**
 * 组件接口定义 - 保持与原组件完全一致
 */
const props = defineProps<ConfigCardProps>()
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}
</style>
