<!--
 * 手动同步对话框（重构版）
 * 职责：协调各个子组件，提供手动同步Telegram机器人设置的完整界面
-->
<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          手动同步到Telegram
        </h3>
        <button
          @click="handleXButtonClick"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6">
        <!-- 说明文字 -->
        <div v-if="!syncing && !syncResult" class="space-y-6">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <Info class="w-5 h-5 text-blue-600 mt-0.5" />
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">同步说明</p>
                <p>选择要同步到Telegram的设置项。只有勾选的项目会被同步，未选择的项目保持当前状态。</p>
                <p class="mt-1 text-blue-700">⚠️ 同步操作需要有效的Bot Token，请确保Token正确。</p>
              </div>
            </div>
          </div>

          <!-- 同步选项表单 -->
          <SyncOptionsForm
            :sync-options="syncOptions"
            :current-form-data="currentFormData"
            :selected-count="selectedCount"
            @select-all="selectAll"
            @select-none="selectNone"
          />
        </div>

        <!-- 同步进行中 -->
        <SyncProgress
          v-else-if="syncing"
          :sync-logs="syncLogs"
        />

        <!-- 同步结果 -->
        <SyncResults
          v-else-if="syncResult"
          :sync-result="syncResult"
          :sync-logs="syncLogs"
          :show-full-logs="showFullLogs"
          @toggle-logs="showFullLogs = !showFullLogs"
        />
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end items-center px-6 py-4 border-t bg-gray-50">
        <div class="flex gap-3">
          <button
            v-if="!syncing && !syncResult"
            type="button"
            @click="handleCancel"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            v-if="!syncing && !syncResult"
            type="button"
            @click="handleStartSync"
            :disabled="selectedCount === 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Activity class="w-4 h-4" />
            开始同步
          </button>
          <button
            v-if="syncResult && !syncResult.success"
            type="button"
            @click="handleRetry"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RotateCcw class="w-4 h-4" />
            重试
          </button>
          <button
            v-if="syncResult"
            type="button"
            @click="handleClose"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Info,
  RotateCcw,
  X
} from 'lucide-vue-next'
import { computed, watch } from 'vue'

// 组件和类型导入
import { SyncOptionsForm, SyncProgress, SyncResults } from './components'
import { useSyncOptions, useSyncProcess } from './composables'
import type { ManualSyncDialogEmits, ManualSyncDialogProps } from './types/sync.types'

// Props 和 Emits
const props = defineProps<ManualSyncDialogProps>()
const emit = defineEmits<ManualSyncDialogEmits>()


// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 组合式函数 - 传递响应式的计算属性
const {
  syncOptions,
  selectedCount,
  selectAll,
  selectNone,
  resetOptions
} = useSyncOptions(computed(() => props.currentFormData))

const {
  syncing,
  syncLogs,
  syncResult,
  showFullLogs,
  resetState,
  startSync,
  retrySync
} = useSyncProcess()

// 事件处理函数
const handleStartSync = async () => {
  await startSync(props.botData, syncOptions, props.currentFormData, selectedCount.value)
}

const handleRetry = () => {
  retrySync(props.botData, syncOptions, props.currentFormData, selectedCount.value)
}

// 取消操作 - 不触发成功事件
const handleCancel = () => {
  emit('update:modelValue', false)
  
  // 延迟重置状态
  setTimeout(() => {
    resetState()
    resetOptions()
  }, 100)
}

// 关闭对话框 - 只有在同步完成后才触发成功事件
const handleClose = () => {
  emit('update:modelValue', false)
  
  // 只有当同步结果存在时才触发成功事件
  if (syncResult.value) {
    emit('sync-success', syncResult.value)
  }
  
  // 延迟重置状态，确保用户能看到最终结果
  setTimeout(() => {
    resetState()
    resetOptions()
  }, 100)
}

// 处理X按钮点击
const handleXButtonClick = () => {
  // 如果有同步结果，调用关闭；否则调用取消
  if (syncResult.value) {
    handleClose()
  } else {
    handleCancel()
  }
}

// 监听对话框打开，重置状态
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetState()
    resetOptions()
  }
})
</script>

<style scoped>
/* 样式保持简洁，依赖Tailwind CSS */
</style>
