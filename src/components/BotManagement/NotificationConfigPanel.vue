<template>
  <!-- ✅ 代理组件 - 调用分离后的功能 -->
  <NotificationConfig :bot-id="botId" />
</template>

<style scoped>
/* 现代化标签页样式 */
.notification-tabs-modern :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 0 24px;
}

.notification-tabs-modern :deep(.el-tabs__nav-wrap) {
  padding: 0;
}

.notification-tabs-modern :deep(.el-tabs__nav) {
  border: none;
}

.notification-tabs-modern :deep(.el-tabs__item) {
  border: none !important;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  padding: 16px 24px;
  margin-right: 8px;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s ease;
}

.notification-tabs-modern :deep(.el-tabs__item:hover) {
  color: #3b82f6;
  background: #eff6ff;
}

.notification-tabs-modern :deep(.el-tabs__item.is-active) {
  color: #3b82f6 !important;
  background: #ffffff;
  border-bottom: 2px solid #3b82f6 !important;
  margin-bottom: -1px;
}

.notification-tabs-modern :deep(.el-tabs__active-bar) {
  display: none;
}

.notification-tabs-modern :deep(.el-tabs__content) {
  padding: 0;
  border: none;
}

.notification-tabs-modern :deep(.el-tab-pane) {
  background: transparent;
  padding: 24px;
}

/* 按钮样式优化 */
.notification-config-panel :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.notification-config-panel :deep(.el-button--primary) {
  background: #3b82f6;
  border-color: #3b82f6;
}

.notification-config-panel :deep(.el-button--primary:hover) {
  background: #2563eb;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* 开关样式 */
.notification-config-panel :deep(.el-switch.is-checked .el-switch__core) {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

/* 简化卡片效果 */
.notification-config-panel .bg-white {
  box-shadow: none;
  border: 1px solid #f3f4f6;
}

.notification-config-panel .bg-white:hover {
  border-color: #e5e7eb;
  transition: border-color 0.2s ease;
}

/* 渐变背景 */
.bg-gradient-to-r {
  background: linear-gradient(to right, #eff6ff, #e0e7ff);
}

.bg-gradient-to-br {
  background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
}

/* 响应式优化 */
@media (max-width: 640px) {
  .notification-config-panel {
    padding: 16px;
  }
  
  .notification-tabs-modern :deep(.el-tabs__header) {
    padding: 0 16px;
  }
  
  .notification-tabs-modern :deep(.el-tabs__item) {
    padding: 12px 16px;
    margin-right: 4px;
    font-size: 14px;
  }
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 状态指示器 */
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}

.status-indicator.active {
  background-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-indicator.inactive {
  background-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}
</style>

<script setup lang="ts">
import NotificationConfig from './NotificationConfig/index.vue';

// 接口类型定义
interface Props {
  botId: string
}

defineProps<Props>()
</script>

<!-- ✅ 代理组件样式已移至分离后的组件中 -->
