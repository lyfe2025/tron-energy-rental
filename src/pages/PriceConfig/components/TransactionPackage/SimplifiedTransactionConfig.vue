<template>
  <!-- 使用分离后的组件以保持功能完全一致 -->
  <SimplifiedConfigIndex v-bind="$props" />
</template>

<script setup lang="ts">
import SimplifiedConfigIndex from '../../TransactionPackage/SimplifiedConfig/index.vue';
import type { ConfigCardProps } from '../../types';

defineProps<ConfigCardProps>()
</script>