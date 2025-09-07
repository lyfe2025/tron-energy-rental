<!--
  后端服务状态模态框
  当后端服务不可用时显示友好提示
-->
<template>
  <Teleport to="body">
    <div v-if="visible" class="backend-status-modal-overlay">
      <div class="backend-status-modal">
        <!-- 标题栏 -->
        <div class="modal-header">
          <div class="header-content">
            <div class="status-icon">
              <ServerIcon 
                :class="[
                  'w-6 h-6',
                  status === 'checking' ? 'text-yellow-500 animate-spin' : 
                  status === 'available' ? 'text-green-500' : 'text-red-500'
                ]" 
              />
            </div>
            <div class="header-text">
              <h3 class="modal-title">
                {{ getStatusTitle() }}
              </h3>
              <p class="modal-subtitle">
                {{ getStatusSubtitle() }}
              </p>
            </div>
          </div>
          
          <!-- 关闭按钮（仅在服务可用时显示） -->
          <button
            v-if="status === 'available' && dismissible"
            @click="$emit('close')"
            class="close-button"
            aria-label="关闭"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <!-- 状态详情 -->
        <div class="modal-body">
          <!-- 服务不可用状态 -->
          <div v-if="status === 'unavailable'" class="status-content">
            <div class="error-details">
              <AlertTriangle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div class="error-text">
                <p class="error-message">{{ errorMessage || '无法连接到后端服务' }}</p>
                <p class="error-description">
                  这通常是由以下原因造成的：
                </p>
                <ul class="error-causes">
                  <li>后端服务未启动</li>
                  <li>网络连接问题</li>
                  <li>服务器暂时不可用</li>
                </ul>
              </div>
            </div>
            
            <!-- 解决方案建议 -->
            <div class="solution-suggestions">
              <h4 class="suggestions-title">建议解决方案：</h4>
              <div class="suggestions-list">
                <div class="suggestion-item">
                  <Terminal class="w-4 h-4 text-blue-500" />
                  <span>检查后端服务是否运行在端口 3001</span>
                </div>
                <div class="suggestion-item">
                  <RefreshCw class="w-4 h-4 text-blue-500" />
                  <span>尝试重启后端服务：<code>npm run restart</code></span>
                </div>
                <div class="suggestion-item">
                  <Wifi class="w-4 h-4 text-blue-500" />
                  <span>检查网络连接是否正常</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 检查中状态 -->
          <div v-else-if="status === 'checking'" class="status-content">
            <div class="checking-content">
              <div class="spinner-container">
                <div class="spinner"></div>
              </div>
              <p class="checking-text">正在检查后端服务状态...</p>
              <p class="checking-detail">请稍候，这可能需要几秒钟</p>
            </div>
          </div>
          
          <!-- 服务可用状态 -->
          <div v-else-if="status === 'available'" class="status-content">
            <div class="success-content">
              <CheckCircle class="w-8 h-8 text-green-500 mx-auto" />
              <p class="success-text">后端服务连接成功！</p>
              <p class="success-detail">
                响应时间: {{ responseTime ? `${responseTime}ms` : 'N/A' }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="modal-footer">
          <div class="button-group">
            <!-- 重试按钮 -->
            <button
              v-if="status === 'unavailable'"
              @click="$emit('retry')"
              :disabled="retrying"
              class="retry-button"
            >
              <RefreshCw :class="['w-4 h-4 mr-2', { 'animate-spin': retrying }]" />
              {{ retrying ? '检查中...' : '重试连接' }}
            </button>
            
            <!-- 继续使用按钮（离线模式） -->
            <button
              v-if="status === 'unavailable' && allowOfflineMode"
              @click="$emit('continue-offline')"
              class="offline-button"
            >
              <AlertCircle class="w-4 h-4 mr-2" />
              离线模式
            </button>
            
            <!-- 确定按钮 -->
            <button
              v-if="status === 'available'"
              @click="$emit('close')"
              class="confirm-button"
            >
              <Check class="w-4 h-4 mr-2" />
              确定
            </button>
          </div>
        </div>
        
        <!-- 状态指示器 -->
        <div class="status-indicator">
          <div class="indicator-item">
            <div :class="['indicator-dot', getIndicatorClass('backend')]"></div>
            <span class="indicator-label">后端服务</span>
          </div>
          <div class="indicator-item">
            <div :class="['indicator-dot', getIndicatorClass('network')]"></div>
            <span class="indicator-label">网络连接</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  RefreshCw,
  ServerIcon,
  Terminal,
  Wifi,
  X
} from 'lucide-vue-next';

