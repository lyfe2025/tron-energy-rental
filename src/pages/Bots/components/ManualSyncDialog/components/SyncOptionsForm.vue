<!--
 * 同步选项表单组件
 * 职责：展示和管理同步选项的选择
-->
<template>
  <div class="space-y-4">
    <h4 class="font-medium text-gray-900 flex items-center gap-2">
      <Settings class="w-5 h-5" />
      选择要同步的设置
    </h4>
    
    <!-- 基础信息同步 -->
    <div class="border rounded-lg p-4 space-y-4">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span class="font-medium text-gray-900">基础信息</span>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.name" 
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">机器人名称</div>
            <div class="text-xs text-gray-500">当前值: {{ currentFormData?.name || '未设置' }}</div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.description" 
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">机器人描述</div>
            <div class="text-xs text-gray-500">{{ getDescriptionPreview(currentFormData?.description) }}</div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.shortDescription" 
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">短描述</div>
            <div class="text-xs text-gray-500">{{ getDescriptionPreview(currentFormData?.short_description) }}</div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.commands" 
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">命令列表</div>
            <div class="text-xs text-gray-500">{{ getCommandsPreview(currentFormData) }}</div>
          </div>
        </label>
      </div>
    </div>

    <!-- 高级设置同步 -->
    <div class="border rounded-lg p-4 space-y-4">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
        <span class="font-medium text-gray-900">高级设置</span>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.workMode" 
            class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">工作模式</div>
            <div class="text-xs text-gray-500">当前: {{ currentFormData?.work_mode === 'webhook' ? 'Webhook' : 'Polling' }}</div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.webhookUrl" 
            :disabled="currentFormData?.work_mode !== 'webhook'"
            class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">Webhook URL</div>
            <div class="text-xs text-gray-500">
              {{ currentFormData?.work_mode === 'webhook' ? 
                  (currentFormData?.webhook_url ? 
                    `URL: ${getWebhookUrlPreview(currentFormData.webhook_url)}` : 
                    '未设置URL') : 
                  '仅在Webhook模式下可用' }}
            </div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.menuButton" 
            :disabled="!isMenuButtonEnabled"
            class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">菜单按钮</div>
            <div class="text-xs text-gray-500">
              {{ isMenuButtonEnabled ? 
                  `已启用: ${getMenuButtonText()}` : 
                  '未启用' }}
            </div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.replyKeyboard" 
            :disabled="!canUseReplyKeyboard"
            class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">回复键盘</div>
            <div class="text-xs text-gray-500">
              {{ getReplyKeyboardStatus() }}
            </div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.inlineKeyboard" 
            :disabled="!canUseInlineKeyboard"
            class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">内嵌键盘</div>
            <div class="text-xs text-gray-500">
              {{ getInlineKeyboardStatus() }}
            </div>
          </div>
        </label>
      </div>
    </div>

    <!-- 配置验证 -->
    <div class="border rounded-lg p-4 space-y-4">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
        <span class="font-medium text-gray-900">配置验证</span>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.keyboardType" 
            class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">键盘类型验证</div>
            <div class="text-xs text-gray-500">验证键盘类型（回复/内嵌）和按钮配置的完整性</div>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="syncOptions.priceConfig" 
            class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          >
          <div class="flex-1">
            <div class="font-medium text-sm">价格配置验证</div>
            <div class="text-xs text-gray-500">验证价格配置的完整性、可用性和依赖关系</div>
          </div>
        </label>
      </div>
    </div>

    <!-- 全选/全不选 -->
    <div class="flex items-center justify-between pt-4 border-t">
      <div class="flex items-center gap-4">
        <button 
          @click="$emit('select-all')" 
          class="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          全选
        </button>
        <button 
          @click="$emit('select-none')" 
          class="text-sm text-gray-600 hover:text-gray-700 transition-colors"
        >
          全不选
        </button>
      </div>
      <div class="text-sm text-gray-500">
        已选择 {{ selectedCount }} 项
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import { computed } from 'vue'
import { useSyncDisplay } from '../composables/useSyncDisplay'
import type { SyncOptions } from '../types/sync.types'

