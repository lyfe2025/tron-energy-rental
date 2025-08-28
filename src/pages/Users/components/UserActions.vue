<template>
  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
      <!-- 选中信息 -->
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">
          已选中 <span class="font-medium text-indigo-600">{{ selectedCount }}</span> 个用户
        </span>
        <button
          v-if="selectedCount > 0"
          @click="$emit('clear-selection')"
          class="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          清除选择
        </button>
      </div>
      
      <!-- 批量操作按钮 -->
      <div class="flex items-center space-x-2">
        <button
          @click="$emit('batch-activate')"
          :disabled="selectedCount === 0 || isLoading"
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle class="h-4 w-4 mr-1" />
          批量启用
        </button>
        
        <button
          @click="$emit('batch-deactivate')"
          :disabled="selectedCount === 0 || isLoading"
          class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle class="h-4 w-4 mr-1" />
          批量停用
        </button>
        
        <button
          @click="$emit('batch-export')"
          :disabled="selectedCount === 0 || isLoading"
          class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download class="h-4 w-4 mr-1" />
          导出选中
        </button>
        
        <div class="relative">
          <button
            @click="showMoreActions = !showMoreActions"
            :disabled="selectedCount === 0 || isLoading"
            class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MoreHorizontal class="h-4 w-4 mr-1" />
            更多操作
            <ChevronDown class="h-4 w-4 ml-1" />
          </button>
          
          <!-- 更多操作下拉菜单 -->
          <div 
            v-if="showMoreActions && selectedCount > 0"
            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
          >
            <div class="py-1">
              <button
                @click="handleBatchTypeChange('telegram_user')"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User class="h-4 w-4 mr-2 inline" />
                设为Telegram用户
              </button>
              <button
                @click="handleBatchTypeChange('agent')"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Crown class="h-4 w-4 mr-2 inline" />
                设为代理商
              </button>
              <button
                @click="handleBatchTypeChange('admin')"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Key class="h-4 w-4 mr-2 inline" />
                设为管理员
              </button>
              <button
                @click="$emit('batch-reset-password')"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Key class="h-4 w-4 mr-2 inline" />
                批量重置密码
              </button>
              <button
                @click="$emit('batch-send-notification')"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Bell class="h-4 w-4 mr-2 inline" />
                发送通知
              </button>
              <div class="border-t border-gray-100 my-1"></div>
              <button
                @click="$emit('batch-delete')"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <Trash2 class="h-4 w-4 mr-2 inline" />
                批量删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 批量操作确认对话框 -->
    <div 
      v-if="showConfirmDialog"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="cancelConfirm"
    >
      <div 
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
        @click.stop
      >
        <div class="mt-3 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <AlertTriangle class="h-6 w-6 text-yellow-600" />
          </div>
          <h3 class="text-lg leading-6 font-medium text-gray-900 mt-4">
            确认批量操作
          </h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500">
              {{ confirmMessage }}
            </p>
          </div>
          <div class="flex justify-center space-x-3 mt-4">
            <button
              @click="cancelConfirm"
              class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              取消
            </button>
            <button
              @click="confirmAction"
              :disabled="isLoading"
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2 inline" />
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  Crown,
  Download,
  Key,
  Loader2,
  MoreHorizontal,
  Trash2,
  User,
  XCircle
} from 'lucide-vue-next'

interface Props {
  selectedCount: number
  isLoading: boolean
}

interface Emits {
  'clear-selection': []
  'batch-activate': []
  'batch-deactivate': []
  'batch-export': []
  'batch-type-change': [type: string]
  'batch-reset-password': []
  'batch-send-notification': []
  'batch-delete': []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态管理
const showMoreActions = ref(false)
const showConfirmDialog = ref(false)
const confirmMessage = ref('')
const pendingAction = ref<string | null>(null)

// 处理批量类型变更
const handleBatchTypeChange = (type: string) => {
  showMoreActions.value = false
  emit('batch-type-change', type)
}

// 显示确认对话框
const showConfirm = (message: string, action: string) => {
  confirmMessage.value = message
  pendingAction.value = action
  showConfirmDialog.value = true
}

// 确认操作
const confirmAction = () => {
  if (pendingAction.value) {
    emit(pendingAction.value as any)
  }
  showConfirmDialog.value = false
  pendingAction.value = null
}

// 取消确认
const cancelConfirm = () => {
  showConfirmDialog.value = false
  pendingAction.value = null
}

// 点击外部关闭更多操作菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showMoreActions.value = false
  }
}

// 监听点击外部事件
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>