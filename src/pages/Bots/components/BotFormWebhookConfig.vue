<!--
 * Bot表单Webhook配置组件
 * 职责：提供Webhook模式的配置选项
-->
<template>
  <div v-if="workMode === 'webhook'" class="space-y-4 border-t pt-6">
    <div class="flex items-center gap-2 mb-4">
      <Globe class="w-5 h-5 text-purple-600" />
      <h4 class="text-lg font-semibold text-gray-900">🌐 Webhook 配置</h4>
      <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
        推送模式
      </span>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Webhook 基础URL <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <input
          v-model="displayWebhookUrl"
          type="url"
          :required="workMode === 'webhook'"
          class="w-full px-3 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://your-domain.com/api/telegram/webhook （路径固定，不可修改）"
        />
        <div class="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-gray-500 bg-gray-50 rounded-r-lg border-l">
          /bot_username
        </div>
      </div>
      <div class="mt-2 space-y-2">
        <!-- 简洁提示和详情按钮 -->
        <div class="p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="text-xs text-blue-700 flex items-center gap-2">
              <span>🔧 仅域名可自定义 • 路径必须是 /api/telegram/webhook • 系统自动添加机器人用户名</span>
            </div>
            <button
              type="button"
              @click="showUrlExplanation = !showUrlExplanation"
              class="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              <Info class="w-3 h-3" />
              {{ showUrlExplanation ? '收起' : '详情' }}
            </button>
          </div>
        </div>

        <!-- 折叠的详细说明 -->
        <div v-if="showUrlExplanation" class="space-y-2">
          <!-- URL格式要求 -->
          <div class="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <h5 class="text-sm font-medium text-purple-800 mb-2">📐 URL格式要求</h5>
            <div class="text-xs text-purple-700 space-y-2">
              <div class="font-medium">标准格式：</div>
                  <div class="bg-white p-2 rounded border font-mono text-xs">
                    <span class="text-green-600">https://您的域名.com</span><span class="text-red-600">/api/telegram/webhook</span><span class="text-blue-600">/bot_username</span>
                  </div>
              <div class="grid grid-cols-1 gap-2">
                <div class="flex items-start gap-2">
                  <span class="text-green-600 font-medium">✅ 可自定义部分：</span>
                  <div class="flex-1">
                    <div>• 域名：your-domain.com, api.example.com</div>
                    <div>• 子域名：bot.domain.com, webhook.site.com</div>
                    <div>• ngrok地址：abc123.ngrok-free.app</div>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-red-600 font-medium">❌ 固定不可变：</span>
                  <div class="flex-1">
                    <div>• API路径：必须是 /api/telegram/webhook</div>
                    <div>• 机器人用户名：系统自动添加，不可手动指定</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 配置示例 -->
          <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
            <h5 class="text-sm font-medium text-green-800 mb-2">💡 配置示例</h5>
            <div class="text-xs text-green-700 space-y-2">
              <div class="space-y-1">
                <div class="font-medium">正确示例：</div>
                <div class="bg-white p-2 rounded border space-y-1 font-mono text-xs">
                  <div><span class="text-gray-500">您输入：</span> https://your-domain.com/api/telegram/webhook</div>
                  <div><span class="text-gray-500">系统生成：</span> https://your-domain.com/api/telegram/webhook/<span class="text-blue-600">your_bot_username</span></div>
                </div>
              </div>
              <div class="space-y-1">
                <div class="font-medium text-red-600">错误示例：</div>
                <div class="bg-red-50 p-2 rounded border space-y-1 font-mono text-xs text-red-600">
                  <div>❌ https://domain.com/my-webhook-path</div>
                  <div>❌ https://domain.com/api/bot/webhook</div>
                  <div>❌ https://domain.com/webhook</div>
                </div>
              </div>
            </div>
          </div>

          <!-- URL自动处理机制 -->
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 URL自动处理机制</h5>
            <div class="text-xs text-blue-700 space-y-1">
              <p>• <strong>您只需填写基础URL</strong>：系统会自动添加机器人用户名避免冲突</p>
              <p>• <strong>防止多机器人冲突</strong>：每个机器人都有独立的接收地址</p>
              <p>• <strong>无需手动管理</strong>：创建后系统自动生成最终URL</p>
              <p>• <strong>路由自动识别</strong>：消息自动路由到对应的机器人实例</p>
            </div>
          </div>

          <!-- Telegram技术要求 -->
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <h5 class="text-sm font-medium text-amber-800 mb-2">⚠️ Telegram技术要求</h5>
            <div class="text-xs text-amber-700 space-y-1">
              <p>• <strong>HTTPS协议</strong>：必须使用SSL加密连接</p>
              <p>• <strong>SSL证书</strong>：必须有效且未过期</p>
              <p>• <strong>指定端口</strong>：443、80、88、8443之一</p>
              <p>• <strong>响应时间</strong>：必须在30秒内响应</p>
              <p>• <strong>公网访问</strong>：URL必须能从互联网访问</p>
            </div>
          </div>
        </div>

        <!-- URL预览（始终显示） -->
        <div v-if="displayWebhookUrl" class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h5 class="text-sm font-medium text-green-800 mb-2">🎯 最终URL预览</h5>
          <div class="space-y-2">
            <div class="text-xs">
              <span class="text-gray-600">您的基础URL：</span>
              <code class="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs">{{ getBaseUrlFromInput(displayWebhookUrl) }}</code>
            </div>
            <div class="text-xs">
              <span class="text-gray-600">系统生成的最终URL：</span>
              <code class="px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">{{ finalWebhookUrl }}</code>
            </div>
            <p class="text-xs text-green-600">
              💡 Telegram将向最终URL发送所有消息更新
            </p>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium text-gray-700">
          Secret Token
        </label>
        <button
          type="button"
          @click="generateWebhookSecret"
          class="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
          title="生成32位随机密钥"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          生成密钥
        </button>
      </div>
      <div class="relative">
        <input
          :value="modelValue.webhook_secret"
          @input="updateField('webhook_secret', ($event.target as HTMLInputElement).value)"
          :type="secretVisible ? 'text' : 'password'"
          class="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="可选的安全验证Token (建议点击生成)"
          maxlength="256"
        />
        <button
          v-if="modelValue.webhook_secret"
          type="button"
          @click="toggleSecretVisibility"
          class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
          :title="secretVisible ? '隐藏密钥' : '显示密钥'"
        >
          <svg v-if="secretVisible" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m6.878-2.122L21 21m-4.858-9.122a3 3 0 00-4.243-4.243m0 0L9 3m4.878 6.878L21 3"></path>
          </svg>
        </button>
      </div>
      <div class="mt-2 space-y-1">
        <p class="text-xs text-gray-500">
          用于验证请求来源的密钥，建议填写以增强安全性
        </p>
        <div v-if="secretGenerated" class="flex items-center gap-2 text-xs text-green-600">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>已生成32位随机密钥，请妥善保存</span>
        </div>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium text-gray-700">
          最大并发连接数
        </label>
        <button
          type="button"
          @click="showConnectionsHelp = !showConnectionsHelp"
          class="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          <Info class="w-3 h-3" />
          {{ showConnectionsHelp ? '收起' : '说明' }}
        </button>
      </div>
      
      <select
        :value="modelValue.max_connections"
        @change="updateField('max_connections', parseInt(($event.target as HTMLSelectElement).value))"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="10">10 - 测试环境</option>
        <option value="20">20 - 小型应用</option>
        <option value="40" selected>40 - 推荐配置</option>
        <option value="60">60 - 活跃机器人</option>
        <option value="80">80 - 大型应用</option>
        <option value="100">100 - 最大值</option>
      </select>
      
      <!-- 折叠的详细说明 -->
      <div v-if="showConnectionsHelp" class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg transition-all">
        <div class="text-sm text-blue-800">
          <div class="font-medium mb-2">什么是并发连接数？</div>
          <div class="text-blue-700 space-y-1 text-xs">
            <div>• <strong>不是用户数量限制</strong>：机器人可以服务无限数量的用户</div>
            <div>• <strong>是技术连接数</strong>：Telegram服务器同时向您服务器发送HTTP请求的数量</div>
            <div>• <strong>影响响应速度</strong>：连接数越高，处理消息越快，但消耗服务器资源更多</div>
            <div>• <strong>可随时调整</strong>：根据机器人使用情况和服务器性能优化</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Webhook状态检查（仅在编辑模式显示） -->
    <div v-if="mode === 'edit' && botData?.work_mode === 'webhook'" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Globe class="w-4 h-4 text-yellow-600" />
          <span class="text-sm font-medium text-yellow-800">Webhook 状态检查</span>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            @click="handleCheckWebhookStatus"
            :disabled="checking"
            class="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            {{ checking ? '检查中...' : '检查状态' }}
          </button>
          <button 
            type="button"
            @click="handleApplyWebhookSettings"
            :disabled="applying || !modelValue.webhook_url"
            class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {{ applying ? '应用中...' : '应用设置' }}
          </button>
        </div>
      </div>
      <div v-if="webhookStatus" class="text-xs space-y-2">
        <!-- URL配置对比 -->
        <div class="p-2 bg-gray-50 rounded border">
          <div class="font-medium text-gray-800 mb-1">📍 URL配置对比</div>
          <div class="space-y-1">
            <div class="text-gray-700">
              <span class="font-medium">基础URL（用户输入）:</span><br>
              <code class="text-xs bg-blue-50 text-blue-800 px-1 py-0.5 rounded">{{ getBaseUrlFromInput(modelValue.webhook_url) }}</code>
            </div>
            <div class="text-gray-700">
              <span class="font-medium">最终URL（系统生成）:</span><br>
              <code class="text-xs bg-green-50 text-green-800 px-1 py-0.5 rounded">{{ finalWebhookUrl }}</code>
            </div>
            <div class="text-gray-700">
              <span class="font-medium">Telegram中的URL:</span><br>
              <code class="text-xs bg-purple-50 text-purple-800 px-1 py-0.5 rounded">{{ webhookStatus.url || '未设置' }}</code>
              <span 
                v-if="webhookStatus.url && webhookStatus.url === finalWebhookUrl" 
                class="ml-2 px-1 py-0.5 text-xs bg-green-100 text-green-700 rounded"
              >
                ✅ 已同步
              </span>
              <span 
                v-else-if="webhookStatus.url && webhookStatus.url !== finalWebhookUrl" 
                class="ml-2 px-1 py-0.5 text-xs bg-orange-100 text-orange-700 rounded"
              >
                ⚠️ 需要同步
              </span>
            </div>
          </div>
        </div>
        
        <!-- 状态信息 -->
        <div class="text-gray-700">
          <span class="font-medium">连接状态:</span> 
          <span :class="webhookStatus.last_error_message ? 'text-red-600' : 'text-green-600'">
            {{ webhookStatus.last_error_message || '正常' }}
          </span>
        </div>
        <div class="text-gray-700">
          <span class="font-medium">待处理消息:</span> 
          <span class="text-yellow-600">{{ webhookStatus.pending_update_count || 0 }} 条</span>
        </div>
        <div class="text-gray-700">
          <span class="font-medium">密钥验证:</span> 
          <span class="text-gray-600">{{ webhookStatus.configured_secret ? '已配置' : '未配置' }}</span>
        </div>
      </div>
    </div>

    <!-- Webhook模式说明 -->
    <div class="space-y-2">
      <!-- 简洁提示 -->
      <div class="p-2 bg-purple-50 border border-purple-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="text-xs text-purple-700 flex items-center gap-2">
            <Globe class="w-3 h-3" />
            <span>需要HTTPS域名和SSL证书 • 实时推送 • 高性能</span>
          </div>
          <button
            type="button"
            @click="showWebhookDetails = !showWebhookDetails"
            class="text-xs text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
          >
            <Info class="w-3 h-3" />
            {{ showWebhookDetails ? '收起' : '详情' }}
          </button>
        </div>
      </div>
      
      <!-- 折叠的详细说明 -->
      <div v-if="showWebhookDetails" class="p-3 bg-amber-50 border border-amber-200 rounded-lg transition-all">
        <div class="flex items-start gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-amber-800">
            <div class="font-medium mb-2">Webhook 模式技术要求：</div>
            <ul class="list-disc list-inside space-y-1 text-amber-700 text-xs">
              <li>服务器必须具有有效的SSL证书</li>
              <li>URL必须使用HTTPS协议</li>
              <li>端口必须是 443、80、88、8443 之一</li>
              <li>服务器必须在30秒内响应Telegram请求</li>
            </ul>
            <div class="mt-3 pt-2 border-t border-amber-300">
              <div class="font-medium text-amber-800 mb-1">
                {{ mode === 'create' ? '性能优势：' : '使用步骤：' }}
              </div>
              <div v-if="mode === 'create'" class="text-amber-700 text-xs space-y-1">
                <div>• 实时消息推送，无延迟</div>
                <div>• 节省服务器资源，无需轮询</div>
                <div>• 适合生产环境和高并发场景</div>
              </div>
              <div v-else class="text-amber-700 text-xs space-y-1">
                <div>1. 配置Webhook URL和密钥</div>
                <div>2. 点击"应用设置"将配置同步到Telegram</div>
                <div>3. 点击"检查状态"验证设置是否生效</div>
                <div class="text-amber-600 mt-2">💡 只有应用设置后，Telegram才能向您的服务器发送消息</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { AlertTriangle, Globe, Info } from 'lucide-vue-next'
