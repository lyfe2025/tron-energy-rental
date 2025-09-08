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
                    disabled
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    placeholder="输入机器人用户名"
                    maxlength="50"
                  />
                </div>
                <div class="text-gray-500 text-xs mt-1">用户名创建后不可修改</div>
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
              </div>
            </div>
          </div>

          <!-- 高级设置 -->
          <div class="space-y-4 border-t pt-6">
            <div class="flex items-center gap-2 mb-4">
              <Settings class="w-5 h-5 text-purple-600" />
              <h4 class="text-lg font-semibold text-gray-900">高级设置</h4>
            </div>
            
            <!-- 工作模式选择 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">
                工作模式
              </label>
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div
                  @click="formData.work_mode = 'polling'"
                  :class="[
                    'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                    formData.work_mode === 'polling'
                      ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  ]"
                >
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <input
                        :checked="formData.work_mode === 'polling'"
                        name="work_mode"
                        type="radio"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <div class="ml-3">
                      <div class="flex items-center gap-2">
                        <Activity class="w-4 h-4 text-blue-600" />
                        <span class="block text-sm font-medium text-gray-900">Polling 轮询</span>
                      </div>
                      <div class="block text-xs text-gray-500 mt-1">
                        机器人主动轮询获取消息，适合开发环境
                      </div>
                      <div class="flex items-center gap-4 mt-2 text-xs">
                        <span class="flex items-center gap-1 text-green-600">
                          <CheckCircle class="w-3 h-3" />
                          本地开发
                        </span>
                        <span class="flex items-center gap-1 text-green-600">
                          <CheckCircle class="w-3 h-3" />
                          简单配置
                        </span>
                        <span class="flex items-center gap-1 text-amber-600">
                          <AlertCircle class="w-3 h-3" />
                          资源消耗
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  @click="formData.work_mode = 'webhook'"
                  :class="[
                    'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
                    formData.work_mode === 'webhook'
                      ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  ]"
                >
                  <div class="flex items-center">
                    <div class="flex-shrink-0">
                      <input
                        :checked="formData.work_mode === 'webhook'"
                        name="work_mode"
                        type="radio"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <div class="ml-3">
                      <div class="flex items-center gap-2">
                        <Globe class="w-4 h-4 text-blue-600" />
                        <span class="block text-sm font-medium text-gray-900">Webhook 推送</span>
                      </div>
                      <div class="block text-xs text-gray-500 mt-1">
                        Telegram主动推送消息，适合生产环境
                      </div>
                      <div class="flex items-center gap-4 mt-2 text-xs">
                        <span class="flex items-center gap-1 text-green-600">
                          <CheckCircle class="w-3 h-3" />
                          高性能
                        </span>
                        <span class="flex items-center gap-1 text-green-600">
                          <CheckCircle class="w-3 h-3" />
                          实时性
                        </span>
                        <span class="flex items-center gap-1 text-amber-600">
                          <AlertCircle class="w-3 h-3" />
                          需HTTPS
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 当前模式状态显示 -->
              <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                  <Settings class="w-4 h-4 text-gray-600" />
                  <span class="text-sm font-medium text-gray-800">当前运行模式状态</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span 
                      :class="[
                        'px-2 py-1 rounded-full text-xs font-medium',
                        botData?.work_mode === 'webhook' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      ]"
                    >
                      {{ botData?.work_mode === 'webhook' ? 'Webhook 模式' : 'Polling 模式' }}
                    </span>
                    <span class="text-xs text-gray-500">
                      {{ formatTime(botData?.updated_at) }}
                    </span>
                  </div>
                  <button
                    type="button"
                    @click="applyModeChange"
                    :disabled="!hasChangedMode"
                    class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ hasChangedMode ? '应用切换' : '无变化' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Webhook配置 -->
            <div v-if="formData.work_mode === 'webhook'" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.webhook_url"
                  type="url"
                  :required="formData.work_mode === 'webhook'"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://your-domain.com/api/telegram/webhook"
                />
                <p class="text-xs text-gray-500 mt-1">
                  必须是HTTPS地址，Telegram将向此URL发送消息更新
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Secret Token
                </label>
                <input
                  v-model="formData.webhook_secret"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="可选的安全验证Token"
                  maxlength="256"
                />
                <p class="text-xs text-gray-500 mt-1">
                  用于验证请求来源的密钥，建议填写以增强安全性
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  最大并发连接数
                </label>
                <select
                  v-model="formData.max_connections"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="10">10 - 测试环境（1-100用户）</option>
                  <option value="20">20 - 小型应用（100-500用户）</option>
                  <option value="40">40 - 推荐配置（500-2000用户）</option>
                  <option value="60">60 - 活跃机器人（2000-5000用户）</option>
                  <option value="80">80 - 大型应用（5000-10000用户）</option>
                  <option value="100">100 - 最大值（10000+用户）</option>
                </select>
                
                <!-- 详细说明 -->
                <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div class="flex items-start gap-2">
                    <Info class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div class="text-sm text-blue-800">
                      <div class="font-medium mb-1">什么是并发连接数？</div>
                      <div class="text-blue-700 space-y-1">
                        <div>• <strong>不是用户数量限制</strong>：机器人可以服务无限数量的用户</div>
                        <div>• <strong>是技术连接数</strong>：Telegram服务器同时向您服务器发送HTTP请求的数量</div>
                        <div>• <strong>影响响应速度</strong>：连接数越高，处理消息越快，但消耗服务器资源更多</div>
                        <div>• <strong>可随时调整</strong>：根据机器人使用情况和服务器性能优化</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Webhook状态检查 -->
              <div v-if="botData?.work_mode === 'webhook'" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <Globe class="w-4 h-4 text-yellow-600" />
                    <span class="text-sm font-medium text-yellow-800">Webhook 状态检查</span>
                  </div>
                  <button
                    type="button"
                    @click="checkWebhookStatus"
                    :disabled="checking"
                    class="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    {{ checking ? '检查中...' : '检查状态' }}
                  </button>
                </div>
                <div v-if="webhookStatus" class="text-xs text-yellow-700">
                  <div>URL: {{ webhookStatus.url || '未配置' }}</div>
                  <div>状态: {{ webhookStatus.last_error_message || '正常' }}</div>
                  <div>待处理消息: {{ webhookStatus.pending_update_count || 0 }} 条</div>
                </div>
              </div>

              <!-- Webhook配置提示 -->
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div class="flex items-start gap-2">
                  <AlertTriangle class="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div class="text-sm text-amber-800">
                    <div class="font-medium mb-2">Webhook 模式技术要求：</div>
                    <ul class="list-disc list-inside space-y-1 text-amber-700">
                      <li>服务器必须具有有效的SSL证书</li>
                      <li>URL必须使用HTTPS协议</li>
                      <li>端口必须是 443、80、88、8443 之一</li>
                      <li>服务器必须在30秒内响应Telegram请求</li>
                    </ul>
                    <div class="mt-2 pt-2 border-t border-amber-300">
                      <div class="font-medium text-amber-800">性能优势：</div>
                      <div class="text-amber-700 text-xs mt-1">
                        • 实时消息推送，无延迟  • 节省服务器资源，无需轮询  • 适合生产环境和高并发场景
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Polling配置说明 -->
            <div v-else class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-start gap-2">
                <Info class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div class="text-sm text-blue-800">
                  <div class="font-medium mb-2">Polling 模式特点：</div>
                  <div class="text-blue-700 space-y-1">
                    <div>• <strong>简单易用</strong>：无需HTTPS域名和SSL证书配置</div>
                    <div>• <strong>开发友好</strong>：适合本地开发和测试环境</div>
                    <div>• <strong>稳定可靠</strong>：网络故障时自动重连，故障恢复能力强</div>
                  </div>
                  <div class="mt-2 pt-2 border-t border-blue-300">
                    <div class="font-medium text-blue-800">性能说明：</div>
                    <div class="text-blue-700 text-xs mt-1">
                      • 消息延迟1-3秒（轮询间隔）  • 适合中小型机器人（&lt;5000用户）  • 服务器会持续轮询消耗资源
                    </div>
                  </div>
                </div>
              </div>
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
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Activity, AlertCircle, AlertTriangle, Bot, CheckCircle, Eye, EyeOff,
  Globe, Info, Loader2, Settings, X
} from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'

