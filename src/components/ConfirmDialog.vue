<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="handleBackdrop"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-md w-full"
      @click.stop
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center">
          <component
            :is="iconComponent"
            :class="[
              'w-6 h-6 mr-3',
              iconColor
            ]"
          />
          <h3 class="text-lg font-medium text-gray-900">
            {{ title }}
          </h3>
        </div>
        <button
          @click="handleCancel"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6">
        <p class="text-gray-600 leading-relaxed">
          {{ message }}
        </p>
        
        <!-- 详细信息 -->
        <div v-if="details" class="mt-4 p-3 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-700">
            {{ details }}
          </p>
        </div>

        <!-- 警告信息 -->
        <div v-if="warning" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start">
            <AlertTriangle class="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-sm text-yellow-800">
              {{ warning }}
            </p>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
        <button
          @click="handleCancel"
          :disabled="loading"
          class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          :disabled="loading"
          :class="[
            'px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center',
            confirmButtonClass
          ]"
        >
          <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {{ loading ? loadingText : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Ban
} from 'lucide-vue-next';

type DialogType = 'info' | 'success' | 'warning' | 'danger';

interface Props {
  visible: boolean;
  type?: DialogType;
  title: string;
  message: string;
  details?: string;
  warning?: string;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  loading?: boolean;
}

interface Emits {
  confirm: [];
  cancel: [];
  close: [];
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  confirmText: '确认',
  cancelText: '取消',
  loadingText: '处理中...',
  loading: false
});

const emit = defineEmits<Emits>();

// 计算属性
const iconComponent = computed(() => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    danger: AlertCircle
  };
  return icons[props.type];
});

const iconColor = computed(() => {
  const colors = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };
  return colors[props.type];
});

const confirmButtonClass = computed(() => {
  const classes = {
    info: 'bg-blue-600 text-white hover:bg-blue-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  return classes[props.type];
});

// 事件处理
const handleConfirm = () => {
  if (!props.loading) {
    emit('confirm');
  }
};

const handleCancel = () => {
  if (!props.loading) {
    emit('cancel');
    emit('close');
  }
};

const handleBackdrop = (event: Event) => {
  if (event.target === event.currentTarget && !props.loading) {
    handleCancel();
  }
};
</script>