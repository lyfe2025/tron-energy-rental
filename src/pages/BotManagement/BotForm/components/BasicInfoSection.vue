<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center">
        <Bot class="w-5 h-5 mr-2 text-blue-600" />
        <span class="font-semibold text-gray-900">基本信息</span>
      </div>
    </div>
    <div class="p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">机器人名称 *</label>
          <input
            :value="form.name"
            @input="$emit('update:form', { ...form, name: ($event.target as HTMLInputElement).value })"
            type="text"
            placeholder="请输入机器人名称"
            maxlength="50"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div class="text-xs text-gray-500 mt-1">{{ form.name.length }}/50</div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">用户名 *</label>
          <div class="flex">
            <span class="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">@</span>
            <input
              :value="form.username"
              @input="$emit('update:form', { ...form, username: ($event.target as HTMLInputElement).value })"
              type="text"
              placeholder="请输入机器人用户名（不含@）"
              maxlength="32"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Bot Token *</label>
          <div class="relative">
            <input
              :value="form.token"
              @input="$emit('update:form', { ...form, token: ($event.target as HTMLInputElement).value })"
              type="password"
              placeholder="请输入Bot Token（格式：bot123456:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw）"
              maxlength="200"
              class="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              @click="$emit('validate-token')"
              :disabled="validatingToken"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <span v-if="validatingToken" class="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full inline-block mr-1"></span>
              验证
            </button>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            从 @BotFather 获取的Bot Token，用于机器人身份验证
          </div>
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
          <textarea
            :value="form.description"
            @input="$emit('update:form', { ...form, description: ($event.target as HTMLTextAreaElement).value })"
            rows="3"
            placeholder="请输入机器人描述（可选）"
            maxlength="200"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          ></textarea>
          <div class="text-xs text-gray-500 mt-1">{{ form.description.length }}/200</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bot } from 'lucide-vue-next'

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
  validatingToken: boolean
}>()

// Emits
defineEmits<{
  'update:form': [form: BotFormData]
  'validate-token': []
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