// Props
interface BotData {
  id: string
  name: string
  username: string
  token?: string
  description?: string
  work_mode?: 'polling' | 'webhook'
  webhook_url?: string
  webhook_secret?: string
  max_connections?: number
  welcome_message?: string
  help_message?: string
  status: string
  health_status?: string
  last_health_check?: string
  total_users?: number
  total_orders?: number
  created_at: string
  updated_at: string
}

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

// 响应式数据
const saving = ref(false)
const showPassword = ref(false)
const checking = ref(false)
const webhookStatus = ref<any>(null)
const originalMode = ref<'polling' | 'webhook'>('polling')

// 表单数据
const formData = reactive({
  name: '',
  username: '',
  token: '',
  description: '',
  work_mode: 'polling' as 'polling' | 'webhook',
  webhook_url: '',
  webhook_secret: '',
  max_connections: 40,
  welcome_message: '',
  help_message: '',
  is_active: true
})

// 表单验证
const isFormValid = computed(() => {
  const basicValid = !!(
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
  
  // 如果选择webhook模式，需要验证webhook_url
  if (formData.work_mode === 'webhook') {
    return basicValid && !!(formData.webhook_url.trim() && isValidWebhookUrl(formData.webhook_url))
  }
  
  return basicValid
})

// Webhook URL验证
const isValidWebhookUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname !== 'localhost'
  } catch {
    return false
  }
}

