<!--
  StakeOverview 重构版本 - 兼容层
  保持与原有接口的兼容性，内部委托给新的模块化结构
-->
<script setup lang="ts">
import StakeOverviewComponent from './StakeOverview/StakeOverview.vue';
import type { StakeOverviewProps, StakeOverviewEmits } from './StakeOverview/types/index.js';

// Props和Events定义
const props = defineProps<StakeOverviewProps>();
const emit = defineEmits<StakeOverviewEmits>();
</script>

<template>
  <StakeOverviewComponent 
    v-bind="props"
    @switchAccount="emit('switchAccount')"
    @toggleNetworkSwitcher="emit('toggleNetworkSwitcher')"
  />
</template>
