<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="handleCancel"></div>
      
      <!-- 对话框 -->
      <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- 图标和标题 -->
        <div class="flex items-center gap-4 mb-4">
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="getIconBgClass()"
          >
            <component :is="getIconComponent()" class="w-6 h-6" :class="getIconColorClass()" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-medium text-gray-900">
              {{ title }}
            </h3>
          </div>
        </div>
        
        <!-- 消息内容 -->
        <div class="mb-6">
          <p class="text-sm text-gray-600">
            {{ message }}
          </p>
        </div>
        
        <!-- 按钮 -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="handleCancel"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            @click="handleConfirm"
            :disabled="loading"
            class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            :class="getConfirmButtonClass()"
          >
            <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            {{ loading ? '处理中...' : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-vue-next'

// Props
interface Props {
  visible: boolean
  title: string
  message: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  confirmText: '确定',
  cancelText: '取消',
  loading: false
})

// Emits
interface Emits {
  confirm: []
  cancel: []
}

const emit = defineEmits<Emits>()

// 方法
const getIconComponent = () => {
  const icons = {
    warning: AlertTriangle,
    danger: XCircle,
    info: Info,
    success: CheckCircle
  }
  return icons[props.type]
}

const getIconBgClass = () => {
  const classes = {
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
    info: 'bg-blue-100',
    success: 'bg-green-100'
  }
  return classes[props.type]
}

const getIconColorClass = () => {
  const classes = {
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
    success: 'text-green-600'
  }
  return classes[props.type]
}

const getConfirmButtonClass = () => {
  const classes = {
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed',
    info: 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
  }
  return classes[props.type]
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>