<!--
 * 编辑机器人弹窗
 * 职责：提供机器人编辑的弹窗表单
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

      <!-- Modal Content -->
      <div class="p-6">
        <form @submit.prevent="handleSave" class="space-y-6">
          <!-- 基础信息 -->
          <BotFormBasicInfo
            v-model="basicInfo"
            mode="edit"
          />

          <!-- 状态信息 -->
          <div class="space-y-4 border-t pt-6">
            <div class="flex items-center gap-2 mb-4">
              <Activity class="w-5 h-5 text-green-600" />
              <h4 class="text-lg font-semibold text-gray-900">状态信息</h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  当前状态
                </label>
                <div class="flex items-center">
                  <button
                    type="button"
                    @click="formData.is_active = !formData.is_active"
                    :class="[
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      formData.is_active ? 'bg-blue-600' : 'bg-gray-200'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        formData.is_active ? 'translate-x-6' : 'translate-x-1'
                      ]"
                    />
                  </button>
                  <span class="ml-3 text-sm text-gray-700">
                    {{ formData.is_active ? '启用' : '禁用' }}
                  </span>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  健康状态
                </label>
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span 
                      :class="getHealthStatusColor(botData?.health_status)"
                      class="px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {{ getHealthStatusText(botData?.health_status) }}
                    </span>
                    <span class="text-sm text-gray-500">
                      {{ formatTime(botData?.last_health_check) || '未检查' }}
                    </span>
                  </div>
                  <button
                    @click="handleHealthCheck"
                    :disabled="healthChecking || !botData?.id"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="检查机器人健康状态"
                  >
                    <Loader2 v-if="healthChecking" :size="12" class="animate-spin" />
                    <Activity v-else :size="12" />
                    {{ healthChecking ? '检查中...' : '立即检查' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 工作模式选择 -->
          <BotFormWorkMode
            v-model="formData.work_mode"
            mode="edit"
            :bot-data="botData"
            :original-mode="originalMode"
            @applyModeChange="handleApplyModeChange"
          />

          <!-- Webhook配置 -->
          <BotFormWebhookConfig
            v-model="webhookConfig"
            :work-mode="formData.work_mode"
            mode="edit"
            :bot-data="botData"
          />

          <!-- 命令配置 -->
          <div class="space-y-4 border-t pt-6">
            <BotFormMessages
              v-model="messageConfig"
              mode="edit"
            />
          </div>

          <!-- 菜单按钮配置 -->
          <div class="space-y-4 border-t pt-6">
            <BotFormMenuButtons
              v-model="menuButtonConfig"
            />
          </div>

          <!-- 键盘配置 -->
          <div class="space-y-4 border-t pt-6">
            <KeyboardConfigEditor 
              v-model="formData.keyboard_config"
              :price-configs="priceConfigsStatus"
            />
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
        <!-- 左侧同步按钮 -->
        <button
          type="button"
          @click="handleSyncFromTelegram"
          :disabled="syncing || !props.botData"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="syncing" class="w-4 h-4 animate-spin" />
          <Activity v-else class="w-4 h-4" />
          {{ syncing ? '同步中...' : '从Telegram同步' }}
        </button>
        
        <!-- 右侧操作按钮 -->
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessage } from 'element-plus'
import { Activity, Loader2, X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import type { BotData } from '../composables/useBotFormShared'
import { formatTime, getHealthStatusColor, getHealthStatusText, useBotForm } from '../composables/useBotFormShared'
import BotFormBasicInfo from './BotFormBasicInfo.vue'
import BotFormMenuButtons from './BotFormMenuButtons.vue'
import BotFormMessages from './BotFormMessages.vue'
import BotFormWebhookConfig from './BotFormWebhookConfig.vue'
import BotFormWorkMode from './BotFormWorkMode.vue'
import KeyboardConfigEditor from './KeyboardConfigEditor.vue'

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
}>()

// 使用共享表单逻辑
const { 
  formData, 
  priceConfigsStatus, 
  isFormValid, 
  fetchPriceConfigsStatus, 
  initializeFormData, 
  resetForm,
  syncFromTelegram,
  applyModeChange 
} = useBotForm('edit')

// 响应式数据
const saving = ref(false)
const syncing = ref(false)
const healthChecking = ref(false)
const originalMode = ref<'polling' | 'webhook'>('polling')

// 计算属性：基础信息
const basicInfo = computed({
  get: () => ({
    name: formData.name,
    username: formData.username,
    token: formData.token,
    description: formData.description,
    short_description: formData.short_description
  }),
  set: (value) => {
    formData.name = value.name
    formData.username = value.username
    formData.token = value.token
    formData.description = value.description
    formData.short_description = value.short_description
  }
})

// 计算属性：Webhook配置
const webhookConfig = computed({
  get: () => ({
    webhook_url: formData.webhook_url,
    webhook_secret: formData.webhook_secret,
    max_connections: formData.max_connections
  }),
  set: (value) => {
    formData.webhook_url = value.webhook_url
    formData.webhook_secret = value.webhook_secret
    formData.max_connections = value.max_connections
  }
})

// 计算属性：消息配置（现在是命令配置）
const messageConfig = computed({
  get: () => ({
    welcome_message: formData.welcome_message,
    help_message: formData.help_message,
    custom_commands: formData.custom_commands || []
  }),
  set: (value) => {
    formData.welcome_message = value.welcome_message
    formData.help_message = value.help_message
    formData.custom_commands = value.custom_commands || []
  }
})

// 计算属性：菜单按钮配置
const menuButtonConfig = computed({
  get: () => ({
    is_enabled: formData.menu_button_enabled || false,
    button_text: formData.menu_button_text || '菜单',
    menu_type: formData.menu_type || 'commands',
    web_app_url: formData.web_app_url || '',
    commands: formData.menu_commands || []
  }),
  set: (value) => {
    formData.menu_button_enabled = value.is_enabled
    formData.menu_button_text = value.button_text
    formData.menu_type = value.menu_type
    formData.web_app_url = value.web_app_url
    formData.menu_commands = value.commands
  }
})

// 应用模式切换处理
const handleApplyModeChange = async () => {
  if (!props.botData) return
  
  try {
    saving.value = true
    const result = await applyModeChange(props.botData.id, originalMode.value)
    
    if (result.success) {
      originalMode.value = result.mode
      ElMessage.success(`✅ 已成功切换到 ${result.mode === 'webhook' ? 'Webhook' : 'Polling'} 模式`)
    }
  } catch (error: any) {
    console.error('模式切换失败:', error)
    ElMessage.error(`❌ 模式切换失败: ${error.message}`)
  } finally {
    saving.value = false
  }
}

// 从Telegram同步机器人信息
const handleSyncFromTelegram = async () => {
  if (!props.botData) return
  
  try {
    syncing.value = true
    const result = await syncFromTelegram(props.botData.id)
    
    if (result.success) {
      ElMessage.success('同步成功！机器人信息已更新')
      
      // 触发父组件刷新数据
      emit('save', {
        id: props.botData.id,
        ...formData,
        status: formData.is_active ? 'active' : 'inactive'
      })
    }
  } catch (error: any) {
    console.error('同步失败:', error)
    ElMessage.error(`同步失败：${error.message}`)
  } finally {
    syncing.value = false
  }
}

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
  resetForm()
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

// 健康检查处理
const handleHealthCheck = async () => {
  if (!props.botData?.id || healthChecking.value) {
    return
  }
  
  try {
    healthChecking.value = true
    console.log('开始健康检查:', props.botData.id)
    
    await botsAPI.performHealthCheck(props.botData.id)
    ElMessage.success('健康检查已触发，正在检查中...')
    
    // 触发父组件刷新数据以获取最新的健康状态
    setTimeout(() => {
      emit('save', {
        id: props.botData!.id,
        ...formData,
        status: formData.is_active ? 'active' : 'inactive'
      })
    }, 2000) // 2秒后刷新，给后端时间完成检查
    
  } catch (error: any) {
    console.error('健康检查失败:', error)
    ElMessage.error(`健康检查失败：${error.message || '未知错误'}`)
  } finally {
    healthChecking.value = false
  }
}

// 监听变化
watch(() => props.visible, (newValue) => {
  if (newValue && props.botData) {
    initializeFormData(props.botData)
    originalMode.value = props.botData.work_mode || 'polling'
    fetchPriceConfigsStatus()
  } else if (!newValue) {
    resetForm()
  }
})

watch(() => props.botData, () => {
  if (props.visible && props.botData) {
    initializeFormData(props.botData)
    originalMode.value = props.botData.work_mode || 'polling'
  }
})

// 组件挂载时获取价格配置状态
onMounted(() => {
  fetchPriceConfigsStatus()
})
</script>