import { computed, ref } from 'vue'

// Props
interface WebhookConfig {
  webhook_url: string
  webhook_secret: string
  max_connections: number
}

interface BotData {
  id?: string
  username?: string
  work_mode?: 'polling' | 'webhook'
}

interface Props {
  modelValue: WebhookConfig
  workMode: 'polling' | 'webhook'
  mode?: 'create' | 'edit'
  botData?: BotData | null
  botUsername?: string  // 在创建模式下传递的用户名
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: WebhookConfig]
}>()

// 响应式数据
const checking = ref(false)
const applying = ref(false)
const webhookStatus = ref<any>(null)
const showWebhookDetails = ref(false)
const showConnectionsHelp = ref(false)
const showUrlExplanation = ref(false)
const secretVisible = ref(true)
const secretGenerated = ref(false)

// 计算输入框显示的URL
const displayWebhookUrl = computed({
  get() {
    if (!props.modelValue.webhook_url) return ''
    
    // 总是显示原始输入值，不自动提取基础URL
    return props.modelValue.webhook_url
  },
  set(value: string) {
    // 直接更新值，不进行自动修改
    updateField('webhook_url', value)
  }
})

// 计算最终的Webhook URL预览
const finalWebhookUrl = computed(() => {
  const inputUrl = displayWebhookUrl.value
  if (!inputUrl) return ''
  
  // 智能提取基础URL：如果已经包含机器人用户名，则提取基础部分
  const baseUrl = getBaseUrlFromInput(inputUrl)
  
  if (props.mode === 'edit' && props.botData?.username) {
    // 编辑模式：使用实际的机器人用户名
    return `${baseUrl}/${props.botData.username}`
  } else if (props.mode === 'create' && props.botUsername) {
    // 创建模式：使用传入的用户名
    return `${baseUrl}/${props.botUsername}`
  } else {
    // 默认显示示例
    return `${baseUrl}/[机器人用户名]`
  }
})