// Props
interface Props {
  syncOptions: SyncOptions
  currentFormData?: any | null
  selectedCount: number
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  'select-all': []
  'select-none': []
}>()

// 显示工具函数
const { getDescriptionPreview, getCommandsPreview, getWebhookUrlPreview } = useSyncDisplay()

// 计算菜单按钮是否启用
const isMenuButtonEnabled = computed(() => {
  const result = props.currentFormData?.menu_button_enabled || 
                 props.currentFormData?.is_enabled || 
                 props.currentFormData?.menuButtonEnabled ||
                 props.currentFormData?.menu_button_config?.is_enabled
  
  
  return result
})

// 计算键盘配置是否存在
const hasKeyboardConfig = computed(() => {
  const keyboardConfig = props.currentFormData?.keyboard_config
  if (!keyboardConfig || !keyboardConfig.main_menu) {
    return false
  }
  
  const mainMenu = keyboardConfig.main_menu
  return mainMenu.rows && Array.isArray(mainMenu.rows) && mainMenu.rows.length > 0
})

// 获取键盘类型
const keyboardType = computed(() => {
  const keyboardConfig = props.currentFormData?.keyboard_config
  return keyboardConfig?.main_menu?.type || 'inline' // 默认为inline
})

// 计算是否可以使用回复键盘
const canUseReplyKeyboard = computed(() => {
  // 回复键盘：基于键盘类型，不依赖具体按钮配置
  return keyboardType.value === 'reply'
})

// 计算是否可以使用内嵌键盘
const canUseInlineKeyboard = computed(() => {
  // 内嵌键盘：基于键盘类型，不依赖具体按钮配置
  // 内嵌键盘是默认类型，即使没有配置也应该可以同步
  return keyboardType.value === 'inline' || !props.currentFormData?.keyboard_config?.main_menu?.type
})

// 获取菜单按钮文本
const getMenuButtonText = () => {
  return props.currentFormData?.menu_button_text || 
         props.currentFormData?.text || 
         props.currentFormData?.menu_button_config?.text || 
         '菜单'
}

// 获取键盘按钮总数
const getKeyboardButtonCount = () => {
  if (!hasKeyboardConfig.value) {
    return 0
  }
  
  const mainMenu = props.currentFormData?.keyboard_config?.main_menu
  let count = 0
  
  if (mainMenu && mainMenu.rows) {
    for (const row of mainMenu.rows) {
      if (row.is_enabled && row.buttons && Array.isArray(row.buttons)) {
        count += row.buttons.filter((btn: any) => btn.is_enabled).length
      }
    }
  }
  
  return count
}

// 获取回复键盘状态描述
const getReplyKeyboardStatus = () => {
  if (keyboardType.value === 'reply') {
    const buttonCount = getKeyboardButtonCount()
    if (buttonCount > 0) {
      return `当前键盘类型：回复键盘 (${buttonCount}个按钮)`
    } else {
      return `当前键盘类型：回复键盘 (可同步空键盘配置)`
    }
  } else {
    return `当前键盘类型：内嵌键盘，无法同步回复键盘`
  }
}

// 获取内嵌键盘状态描述
const getInlineKeyboardStatus = () => {
  if (keyboardType.value === 'inline' || !props.currentFormData?.keyboard_config?.main_menu?.type) {
    const buttonCount = getKeyboardButtonCount()
    if (buttonCount > 0) {
      return `当前键盘类型：内嵌键盘 (${buttonCount}个按钮)`
    } else {
      return `当前键盘类型：内嵌键盘 (可同步空键盘配置)`
    }
  } else {
    return `当前键盘类型：回复键盘，无法同步内嵌键盘`
  }
}
</script>
