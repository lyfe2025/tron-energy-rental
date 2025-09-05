<!--
  机器人表单页面
  
  注意：此文件已经过模块化重构，原始内容已备份到 BotForm.vue.backup
  实际的组件现在分布在 BotForm/ 目录下的不同模块中：
  - components/BasicInfoSection.vue - 基本信息表单区域
  - components/NetworkConfigSection.vue - 网络配置表单区域
  - components/AdvancedSettingsSection.vue - 高级设置表单区域
  - composables/useBotFormValidation.ts - 表单验证逻辑
  - composables/useBotFormActions.ts - 表单操作逻辑
-->

<script setup lang="ts">
// 直接导入并重新导出分离后的模块化组件
import BotFormComponent from './BotForm/index.vue';
</script>

<template>
  <BotFormComponent />
</template>
