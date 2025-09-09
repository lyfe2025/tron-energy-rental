<!--
 * 创建机器人弹窗
 * 职责：提供机器人创建的弹窗表单
-->
<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          创建机器人
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
            mode="create"
            @verifyToken="handleTokenVerify"
          />

          <!-- 网络配置 -->
          <div class="space-y-4 border-t pt-6">
            <div class="flex items-center gap-2 mb-4">
              <Network class="w-5 h-5 text-green-600" />
              <h4 class="text-lg font-semibold text-gray-900">网络配置</h4>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                选择网络
              </label>
              <NetworkSelector
                v-model="formData.network_id"
                label=""
                description="每个机器人只能配置一个网络，创建后可以在机器人列表中修改"
                :searchable="true"
                :filter-active="true"
                :direct-selection="true"
                @change="handleNetworkChange"
              />
            </div>
          </div>

          <!-- 工作模式选择 -->
          <BotFormWorkMode
            v-model="formData.work_mode"
            mode="create"
          />

          <!-- Webhook配置 -->
          <BotFormWebhookConfig
            v-model="webhookConfig"
            :work-mode="formData.work_mode"
            mode="create"
          />

          <!-- 命令配置 -->
          <div class="space-y-4 border-t pt-6">
            <BotFormMessages
              v-model="messageConfig"
              mode="create"
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
      <div class="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
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
          {{ saving ? '创建中...' : '创建机器人' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NetworkSelector from '@/components/NetworkSelector.vue'
import type { TronNetwork } from '@/types/network'
import { Loader2, Network, X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useBotForm } from '../composables/useBotFormShared'
import BotFormBasicInfo from './BotFormBasicInfo.vue'
import BotFormMenuButtons from './BotFormMenuButtons.vue'
import BotFormMessages from './BotFormMessages.vue'
import BotFormWebhookConfig from './BotFormWebhookConfig.vue'
import BotFormWorkMode from './BotFormWorkMode.vue'
import KeyboardConfigEditor from './KeyboardConfigEditor.vue'

// Props
interface Props {
  visible: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'create': [data: any]
}>()

// 使用共享表单逻辑
const { formData, priceConfigsStatus, isFormValid, fetchPriceConfigsStatus, resetForm } = useBotForm('create')

// 响应式数据
const saving = ref(false)

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
    is_active: formData.is_active,
    custom_commands: formData.custom_commands || []
  }),
  set: (value) => {
    formData.welcome_message = value.welcome_message
    formData.help_message = value.help_message
    formData.custom_commands = value.custom_commands || []
    if (value.is_active !== undefined) {
      formData.is_active = value.is_active
    }
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

// Token验证处理
const handleTokenVerify = (token: string) => {
  console.log('Token验证成功:', token)
}

// 网络选择处理
const handleNetworkChange = (network: TronNetwork | null) => {
  console.log('🔍 [BotCreateModal] 网络变化:', network)
  if (network) {
    formData.network_id = network.id
  } else {
    formData.network_id = ''
  }
}

// 事件处理
const handleClose = () => {
  emit('update:visible', false)
  resetForm()
}

const handleSave = async () => {
  if (!isFormValid.value) {
    return
  }
  
  try {
    saving.value = true
    
    // 提交数据
    emit('create', { ...formData })
  } catch (error: any) {
    console.error('表单提交失败:', error)
  } finally {
    saving.value = false
  }
}

// 监听 visible 变化
watch(() => props.visible, (newValue) => {
  if (newValue) {
    fetchPriceConfigsStatus()
  } else {
    resetForm()
  }
})

// 组件挂载时获取价格配置状态
onMounted(() => {
  fetchPriceConfigsStatus()
})
</script>