// 智能提取基础URL，不破坏用户输入
const getBaseUrlFromInput = (inputUrl: string) => {
  if (!inputUrl) return ''
  
  // 移除末尾的斜杠
  const cleanUrl = inputUrl.replace(/\/+$/, '')
  
  // 检查是否已经包含了机器人用户名
  if (props.mode === 'edit' && props.botData?.username) {
    // 如果URL以当前机器人用户名结尾，则移除它
    if (cleanUrl.endsWith(`/${props.botData.username}`)) {
      return cleanUrl.replace(`/${props.botData.username}`, '')
    }
  }
  
  // 检查是否包含了旧的机器人ID格式（UUID）
  if (props.botData?.id && cleanUrl.endsWith(`/${props.botData.id}`)) {
    return cleanUrl.replace(`/${props.botData.id}`, '')
  }
  
  // 如果没有检测到机器人标识符，直接返回清理后的URL
  return cleanUrl
}

// 从完整URL中提取基础URL（仅用于已保存的webhook URL）
const extractBaseUrl = (fullUrl: string) => {
  if (!fullUrl) return ''
  
  // 移除末尾的斜杠
  const cleanUrl = fullUrl.replace(/\/+$/, '')
  
  // 优先检查具体的机器人用户名
  if (props.botData?.username && cleanUrl.endsWith(`/${props.botData.username}`)) {
    return cleanUrl.replace(`/${props.botData.username}`, '')
  }
  
  // 兼容旧的ID格式（UUID）
  if (props.botData?.id && cleanUrl.endsWith(`/${props.botData.id}`)) {
    return cleanUrl.replace(`/${props.botData.id}`, '')
  }
  
  // 只移除UUID格式的后缀（36位的UUID），不移除其他路径
  return cleanUrl.replace(/\/[a-f0-9\-]{36}$/, '')
}

