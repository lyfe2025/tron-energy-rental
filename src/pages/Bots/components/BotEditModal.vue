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
            :modelValue="basicInfo"
            @update:modelValue="handleBasicInfoUpdate"
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
              
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  健康状态
                </label>
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2">
                      <span 
                        :class="healthCheckResult ? getHealthStatusColor(healthCheckResult.status) : getHealthStatusColor(botData?.health_status)"
                        class="px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {{ healthCheckResult ? getHealthStatusText(healthCheckResult.status) : getHealthStatusText(botData?.health_status) }}
                      </span>
                      <span class="text-sm text-gray-500">
                        {{ healthCheckResult ? formatTime(healthCheckResult.last_check) : (formatTime(botData?.last_health_check) || '未检查') }}
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
                  
                  <!-- 健康检查详细信息 -->
                  <div v-if="showHealthDetails && healthCheckResult" class="mt-3 p-4 bg-gray-50 rounded-lg border">
                    <div class="space-y-2">
                      <div class="flex items-center gap-2">
                        <div 
                          class="w-2 h-2 rounded-full"
                          :class="healthCheckResult.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'"
                        ></div>
                        <span class="text-sm font-medium text-gray-900">
                          检查结果：{{ healthCheckResult.status === 'healthy' ? '正常' : '异常' }}
                        </span>
                      </div>
                      
                      <div v-if="healthCheckResult.details" class="text-xs text-gray-600 space-y-1">
                        <div>工作模式：{{ healthCheckResult.details.work_mode === 'webhook' ? 'Webhook' : 'Polling' }}</div>
                        <div>检查类型：{{ 
                          healthCheckResult.details.check_type === 'webhook_connectivity' ? 'Webhook连接检查' :
                          healthCheckResult.details.check_type === 'telegram_api' ? 'Telegram API检查' :
                          healthCheckResult.details.check_type === 'local_validation' ? '本地配置验证' :
                          healthCheckResult.details.check_type === 'api_request_failed' ? 'API请求失败' :
                          healthCheckResult.details.check_type === 'network_error' ? '网络错误' : '未知检查类型'
                        }}</div>
                        <div v-if="healthCheckResult.details.environment">运行环境：{{ 
                          healthCheckResult.details.environment === 'local' ? '本地开发' : '生产环境'
                        }}</div>
                        <div v-if="healthCheckResult.details.webhook_url">Webhook地址：{{ healthCheckResult.details.webhook_url }}</div>
                        <div v-if="healthCheckResult.response_time_ms">响应时间：{{ healthCheckResult.response_time_ms }}ms</div>
                      </div>
                      
                      <!-- 错误信息显示 -->
                      <div v-if="healthCheckResult.status !== 'healthy' && healthCheckResult.error_message" class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <div class="flex items-start gap-2">
                          <div class="w-4 h-4 text-red-500 mt-0.5">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                            </svg>
                          </div>
                          <div class="flex-1">
                            <div class="text-sm font-medium text-red-800">检查失败原因</div>
                            <div class="text-sm text-red-700 mt-1">{{ healthCheckResult.error_message }}</div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 成功信息显示 -->
                      <div v-if="healthCheckResult.status === 'healthy'" class="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <div class="flex items-center gap-2">
                          <div class="w-4 h-4 text-green-500">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                          </div>
                          <span class="text-sm font-medium text-green-800">机器人工作正常</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
            :modelValue="webhookConfig"
            @update:modelValue="handleWebhookConfigUpdate"
            :work-mode="formData.work_mode"
            mode="edit"
            :bot-data="botData"
          />

          <!-- 命令配置 -->
          <div class="space-y-4 border-t pt-6">
            <BotFormMessages
              :modelValue="messageConfig"
              @update:modelValue="handleMessageConfigUpdate"
              mode="edit"
            />
          </div>

          <!-- 菜单按钮配置 -->
          <div class="space-y-4 border-t pt-6">
            <BotFormMenuButtons
              :modelValue="menuButtonConfig"
              @update:modelValue="handleMenuButtonConfigUpdate"
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
      <div class="flex justify-end items-center px-6 py-4 border-t bg-gray-50">
        <!-- 操作按钮 -->
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
import { botsAPI } from '@/services/api/bots/botsAPI'
import { ElMessage } from 'element-plus'
import { Activity, Loader2, X } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { BotData } from '../composables/useBotFormShared'
import { formatTime, getHealthStatusColor, getHealthStatusText, useBotForm } from '../composables/useBotFormShared'
import BotFormBasicInfo from './BotFormBasicInfo.vue'
import BotFormMenuButtons from './BotFormMenuButtons.vue'
import BotFormMessages from './BotFormMessages.vue'
import BotFormWebhookConfig from './BotFormWebhookConfig.vue'
import BotFormWorkMode from './BotFormWorkMode.vue'
import KeyboardConfigEditor from './KeyboardConfigEditor.vue'
import ManualSyncDialog from './ManualSyncDialog.vue'

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

