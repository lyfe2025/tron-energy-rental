<!--
 * 机器人编辑模态框 - 重构版
 * 职责：提供机器人编辑的模态框界面，集成各个标签页组件
-->
<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          编辑机器人
        </h3>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Modal Content with Tabs -->
      <div class="p-6">
        <!-- Tab Navigation -->
        <div class="flex space-x-1 mb-6 border-b">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
              activeTab === tab.id
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4 inline-block mr-2" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab Content -->
        <form @submit.prevent="handleSave" class="space-y-6">
          <!-- 基础信息标签页 -->
          <BasicInfoTab
            v-if="activeTab === 'basic'"
            :basic-info="basicInfo"
            :is-active="formData.is_active"
            :bot-data="botData"
            @update:basic-info="handleBasicInfoUpdate"
            @update:is-active="formData.is_active = $event"
            @refresh="$emit('refresh')"
          />

          <!-- Webhook配置标签页 -->
          <WebhookConfigTab
            v-if="activeTab === 'webhook'"
            :work-mode="formData.work_mode"
            :original-mode="originalMode"
            :webhook-config="webhookConfig"
            :bot-data="botData"
            @update:work-mode="formData.work_mode = $event"
            @update:webhook-config="handleWebhookConfigUpdate"
            @apply-mode-change="handleApplyModeChange"
          />

          <!-- 消息配置标签页 -->
          <MessageConfigTab
            v-if="activeTab === 'message'"
            :message-config="messageConfig"
            @update:message-config="handleMessageConfigUpdate"
          />

          <!-- 菜单按钮配置标签页 -->
          <MenuButtonTab
            v-if="activeTab === 'menu'"
            :menu-button-config="menuButtonConfig"
            :keyboard-config="formData.keyboard_config"
            :price-configs-status="priceConfigsStatus"
            @update:menu-button-config="handleMenuButtonConfigUpdate"
            @update:keyboard-config="formData.keyboard_config = $event"
          />
        </form>
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end items-center px-6 py-4 border-t bg-gray-50">
        <div class="flex gap-3">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleSave"
            :disabled="saving || !isFormValid"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            {{ saving ? '保存中...' : '保存修改' }}
          </button>
          <button
            type="button"
            @click="showManualSyncDialog = true"
            :disabled="saving || !props.botData"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Activity class="w-4 h-4" />
            手动同步
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 手动同步对话框 -->
  <ManualSyncDialog
    v-model="showManualSyncDialog"
    :bot-data="botData"
    :current-form-data="formData"
    @sync-success="handleSyncSuccess"
  />
</template>

<script setup lang="ts">
import { Activity, Info, Loader2, Menu, MessageSquare, Settings, X } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
import type { BotData } from '../../composables/useBotFormShared'
import { ManualSyncDialog } from '../ManualSyncDialog'
import { useBotEdit } from './composables/useBotEdit'
import { BasicInfoTab, MenuButtonTab, MessageConfigTab, WebhookConfigTab } from './tabs'

// Props
interface Props {
  visible: boolean
  botData?: BotData | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'save': [data: any]
  'refresh': []
}>()

// 使用机器人编辑逻辑
const {
  // 响应式数据
  formData,
  priceConfigsStatus,
  isFormValid,
  saving,
  originalMode,
  showManualSyncDialog,

  // 计算属性
  basicInfo,
  webhookConfig,
  messageConfig,
  menuButtonConfig,

  // 更新处理函数
  handleBasicInfoUpdate,
  handleWebhookConfigUpdate,
  handleMessageConfigUpdate,
  handleMenuButtonConfigUpdate,

  // 操作函数
  handleApplyModeChange: handleModeChange,
  handleSyncSuccess: handleSync,
  initializeForm,
  resetFormData,
  fetchPriceConfigsStatus
} = useBotEdit()

// 标签页状态
const activeTab = ref('basic')

// 标签页配置
const tabs = [
  { id: 'basic', label: '基础信息', icon: Info },
  { id: 'webhook', label: 'Webhook配置', icon: Settings },
  { id: 'message', label: '消息配置', icon: MessageSquare },
  { id: 'menu', label: '菜单按钮', icon: Menu }
]

// 应用模式切换处理
const handleApplyModeChange = async () => {
  await handleModeChange(props.botData, emit)
}

// 手动同步成功处理
const handleSyncSuccess = () => {
  handleSync(emit)
}

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
  resetFormData()
  activeTab.value = 'basic'
}

const handleSave = async () => {
  if (!props.botData || !isFormValid.value) {
    return
  }
  
  try {
    saving.value = true
    
    // 提交数据
    emit('save', {
      id: props.botData.id,
      ...formData,
      status: formData.is_active ? 'active' : 'inactive'
    })
  } catch (error: any) {
    console.error('表单提交失败:', error)
  } finally {
    saving.value = false
  }
}

// 监听变化 - 优化避免递归更新
watch(() => props.visible, async (newValue, oldValue) => {
  // 避免重复处理
  if (newValue === oldValue) return
  
  if (newValue && props.botData) {
    console.log('🔄 弹窗打开，准备初始化数据...')
    await initializeForm(props.botData)
  } else if (!newValue) {
    console.log('🔄 弹窗关闭，重置表单...')
    resetFormData()
    activeTab.value = 'basic'
  }
})

watch(() => props.botData, async (newBotData, oldBotData) => {
  // 避免重复处理
  if (newBotData === oldBotData) return
  
  if (props.visible && newBotData) {
    console.log('🔄 机器人数据变化，重新初始化...')
    await initializeForm(newBotData)
  }
}, { deep: false })

// 组件挂载时获取价格配置状态
onMounted(() => {
  // 延迟调用，避免和初始化冲突
  setTimeout(() => {
    fetchPriceConfigsStatus()
  }, 100)
})
</script>
