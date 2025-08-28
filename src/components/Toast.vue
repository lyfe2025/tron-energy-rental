<!--
  Toast 通知组件
  用于显示操作成功、失败、警告等消息
-->
<template>
  <Teleport to="body">
    <div v-if="notifications.length > 0" class="toast-container">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'toast',
            `toast-${notification.type}`,
            { 'toast-dismissible': notification.dismissible }
          ]"
        >
          <div class="toast-content">
            <!-- 图标 -->
            <div class="toast-icon">
              <CheckCircle v-if="notification.type === 'success'" class="w-5 h-5" />
              <XCircle v-else-if="notification.type === 'error'" class="w-5 h-5" />
              <AlertTriangle v-else-if="notification.type === 'warning'" class="w-5 h-5" />
              <Info v-else class="w-5 h-5" />
            </div>
            
            <!-- 消息内容 -->
            <div class="toast-message">
              <div v-if="notification.title" class="toast-title">{{ notification.title }}</div>
              <div class="toast-text">{{ notification.message }}</div>
            </div>
            
            <!-- 关闭按钮 -->
            <button
              v-if="notification.dismissible"
              @click="dismiss(notification.id)"
              class="toast-close"
              aria-label="关闭通知"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          
          <!-- 进度条 -->
          <div
            v-if="notification.duration && notification.duration > 0"
            class="toast-progress"
            :style="{ 
              animationDuration: `${notification.duration}ms`,
              animationDelay: `${notification.delay || 0}ms`
            }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-vue-next';
import { useToast } from '../composables/useToast';

const { notifications, dismiss } = useToast()
</script>

<style scoped>
.toast-container {
  @apply fixed top-4 right-4 z-50 space-y-2;
  max-width: 420px;
}

.toast {
  @apply bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden;
  min-width: 300px;
}

.toast-success {
  @apply border-l-4 border-l-green-500;
}

.toast-error {
  @apply border-l-4 border-l-red-500;
}

.toast-warning {
  @apply border-l-4 border-l-yellow-500;
}

.toast-info {
  @apply border-l-4 border-l-blue-500;
}

.toast-content {
  @apply flex items-start p-4 gap-3;
}

.toast-icon {
  @apply flex-shrink-0 mt-0.5;
}

.toast-success .toast-icon {
  @apply text-green-500;
}

.toast-error .toast-icon {
  @apply text-red-500;
}

.toast-warning .toast-icon {
  @apply text-yellow-500;
}

.toast-info .toast-icon {
  @apply text-blue-500;
}

.toast-message {
  @apply flex-1 min-w-0;
}

.toast-title {
  @apply font-medium text-gray-900 text-sm mb-1;
}

.toast-text {
  @apply text-gray-600 text-sm;
}

.toast-close {
  @apply flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors;
}

.toast-progress {
  @apply h-1 bg-current opacity-30;
  animation: toast-progress linear;
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
