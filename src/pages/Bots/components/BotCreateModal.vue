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
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-4">
              <Bot class="w-5 h-5 text-blue-600" />
              <h4 class="text-lg font-semibold text-gray-900">基础信息</h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  机器人名称 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入机器人名称"
                  maxlength="50"
                />
                <div class="text-right text-xs text-gray-500 mt-1">{{ formData.name.length }}/50</div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  用户名 <span class="text-red-500">*</span>
                </label>
                <div class="flex">
                  <span class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-lg">@</span>
                  <input
                    v-model="formData.username"
                    type="text"
                    required
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入机器人用户名"
                    maxlength="50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Bot Token <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="formData.token"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="输入从 @BotFather 获取的 Bot Token"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                描述信息
              </label>
              <textarea
                v-model="formData.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入机器人描述信息（可选）"
                maxlength="200"
              ></textarea>
              <div class="text-right text-xs text-gray-500 mt-1">{{ formData.description.length }}/200</div>
            </div>
          </div>

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

          <!-- 高级设置 -->
          <div class="space-y-4 border-t pt-6">
            <div class="flex items-center gap-2 mb-4">
              <Settings class="w-5 h-5 text-purple-600" />
              <h4 class="text-lg font-semibold text-gray-900">高级设置</h4>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                v-model="formData.webhook_url"
                type="url"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入 Webhook URL（可选）"
              />
              <p class="text-xs text-gray-500 mt-1">Telegram将向此URL发送消息更新，用于接收用户消息和命令</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  欢迎消息
                </label>
                <textarea
                  v-model="formData.welcome_message"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入用户首次使用机器人时的欢迎消息"
                  maxlength="500"
                ></textarea>
                <div class="text-right text-xs text-gray-500 mt-1">{{ formData.welcome_message.length }}/500</div>
                <p class="text-xs text-gray-500 mt-1">用户首次使用 /start 命令时显示的消息</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  帮助消息
                </label>
                <textarea
                  v-model="formData.help_message"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入 /help 命令的回复内容"
                  maxlength="500"
                ></textarea>
                <div class="text-right text-xs text-gray-500 mt-1">{{ formData.help_message.length }}/500</div>
                <p class="text-xs text-gray-500 mt-1">用户使用 /help 命令时显示的消息</p>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                启用状态
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
import { Bot, Eye, EyeOff, Loader2, Network, Settings, X } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'

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

// 响应式数据
const saving = ref(false)
const showPassword = ref(false)

// 表单数据
const formData = reactive({
  name: '',
  username: '',
  token: '',
  description: '',
  network_id: '',
  webhook_url: '',
  welcome_message: '欢迎使用TRON能量租赁机器人！🚀',
  help_message: '这里是帮助信息，您可以通过以下命令使用机器人...',
  is_active: true
})

// 表单验证
const isFormValid = computed(() => {
  return !!(
    formData.name.trim() &&
    formData.username.trim() &&
    formData.token.trim() &&
    formData.name.length >= 2 &&
    formData.name.length <= 50 &&
    formData.username.length >= 5 &&
    formData.username.length <= 32 &&
    /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$/.test(formData.username) &&
    /^\d+:[a-zA-Z0-9_-]+$/.test(formData.token)
  )
})

// 网络选择处理
const handleNetworkChange = (network: TronNetwork | null) => {
  console.log('🔍 [BotCreateModal] 网络变化:', network)
  if (network) {
    formData.network_id = network.id
  } else {
    formData.network_id = ''
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    username: '',
    token: '',
    description: '',
    network_id: '',
    webhook_url: '',
    welcome_message: '欢迎使用TRON能量租赁机器人！🚀',
    help_message: '这里是帮助信息，您可以通过以下命令使用机器人...',
    is_active: true
  })
  
  showPassword.value = false
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
  if (!newValue) {
    resetForm()
  }
})
</script>
