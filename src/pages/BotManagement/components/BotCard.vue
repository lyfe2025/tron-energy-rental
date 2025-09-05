<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
    <!-- 卡片头部 -->
    <div class="p-4 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <input
            type="checkbox"
            :checked="isSelected"
            @change="handleSelect"
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div class="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bot class="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">{{ bot.name }}</h3>
            <p class="text-sm text-gray-500">@{{ bot.username }}</p>
          </div>
        </div>
        <div class="flex items-center">
          <button
            @click="handleToggleStatus"
            :disabled="bot.updating"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            :class="bot.is_active ? 'bg-blue-600' : 'bg-gray-200'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="bot.is_active ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="p-4">
      <div class="space-y-3">
        <!-- 基本信息 -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">状态:</span>
          <span
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="bot.is_active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'"
          >
            {{ bot.is_active ? '启用' : '禁用' }}
          </span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">关联网络:</span>
          <span class="font-medium">{{ bot.networks?.length || 0 }} 个</span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">配置模板:</span>
          <span class="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
            {{ getTemplateLabel(bot.template || 'custom') }}
          </span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">创建时间:</span>
          <span class="text-gray-700">{{ formatDate(bot.created_at) }}</span>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">最后更新:</span>
          <span class="text-gray-700">{{ formatDate(bot.updated_at) }}</span>
        </div>
      </div>

      <!-- 网络标签 -->
      <div v-if="bot.networks?.length" class="mt-4">
        <div class="text-xs text-gray-500 mb-2">关联网络:</div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="network in bot.networks.slice(0, 3)"
            :key="network.id"
            class="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full"
          >
            {{ network.name }}
          </span>
          <span
            v-if="bot.networks.length > 3"
            class="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full"
          >
            +{{ bot.networks.length - 3 }}
          </span>
        </div>
      </div>
    </div>

    <!-- 卡片操作 -->
    <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
      <div class="flex space-x-2">
        <button
          @click="$emit('edit', bot)"
          class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <Edit class="w-3 h-3" />
          编辑
        </button>
        <button
          @click="$emit('networks', bot)"
          class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <Network class="w-3 h-3" />
          网络
        </button>
      </div>
      <div class="relative">
        <button
          @click="toggleMenu"
          class="p-1 text-gray-700 hover:bg-gray-200 rounded transition-colors"
        >
          <MoreHorizontal class="w-4 h-4" />
        </button>
        <div
          v-if="bot.showMenu"
          class="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
        >
          <button
            @click="handleDropdownCommand('view')"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
          >
            查看详情
          </button>
          <button
            @click="handleDropdownCommand('copy')"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            复制配置
          </button>
          <button
            @click="handleDropdownCommand('logs')"
            class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            查看日志
          </button>
          <div class="border-t border-gray-200"></div>
          <button
            @click="handleDropdownCommand('delete')"
            class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 last:rounded-b-lg"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '@/utils/date'
import { Bot, Edit, MoreHorizontal, Network } from 'lucide-vue-next'

// 类型定义
interface BotNetwork {
  id: string
  name: string
  chain_id: string
}

interface BotConfig {
  id: string
  name: string
  username: string
  token: string
  is_active: boolean
  networks?: BotNetwork[]
  template?: string
  created_at: string
  updated_at: string
  updating?: boolean
  showMenu?: boolean
}

// Props
interface Props {
  bot: BotConfig
  isSelected: boolean
}

const props = defineProps<Props>()

// Emits
interface Emits {
  'select': [id: string, selected: boolean]
  'toggle-status': [bot: BotConfig]
  'edit': [bot: BotConfig]
  'networks': [bot: BotConfig]
  'dropdown-command': [command: string, bot: BotConfig]
}

const emit = defineEmits<Emits>()

// 方法
const handleSelect = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  emit('select', props.bot.id, checked)
}

const handleToggleStatus = () => {
  emit('toggle-status', props.bot)
}

const toggleMenu = () => {
  props.bot.showMenu = !props.bot.showMenu
}

const handleDropdownCommand = (command: string) => {
  props.bot.showMenu = false
  emit('dropdown-command', command, props.bot)
}

// 工具方法
const getTemplateLabel = (template: string) => {
  const templateMap: Record<string, string> = {
    energy: '能量租赁',
    service: '客服机器人',
    custom: '自定义'
  }
  return templateMap[template] || '自定义'
}
</script>

