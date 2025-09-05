<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ modalTitle }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6">
        <!-- View Mode -->
        <div v-if="mode === 'view'" class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">机器人名称</label>
              <p class="text-gray-900">{{ bot?.name || '-' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <p class="text-gray-900 font-mono text-sm break-all">{{ bot?.username || '-' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Token</label>
              <p class="text-gray-900 font-mono text-sm break-all">{{ bot?.token ? bot.token.substring(0, 20) + '...' : '-' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <span :class="getStatusColor(bot?.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ formatStatus(bot?.status) }}
              </span>
            </div>
          </div>

          <!-- Webhook Configuration -->
          <div v-if="bot?.webhook_url">
            <label class="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <div class="p-3 bg-gray-50 rounded-lg">
              <p class="text-gray-900 font-mono text-sm break-all">{{ bot.webhook_url }}</p>
              <div class="flex items-center gap-2 mt-2">
                <button
                  @click="$emit('test-webhook', bot)"
                  class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Zap class="w-3 h-3" />
                  测试Webhook
                </button>
              </div>
            </div>
          </div>

          <!-- Welcome Message -->
          <div v-if="bot?.welcome_message">
            <label class="block text-sm font-medium text-gray-700 mb-1">欢迎语</label>
            <div class="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              {{ bot.welcome_message }}
            </div>
          </div>

          <!-- Help Message -->
          <div v-if="bot?.help_message">
            <label class="block text-sm font-medium text-gray-700 mb-1">帮助信息</label>
            <div class="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              {{ bot.help_message }}
            </div>
          </div>

          <!-- Commands -->
          <div v-if="bot?.commands && bot.commands.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">机器人命令</label>
            <div class="space-y-2">
              <div v-for="command in (bot.commands as any[])" :key="command.command" class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div class="flex-1">
                  <span class="text-sm font-medium text-gray-900">/{{ command.command }}</span>
                  <p class="text-xs text-gray-600">{{ command.description }}</p>
                </div>
                <span :class="`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  command.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`">
                  {{ command.enabled ? '启用' : '禁用' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Statistics Info -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="text-sm font-medium text-gray-900 mb-3">统计信息</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <p class="text-2xl font-bold text-blue-600">{{ bot?.total_users || 0 }}</p>
                <p class="text-sm text-gray-600">用户数</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-green-600">{{ bot?.total_orders || 0 }}</p>
                <p class="text-sm text-gray-600">订单数</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-orange-600">{{ bot?.today_orders || 0 }}</p>
                <p class="text-sm text-gray-600">今日订单</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-purple-600">{{ bot?.balance || 0 }}</p>
                <p class="text-sm text-gray-600">余额</p>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="bot?.description">
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <p class="text-gray-900">{{ bot.description }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-2 pt-4 border-t">
            <button
              @click="$emit('edit', bot)"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Edit class="w-4 h-4" />
              编辑
            </button>
            <button
              @click="$emit('test-connection', bot)"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Zap class="w-4 h-4" />
              测试连接
            </button>
          </div>
        </div>

        <!-- Edit/Create Mode -->
        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Bot Name -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
              机器人名称 <span class="text-red-500">*</span>
            </label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入机器人名称"
            />
          </div>

          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
              用户名 <span class="text-red-500">*</span>
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入机器人用户名"
            />
          </div>

          <!-- Token -->
          <div>
            <label for="token" class="block text-sm font-medium text-gray-700 mb-1">
              Token <span class="text-red-500">*</span>
            </label>
            <input
              id="token"
              v-model="form.token"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="请输入机器人Token"
            />
          </div>

          <!-- Webhook URL -->
          <div>
            <label for="webhook_url" class="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL
            </label>
            <input
              id="webhook_url"
              v-model="form.webhook_url"
              type="url"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="请输入Webhook回调地址（可选）"
            />
            <p class="text-xs text-gray-500 mt-1">Telegram将向此URL发送消息更新，用于接收用户消息和命令</p>
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              id="description"
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入机器人描述（可选）"
            ></textarea>
          </div>

          <!-- Welcome Message -->
          <div>
            <label for="welcome_message" class="block text-sm font-medium text-gray-700 mb-1">
              欢迎语
            </label>
            <textarea
              id="welcome_message"
              v-model="form.welcome_message"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入机器人欢迎语"
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">用户首次使用 /start 命令时显示的消息</p>
          </div>

          <!-- Help Message -->
          <div>
            <label for="help_message" class="block text-sm font-medium text-gray-700 mb-1">
              帮助信息
            </label>
            <textarea
              id="help_message"
              v-model="form.help_message"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入帮助信息"
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">用户使用 /help 命令时显示的消息</p>
          </div>

          <!-- Bot Commands -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              机器人命令配置
            </label>
            <div class="space-y-3">
              <div v-for="(command, index) in form.commands" :key="index" class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div class="flex-1">
                  <input
                    v-model="command.command"
                    type="text"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder="命令名称"
                  />
                </div>
                <div class="flex-2">
                  <input
                    v-model="command.description"
                    type="text"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder="命令描述"
                  />
                </div>
                <div class="flex items-center">
                  <input
                    v-model="command.enabled"
                    type="checkbox"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label class="ml-1 text-xs text-gray-600">启用</label>
                </div>
                <button
                  type="button"
                  @click="removeCommand(index)"
                  class="text-red-500 hover:text-red-700 text-sm"
                >
                  删除
                </button>
              </div>
              <button
                type="button"
                @click="addCommand"
                class="w-full px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                + 添加命令
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">配置机器人支持的命令和对应的按钮</p>
          </div>





          <!-- Form Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
              {{ mode === 'create' ? '创建' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bot } from '@/types/api'
import { Edit, Loader2, X, Zap } from 'lucide-vue-next'
import { computed } from 'vue'
import type { BotForm, BotModalMode } from '../types/bot.types'

interface Props {
  show: boolean
  mode: BotModalMode
  bot?: Bot | null
  form: BotForm
  isSaving: boolean
  formatStatus: (status?: string) => string
  getStatusColor: (status?: string) => string
}

interface Emits {
  close: []
  edit: [bot: Bot]
  'test-connection': [bot: Bot]
  'test-webhook': [bot: Bot]
  submit: []
  'add-command': []
  'remove-command': [index: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const modalTitle = computed(() => {
  switch (props.mode) {
    case 'create':
      return '添加机器人'
    case 'edit':
      return '编辑机器人'
    case 'view':
      return '机器人详情'
    default:
      return '机器人'
  }
})

const handleSubmit = () => {
  emit('submit')
}

const addCommand = () => {
  props.form.commands.push({
    command: '',
    description: '',
    enabled: true
  })
}

const removeCommand = (index: number) => {
  props.form.commands.splice(index, 1)
}
</script>