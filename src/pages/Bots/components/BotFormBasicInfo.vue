<!--
 * Bot表单基础信息组件
 * 职责：提供机器人基础信息的表单字段（名称、用户名、Token、描述）
-->
<template>
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
          :value="modelValue.name"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="输入机器人名称"
          maxlength="50"
        />
        <div class="text-right text-xs text-gray-500 mt-1">{{ modelValue.name.length }}/50</div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          用户名 <span class="text-red-500">*</span>
        </label>
        <div class="flex">
          <span class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-lg">@</span>
          <input
            :value="modelValue.username"
            @input="updateField('username', ($event.target as HTMLInputElement).value)"
            type="text"
            :required="mode === 'create'"
            :disabled="mode === 'edit'"
            :class="[
              'flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              mode === 'edit' ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
            ]"
            placeholder="输入机器人用户名"
            maxlength="50"
          />
        </div>
        <div v-if="mode === 'edit'" class="text-gray-500 text-xs mt-1">用户名创建后不可修改</div>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Bot Token <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <input
          :value="modelValue.token"
          @input="updateField('token', ($event.target as HTMLInputElement).value)"
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
      
      <!-- Token获取说明（仅在创建模式显示） -->
      <div v-if="mode === 'create'" class="mt-2 flex items-center gap-2">
        <span class="text-sm text-gray-600">需要帮助获取 Bot Token？</span>
        <button
          type="button"
          @click="showTokenHelp = !showTokenHelp"
          class="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <Info class="w-3 h-3" />
          {{ showTokenHelp ? '收起' : '详情' }}
        </button>
      </div>
      
      <!-- 折叠的详细说明 -->
      <div v-if="mode === 'create' && showTokenHelp" class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg transition-all">
        <div class="flex items-start gap-2">
          <Info class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-blue-800">
            <div class="font-medium mb-2">如何获取 Bot Token：</div>
            <ol class="list-decimal list-inside space-y-1 text-blue-700">
              <li>在 Telegram 中搜索并打开 <strong>@BotFather</strong></li>
              <li>发送命令 <code class="bg-blue-100 px-1 rounded">/newbot</code> 创建新机器人</li>
              <li>按提示输入机器人的<strong>显示名称</strong>（可以是中文）</li>
              <li>输入机器人的<strong>用户名</strong>（必须以 bot 结尾，如：mybot_bot）</li>
              <li>创建成功后，BotFather 会返回您的 <strong>Bot Token</strong></li>
              <li>复制 Token 并粘贴到上方输入框中</li>
            </ol>
            <div class="mt-2 text-xs text-blue-600">
              💡 Token 格式类似：<code class="bg-blue-100 px-1 rounded">123456789:ABCdefGHIjklMNOpqrsTUVwxyz</code>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Token验证按钮和状态（仅在创建模式显示） -->
      <div v-if="mode === 'create'" class="mt-3 flex items-center gap-3">
        <button
          type="button"
          @click="handleVerifyToken"
          :disabled="!modelValue.token.trim() || verifying"
          class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="verifying" class="w-4 h-4 animate-spin" />
          <CheckCircle v-else class="w-4 h-4" />
          {{ verifying ? '验证中...' : '验证Token' }}
        </button>
        
        <!-- 验证状态显示 -->
        <div v-if="tokenVerifyStatus" class="flex items-center gap-2 text-sm">
          <CheckCircle v-if="tokenVerifyStatus === 'success'" class="w-4 h-4 text-green-600" />
          <XCircle v-else class="w-4 h-4 text-red-600" />
          <span :class="tokenVerifyStatus === 'success' ? 'text-green-600' : 'text-red-600'">
            {{ tokenVerifyMessage }}
          </span>
        </div>
      </div>
      
      <!-- 验证成功后显示机器人信息（仅在创建模式显示） -->
      <div v-if="mode === 'create' && botInfo" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <Bot class="w-4 h-4 text-green-600" />
          <span class="text-sm font-medium text-green-800">机器人信息已获取</span>
        </div>
        <div class="text-sm text-green-700 space-y-1">
          <div><strong>名称:</strong> {{ botInfo.first_name }}</div>
          <div><strong>用户名:</strong> @{{ botInfo.username }}</div>
          <div v-if="botInfo.description"><strong>描述:</strong> {{ botInfo.description }}</div>
        </div>
      </div>
    </div>

    <!-- 介绍信息（详细描述） -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        介绍信息
      </label>
      <textarea
        :value="modelValue.description"
        @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="输入机器人的详细介绍（在聊天开始时显示）"
        maxlength="512"
      ></textarea>
      <div class="text-right text-xs text-gray-500 mt-1">{{ modelValue.description.length }}/512</div>
      <p class="text-xs text-gray-500 mt-1">
        📝 介绍信息：详细的机器人功能说明，会在用户首次与机器人对话时显示
      </p>
    </div>

    <!-- 关于信息（简短描述） -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        关于信息
      </label>
      <textarea
        :value="modelValue.short_description || ''"
        @input="updateField('short_description', ($event.target as HTMLTextAreaElement).value)"
        rows="2"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="输入机器人的简短关于信息（在机器人资料页面显示）"
        maxlength="120"
      ></textarea>
      <div class="text-right text-xs text-gray-500 mt-1">{{ (modelValue.short_description || '').length }}/120</div>
      <p class="text-xs text-gray-500 mt-1">
        ℹ️ 关于信息：简短的机器人说明，会显示在机器人的资料页面
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bot, CheckCircle, Eye, EyeOff, Info, Loader2, XCircle } from 'lucide-vue-next'
import { ref } from 'vue'

// Props
interface Props {
  modelValue: {
    name: string
    username: string
    token: string
    description: string
    short_description?: string
  }
  mode: 'create' | 'edit'
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  'verifyToken': [token: string]
}>()

// 响应式数据
const showPassword = ref(false)
const showTokenHelp = ref(false)
const verifying = ref(false)
const tokenVerifyStatus = ref<'success' | 'error' | null>(null)
const tokenVerifyMessage = ref('')
const botInfo = ref<any>(null)

// 更新字段值
const updateField = (field: keyof typeof props.modelValue, value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

// Token验证处理
const handleVerifyToken = async () => {
  if (!props.modelValue.token.trim()) {
    return
  }
  
  try {
    verifying.value = true
    tokenVerifyStatus.value = null
    tokenVerifyMessage.value = ''
    botInfo.value = null
    
    const response = await fetch('/api/bots/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: props.modelValue.token })
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      tokenVerifyStatus.value = 'success'
      tokenVerifyMessage.value = 'Token验证成功'
      botInfo.value = result.data.botInfo
      
      // 自动填充机器人信息（安全访问）
      if (result.data.botInfo) {
        const updates: Partial<typeof props.modelValue> = {}
        
        if (result.data.botInfo.first_name && !props.modelValue.name.trim()) {
          updates.name = result.data.botInfo.first_name
        }
        if (result.data.botInfo.username && !props.modelValue.username.trim()) {
          updates.username = result.data.botInfo.username
        }
        
        if (Object.keys(updates).length > 0) {
          emit('update:modelValue', {
            ...props.modelValue,
            ...updates
          })
        }
      }
      
      // 通知父组件Token验证成功
      emit('verifyToken', props.modelValue.token)
    } else {
      tokenVerifyStatus.value = 'error'
      tokenVerifyMessage.value = result.message || 'Token验证失败'
    }
  } catch (error: any) {
    console.error('Token验证失败:', error)
    tokenVerifyStatus.value = 'error'
    tokenVerifyMessage.value = '网络错误，请稍后重试'
  } finally {
    verifying.value = false
  }
}
</script>
