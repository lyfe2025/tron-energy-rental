<!--
  安全分离后的Stake组件重定向文件
  保持原有路由完全不变，确保外部调用兼容性
-->
<template>
  <StakeIndex />
</template>

<script setup lang="ts">
import StakeIndex from './Stake/index.vue';
</script>