// 使用共享表单逻辑
const { 
  formData, 
  priceConfigsStatus, 
  isFormValid, 
  fetchPriceConfigsStatus, 
  initializeFormData, 
  resetForm,
  applyModeChange 
} = useBotForm('edit')

// 响应式数据
const saving = ref(false)
const healthChecking = ref(false)
const originalMode = ref<'polling' | 'webhook'>('polling')
// 健康检查结果状态
const healthCheckResult = ref<any>(null)
const showHealthDetails = ref(false)
// 手动同步对话框状态
const showManualSyncDialog = ref(false)

// 计算属性：基础信息（只读，避免递归更新）
const basicInfo = computed(() => ({
  name: formData.name,
  username: formData.username,
  token: formData.token,
  description: formData.description,
  short_description: formData.short_description
}))

// 防止更新循环的标记
let isUpdating = false

// 基础信息更新处理函数
const handleBasicInfoUpdate = (updatedInfo: any) => {
  if (isUpdating) return
  
  try {
    isUpdating = true
    
    // 只更新实际发生变化的字段
    const fieldsToUpdate: any = {}
    
    if (formData.name !== updatedInfo.name) fieldsToUpdate.name = updatedInfo.name
    if (formData.username !== updatedInfo.username) fieldsToUpdate.username = updatedInfo.username
    if (formData.token !== updatedInfo.token) fieldsToUpdate.token = updatedInfo.token
    if (formData.description !== updatedInfo.description) fieldsToUpdate.description = updatedInfo.description
    if (formData.short_description !== updatedInfo.short_description) fieldsToUpdate.short_description = updatedInfo.short_description
    
    // 只在有变化时才更新
    if (Object.keys(fieldsToUpdate).length > 0) {
      Object.assign(formData, fieldsToUpdate)
    }
  } finally {
    // 延迟重置标记，确保更新完全完成
    nextTick(() => {
      isUpdating = false
    })
  }
}

// 计算属性：Webhook配置（只读，避免递归更新）
const webhookConfig = computed(() => ({
  webhook_url: formData.webhook_url,
  webhook_secret: formData.webhook_secret,
  max_connections: formData.max_connections
}))

// Webhook配置更新处理函数
const handleWebhookConfigUpdate = (updatedConfig: any) => {
  if (isUpdating) return
  
  try {
    isUpdating = true
    
    const fieldsToUpdate: any = {}
    
    if (formData.webhook_url !== updatedConfig.webhook_url) fieldsToUpdate.webhook_url = updatedConfig.webhook_url
    if (formData.webhook_secret !== updatedConfig.webhook_secret) fieldsToUpdate.webhook_secret = updatedConfig.webhook_secret
    if (formData.max_connections !== updatedConfig.max_connections) fieldsToUpdate.max_connections = updatedConfig.max_connections
    
    if (Object.keys(fieldsToUpdate).length > 0) {
      Object.assign(formData, fieldsToUpdate)
    }
  } finally {
    nextTick(() => {
      isUpdating = false
    })
  }
}

// 计算属性：消息配置（只读，避免递归更新）
const messageConfig = computed(() => ({
  welcome_message: formData.welcome_message,
  help_message: formData.help_message,
  custom_commands: formData.custom_commands || [],
  is_active: formData.is_active
}))

// 消息配置更新处理函数
const handleMessageConfigUpdate = (updatedConfig: any) => {
  if (isUpdating) return
  
  try {
    isUpdating = true
    
    const fieldsToUpdate: any = {}
    
    if (formData.welcome_message !== updatedConfig.welcome_message) fieldsToUpdate.welcome_message = updatedConfig.welcome_message
    if (formData.help_message !== updatedConfig.help_message) fieldsToUpdate.help_message = updatedConfig.help_message
    if (formData.is_active !== updatedConfig.is_active) fieldsToUpdate.is_active = updatedConfig.is_active
    
    // 特殊处理数组类型
    const currentCommands = JSON.stringify(formData.custom_commands || [])
    const newCommands = JSON.stringify(updatedConfig.custom_commands || [])
    if (currentCommands !== newCommands) fieldsToUpdate.custom_commands = updatedConfig.custom_commands || []
    
    if (Object.keys(fieldsToUpdate).length > 0) {
      Object.assign(formData, fieldsToUpdate)
    }
  } finally {
    nextTick(() => {
      isUpdating = false
    })
  }
}

// 计算属性：菜单按钮配置（只读，避免递归更新）
const menuButtonConfig = computed(() => ({
  is_enabled: formData.menu_button_enabled || false,
  button_text: formData.menu_button_text || '菜单',
  menu_type: formData.menu_type || 'commands',
  web_app_url: formData.web_app_url || '',
  commands: formData.menu_commands || []
}))