export interface Props {
  visible: boolean;
  status: 'checking' | 'available' | 'unavailable';
  errorMessage?: string;
  responseTime?: number;
  retrying?: boolean;
  dismissible?: boolean;
  allowOfflineMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  status: 'checking',
  retrying: false,
  dismissible: true,
  allowOfflineMode: false
});

defineEmits<{
  close: [];
  retry: [];
  'continue-offline': [];
}>();

function getStatusTitle(): string {
  switch (props.status) {
    case 'checking':
      return '检查服务状态';
    case 'available':
      return '服务连接正常';
    case 'unavailable':
      return '后端服务不可用';
    default:
      return '服务状态检查';
  }
}

function getStatusSubtitle(): string {
  switch (props.status) {
    case 'checking':
      return '正在检测后端服务连接...';
    case 'available':
      return '所有服务运行正常，您可以正常使用系统';
    case 'unavailable':
      return '无法连接到后端服务，部分功能可能无法使用';
    default:
      return '';
  }
}

function getIndicatorClass(type: 'backend' | 'network'): string {
  if (props.status === 'checking') {
    return 'indicator-checking';
  } else if (props.status === 'available') {
    return 'indicator-success';
  } else {
    return 'indicator-error';
  }
}
</script>

<style scoped>
.backend-status-modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
  backdrop-filter: blur(4px);
}

.backend-status-modal {
  @apply bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden;
  max-height: 90vh;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.header-content {
  @apply flex items-center space-x-3;
}

.status-icon {
  @apply flex-shrink-0;
}

.header-text {
  @apply flex-1;
}

.modal-title {
  @apply text-lg font-semibold text-gray-900;
}

.modal-subtitle {
  @apply text-sm text-gray-600 mt-1;
}

.close-button {
  @apply p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors;
}

.modal-body {
  @apply p-6;
}

.status-content {
  @apply space-y-4;
}

.error-details {
  @apply flex space-x-3 p-4 bg-red-50 rounded-lg;
}

.error-text {
  @apply flex-1;
}

.error-message {
  @apply font-medium text-red-800 mb-2;
}

.error-description {
  @apply text-red-700 text-sm mb-2;
}

.error-causes {
  @apply list-disc list-inside text-red-600 text-sm space-y-1 ml-4;
}

.solution-suggestions {
  @apply bg-blue-50 rounded-lg p-4;
}

.suggestions-title {
  @apply font-medium text-blue-800 mb-3;
}

.suggestions-list {
  @apply space-y-2;
}

.suggestion-item {
  @apply flex items-center space-x-2 text-blue-700 text-sm;
}

.suggestion-item code {
  @apply bg-blue-100 px-2 py-1 rounded text-xs font-mono;
}

.checking-content {
  @apply text-center space-y-4;
}

.spinner-container {
  @apply flex justify-center;
}

.spinner {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin;
}

.checking-text {
  @apply text-gray-800 font-medium;
}

.checking-detail {
  @apply text-gray-600 text-sm;
}

.success-content {
  @apply text-center space-y-3;
}

.success-text {
  @apply text-green-800 font-medium;
}

.success-detail {
  @apply text-green-600 text-sm;
}

.modal-footer {
  @apply px-6 pb-6;
}

.button-group {
  @apply flex space-x-3;
}

.retry-button {
  @apply flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.offline-button {
  @apply flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors;
}

.confirm-button {
  @apply flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors;
}

.status-indicator {
  @apply flex justify-center space-x-6 px-6 pb-4;
}

.indicator-item {
  @apply flex items-center space-x-2;
}

.indicator-dot {
  @apply w-3 h-3 rounded-full;
}

.indicator-label {
  @apply text-xs text-gray-600;
}

.indicator-success {
  @apply bg-green-500;
}

.indicator-error {
  @apply bg-red-500;
}

.indicator-checking {
  @apply bg-yellow-500 animate-pulse;
}

/* 过渡动画 */
.backend-status-modal-overlay {
  animation: fadeIn 0.3s ease-out;
}

.backend-status-modal {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
