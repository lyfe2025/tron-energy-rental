<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center">
        <Settings class="w-5 h-5 mr-2 text-purple-600" />
        <span class="font-semibold text-gray-900">高级设置</span>
      </div>
    </div>
    <div class="p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">状态</label>
          <div class="flex items-center">
            <button
              @click="$emit('update:form', { ...form, is_active: !form.is_active })"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :class="form.is_active ? 'bg-blue-600' : 'bg-gray-200'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="form.is_active ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
            <span class="ml-3 text-sm text-gray-700">{{ form.is_active ? '启用' : '禁用' }}</span>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            禁用后机器人将停止响应用户消息
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">自动重连</label>
          <div class="flex items-center">
            <button
              @click="$emit('update:form', { ...form, auto_reconnect: !form.auto_reconnect })"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :class="form.auto_reconnect ? 'bg-blue-600' : 'bg-gray-200'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="form.auto_reconnect ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
            <span class="ml-3 text-sm text-gray-700">{{ form.auto_reconnect ? '开启' : '关闭' }}</span>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            连接断开时自动重新连接
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">消息限制</label>
          <input
            :value="form.rate_limit"
            @input="$emit('update:form', { ...form, rate_limit: parseInt(($event.target as HTMLInputElement).value) || 30 })"
            type="number"
            min="1"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div class="text-xs text-gray-500 mt-1">
            每分钟最大处理消息数
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">超时时间</label>
          <input
            :value="form.timeout"
            @input="$emit('update:form', { ...form, timeout: parseInt(($event.target as HTMLInputElement).value) || 30 })"
            type="number"
            min="5"
            max="300"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div class="text-xs text-gray-500 mt-1">
            API请求超时时间（秒）
          </div>
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
          <div class="relative">
            <input
              :value="form.webhook_url"
              @input="$emit('update:form', { ...form, webhook_url: ($event.target as HTMLInputElement).value })"
              type="url"
              placeholder="请输入Webhook回调地址（可选）"
              maxlength="500"
              class="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              @click="$emit('test-webhook')"
              :disabled="testingWebhook || !form.webhook_url"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <span v-if="testingWebhook" class="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full inline-block mr-1"></span>
              测试
            </button>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            用于接收Telegram机器人消息的回调地址，支持HTTPS协议
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Settings } from 'lucide-vue-next'

// 接口定义
interface BotFormData {
  name: string
  username: string
  token: string
  description: string
  is_active: boolean
  auto_reconnect: boolean
  rate_limit: number
  timeout: number
  webhook_url: string
  selectedNetwork: string | null
}

// Props
defineProps<{
  form: BotFormData
  testingWebhook: boolean
}>()

// Emits
defineEmits<{
  'update:form': [form: BotFormData]
  'test-webhook': []
}>()
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .md\:col-span-2 {
    grid-column: span 2 / span 2;
  }
}

.gap-6 {
  gap: 1.5rem;
}
</style>