// 更新字段值
const updateField = <K extends keyof WebhookConfig>(field: K, value: WebhookConfig[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

// 检查Webhook状态
const handleCheckWebhookStatus = async () => {
  if (!props.botData?.id) return
  
  try {
    checking.value = true
    webhookStatus.value = null
    
    const response = await fetch(`/api/bots/${props.botData.id}/webhook-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
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

// 应用webhook设置
const handleApplyWebhookSettings = async () => {
  if (!props.botData?.id || !props.modelValue.webhook_url) return
  
  try {
    applying.value = true
    
    const response = await fetch(`/api/bots/${props.botData.id}/apply-webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      ElMessage.success('Webhook设置成功')
      // 自动刷新webhook状态
      await handleCheckWebhookStatus()
    } else {
      ElMessage.error(result.message || 'Webhook设置失败')
    }
  } catch (error) {
    console.error('应用webhook设置失败:', error)
    ElMessage.error('应用webhook设置失败')
  } finally {
    applying.value = false
  }
}

// 生成随机Webhook密钥
const generateWebhookSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  updateField('webhook_secret', result)
  secretGenerated.value = true
  secretVisible.value = true
  
  // 3秒后隐藏生成提示
  setTimeout(() => {
    secretGenerated.value = false
  }, 3000)
  
  ElMessage.success('已生成32位随机密钥')
}

// 切换密钥显示/隐藏
const toggleSecretVisibility = () => {
  secretVisible.value = !secretVisible.value
}
</script>