// 菜单按钮配置更新处理函数
const handleMenuButtonConfigUpdate = (updatedConfig: any) => {
  if (isUpdating) return
  
  try {
    isUpdating = true
    
    const fieldsToUpdate: any = {}
    
    if (formData.menu_button_enabled !== updatedConfig.is_enabled) fieldsToUpdate.menu_button_enabled = updatedConfig.is_enabled
    if (formData.menu_button_text !== updatedConfig.button_text) fieldsToUpdate.menu_button_text = updatedConfig.button_text
    if (formData.menu_type !== updatedConfig.menu_type) fieldsToUpdate.menu_type = updatedConfig.menu_type
    if (formData.web_app_url !== updatedConfig.web_app_url) fieldsToUpdate.web_app_url = updatedConfig.web_app_url
    
    // 特殊处理数组类型
    const currentCommands = JSON.stringify(formData.menu_commands || [])
    const newCommands = JSON.stringify(updatedConfig.commands || [])
    if (currentCommands !== newCommands) fieldsToUpdate.menu_commands = updatedConfig.commands || []
    
    if (Object.keys(fieldsToUpdate).length > 0) {
      Object.assign(formData, fieldsToUpdate)
    }
  } finally {
    nextTick(() => {
      isUpdating = false
    })
  }
}

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

// 手动同步成功处理
const handleSyncSuccess = () => {
  showManualSyncDialog.value = false
  ElMessage.success('同步操作已完成！')
  // 触发父组件刷新数据
  emit('refresh')
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
    showHealthDetails.value = false
    healthCheckResult.value = null
    console.log('开始健康检查:', props.botData.id)
    
    const response = await botsAPI.performHealthCheck(props.botData.id)
    const result = response.data
    
    // 保存健康检查结果
    if (result?.success && result?.data) {
      healthCheckResult.value = result.data
      showHealthDetails.value = true
      console.log('健康检查结果:', result.data)
      
      if ((result.data as any).status === 'healthy') {
        ElMessage.success('健康检查通过')
      } else {
        ElMessage.warning(`健康检查发现问题`)
      }
      
      // 触发父组件刷新数据以获取最新的健康状态
      emit('refresh')
    } else {
      ElMessage.error(`健康检查失败：${result?.message || '未知错误'}`)
      
      // 即使失败也显示错误信息
      healthCheckResult.value = {
        status: 'unhealthy',
        error_message: result?.message || '健康检查请求失败',
        last_check: new Date().toISOString(),
        details: {
          work_mode: props.botData?.work_mode || 'unknown',
          check_type: 'api_request_failed'
        }
      }
      showHealthDetails.value = true
    }
    
  } catch (error: any) {
    console.error('健康检查失败:', error)
    
    // 根据错误类型显示不同的提示信息
    let errorMessage = '未知错误'
    
    if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
      errorMessage = '健康检查超时，这可能是网络问题或服务器响应较慢。请稍后重试。'
    } else if (error.friendlyMessage) {
      errorMessage = error.friendlyMessage
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    ElMessage.error(`健康检查失败：${errorMessage}`)
    
    // 保存错误信息用于显示
    healthCheckResult.value = {
      status: 'unhealthy',
      error_message: errorMessage,
      last_check: new Date().toISOString(),
      details: {
        work_mode: props.botData?.work_mode || 'unknown',
        check_type: 'network_error'
      }
    }
    showHealthDetails.value = true
    
  } finally {
    healthChecking.value = false
  }
}

// 监听变化 - 优化避免递归更新
watch(() => props.visible, async (newValue, oldValue) => {
  // 避免重复处理
  if (newValue === oldValue) return
  
  if (newValue && props.botData) {
    console.log('🔄 弹窗打开，准备初始化数据...')
    
    // 重置更新标记，确保可以进行初始化
    isUpdating = false
    
    // 使用 nextTick 确保DOM更新完成
    await nextTick()
    
    // 初始化数据
    initializeFormData(props.botData)
    originalMode.value = props.botData.work_mode || 'polling'
    
    // 延迟调用避免和其他响应式更新冲突
    setTimeout(() => {
      fetchPriceConfigsStatus()
    }, 100)
  } else if (!newValue) {
    console.log('🔄 弹窗关闭，重置表单...')
    isUpdating = false
    resetForm()
  }
})

watch(() => props.botData, async (newBotData, oldBotData) => {
  // 避免重复处理
  if (newBotData === oldBotData) return
  
  if (props.visible && newBotData) {
    console.log('🔄 机器人数据变化，重新初始化...')
    
    // 重置更新标记，确保可以进行初始化
    isUpdating = false
    
    // 使用 nextTick 确保DOM更新完成
    await nextTick()
    
    initializeFormData(newBotData)
    originalMode.value = newBotData.work_mode || 'polling'
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