// 检查是否修改了工作模式
const hasChangedMode = computed(() => {
  return formData.work_mode !== originalMode.value
})

// 工具函数
const getHealthStatusColor = (status?: string) => {
  switch (status) {
    case 'healthy': 
      return 'bg-green-100 text-green-800'
    case 'unhealthy': 
      return 'bg-yellow-100 text-yellow-800'
    case 'error': 
      return 'bg-red-100 text-red-800'
    default: 
      return 'bg-gray-100 text-gray-800'
  }
}

const getHealthStatusText = (status?: string) => {
  switch (status) {
    case 'healthy': return '健康'
    case 'unhealthy': return '异常'
    case 'error': return '错误'
    default: return '未知'
  }
}

const formatTime = (timeString?: string) => {
  if (!timeString) return ''
  
  try {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN')
  } catch {
    return timeString
  }
}

// 初始化表单数据
const initializeFormData = () => {
  if (!props.botData) return
  
  const bot = props.botData
  originalMode.value = bot.work_mode || 'polling'
  
  Object.assign(formData, {
    name: bot.name || '',
    username: bot.username || '',
    token: bot.token || '',
    description: bot.description || '',
    work_mode: bot.work_mode || 'polling',
    webhook_url: bot.webhook_url || '',
    webhook_secret: bot.webhook_secret || '',
    max_connections: bot.max_connections || 40,
    welcome_message: bot.welcome_message || '',
    help_message: bot.help_message || '',
    is_active: bot.status === 'active'
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    username: '',
    token: '',
    description: '',
    work_mode: 'polling',
    webhook_url: '',
    webhook_secret: '',
    max_connections: 40,
    welcome_message: '',
    help_message: '',
    is_active: true
  })
  
  showPassword.value = false
  checking.value = false
  webhookStatus.value = null
  originalMode.value = 'polling'
}

// 应用模式切换
const applyModeChange = async () => {
  if (!hasChangedMode.value || !props.botData) return
  
  try {
    saving.value = true
    
    // 这里会调用后端API来切换模式
    const response = await fetch(`/api/bots/${props.botData.id}/switch-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        work_mode: formData.work_mode,
        webhook_url: formData.work_mode === 'webhook' ? formData.webhook_url : null,
        webhook_secret: formData.work_mode === 'webhook' ? formData.webhook_secret : null,
        max_connections: formData.work_mode === 'webhook' ? formData.max_connections : null
      })
    })
    
    if (response.ok) {
      originalMode.value = formData.work_mode
      alert(`✅ 已成功切换到 ${formData.work_mode === 'webhook' ? 'Webhook' : 'Polling'} 模式`)
    } else {
      const error = await response.json()
      alert(`❌ 模式切换失败: ${error.message}`)
    }
  } catch (error) {
    console.error('模式切换失败:', error)
    alert('❌ 模式切换失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 检查Webhook状态
const checkWebhookStatus = async () => {
  if (!props.botData) return
  
  try {
    checking.value = true
    webhookStatus.value = null
    
    const response = await fetch(`/api/bots/${props.botData.id}/webhook-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      webhookStatus.value = result.data.webhook_info
    } else {
      console.error('获取webhook状态失败')
    }
  } catch (error) {
    console.error('检查webhook状态失败:', error)
  } finally {
    checking.value = false
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

// 监听变化
watch(() => props.visible, (newValue) => {
  if (newValue && props.botData) {
    initializeFormData()
  } else if (!newValue) {
    resetForm()
  }
})

watch(() => props.botData, () => {
  if (props.visible && props.botData) {
    initializeFormData()
  }
})
</script>
