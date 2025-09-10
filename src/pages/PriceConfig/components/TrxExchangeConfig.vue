<template>
  <!-- 使用分离后的组件以保持功能完全一致 -->
  <TrxExchangeIndex v-bind="$props" />
</template>

<script setup lang="ts">
import TrxExchangeIndex from '../TrxExchange/index.vue';
import type { ConfigCardProps } from '../types';

defineProps<ConfigCardProps>()
</script>