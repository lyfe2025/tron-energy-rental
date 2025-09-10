<!--
 * Bot表单菜单按钮配置组件
 * 职责：提供Telegram机器人菜单按钮配置
-->
<template>
  <div class="space-y-6">
    <!-- 菜单按钮标题 -->
    <div class="flex items-center gap-2 mb-4">
      <Menu class="w-5 h-5 text-green-600" />
      <h4 class="text-lg font-semibold text-gray-900">🍔 菜单按钮配置</h4>
    </div>

    <!-- 菜单按钮启用/禁用 -->
    <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h5 class="text-md font-semibold text-gray-800">启用菜单按钮</h5>
          <p class="text-sm text-gray-600 mt-1">在聊天界面输入框旁显示菜单按钮</p>
        </div>
        <label class="flex items-center">
          <input
            v-model="menuConfig.is_enabled"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span class="ml-2 text-sm text-gray-700">启用</span>
        </label>
      </div>

      <!-- 菜单按钮配置 -->
      <div v-if="menuConfig.is_enabled" class="space-y-4">

        <!-- 菜单类型 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            菜单类型
          </label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              @click="menuConfig.menu_type = 'commands'"
              :class="[
                'relative flex cursor-pointer rounded-lg border p-3 focus:outline-none',
                menuConfig.menu_type === 'commands'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <input
                    :checked="menuConfig.menu_type === 'commands'"
                    name="menu_type"
                    type="radio"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                </div>
                <div class="ml-3">
                  <div class="flex items-center gap-2">
                    <Terminal class="w-4 h-4 text-blue-600" />
                    <span class="block text-sm font-medium text-gray-900">命令菜单</span>
                  </div>
                  <div class="block text-xs text-gray-500 mt-1">
                    显示机器人命令列表 • 按钮文本固定为"Menu"
                  </div>
                </div>
              </div>
            </div>

            <div
              @click="menuConfig.menu_type = 'web_app'"
              :class="[
                'relative flex cursor-pointer rounded-lg border p-3 focus:outline-none',
                menuConfig.menu_type === 'web_app'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              ]"
            >
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <input
                    :checked="menuConfig.menu_type === 'web_app'"
                    name="menu_type"
                    type="radio"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                </div>
                <div class="ml-3">
                  <div class="flex items-center gap-2">
                    <Globe class="w-4 h-4 text-blue-600" />
                    <span class="block text-sm font-medium text-gray-900">Web App</span>
                  </div>
                  <div class="block text-xs text-gray-500 mt-1">
                    打开指定的网页应用 • 可自定义按钮文本
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 按钮文本配置（仅Web App类型支持） -->
        <div v-if="menuConfig.menu_type === 'web_app'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            按钮文本 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="menuConfig.button_text"
            type="text"
            :required="menuConfig.is_enabled && menuConfig.menu_type === 'web_app'"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="打开应用"
            maxlength="64"
          />
          <div class="text-right text-xs text-gray-500 mt-1">{{ menuConfig.button_text.length }}/64</div>
          <p class="text-xs text-gray-500 mt-1">用户看到的菜单按钮文字</p>
        </div>

        <!-- 命令菜单说明 -->
        <div v-if="menuConfig.menu_type === 'commands'" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div class="flex items-start gap-2">
            <Terminal class="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div class="text-sm text-amber-800">
              <div class="font-medium mb-1">命令菜单说明</div>
              <div class="text-amber-700 text-xs">
                命令菜单类型的按钮文本由 Telegram 系统控制，显示为固定的"Menu"文本，无法自定义。
                用户点击后会显示您配置的命令列表。
              </div>
            </div>
          </div>
        </div>

        <!-- Web App URL配置 -->
        <div v-if="menuConfig.menu_type === 'web_app'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Web App URL <span class="text-red-500">*</span>
          </label>
          <input
            v-model="menuConfig.web_app_url"
            type="url"
            :required="menuConfig.is_enabled && menuConfig.menu_type === 'web_app'"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://your-webapp.com"
          />
          <p class="text-xs text-gray-500 mt-1">
            用户点击菜单按钮时打开的网页地址（必须是HTTPS）
          </p>
        </div>

        <!-- 命令列表配置 -->
        <div v-if="menuConfig.menu_type === 'commands'" class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">
              命令列表
            </label>
            <button
              type="button"
              @click="addCommand"
              class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              + 添加命令
            </button>
          </div>
          
          <div v-if="menuConfig.commands.length === 0" class="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            暂无命令，点击上方按钮添加
          </div>
          
          <div 
            v-for="(command, index) in menuConfig.commands" 
            :key="index"
            class="bg-white p-3 rounded-lg border border-gray-200"
          >
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">命令名称</label>
                <input
                  v-model="command.command"
                  type="text"
                  placeholder="start"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  maxlength="32"
                />
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">命令描述</label>
                <input
                  v-model="command.description"
                  type="text"
                  placeholder="开始使用机器人"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  maxlength="256"
                />
              </div>
              
              <div class="flex items-end">
                <button
                  type="button"
                  @click="removeCommand(index)"
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 菜单按钮说明 -->
    <div class="space-y-2">
      <!-- 简洁提示 -->
      <div class="p-2 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="text-xs text-green-700 flex items-center gap-2">
            <Menu class="w-3 h-3" />
            <span>便于用户快速访问 • 提升用户体验 • 减少输入</span>
          </div>
          <button
            type="button"
            @click="showMenuDetails = !showMenuDetails"
            class="text-xs text-green-600 hover:text-green-700 transition-colors flex items-center gap-1"
          >
            <Info class="w-3 h-3" />
            {{ showMenuDetails ? '收起' : '详情' }}
          </button>
        </div>
      </div>
      
      <!-- 折叠的详细说明 -->
      <div v-if="showMenuDetails" class="p-3 bg-blue-50 border border-blue-200 rounded-lg transition-all">
        <div class="flex items-start gap-2">
          <Info class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-blue-800">
            <div class="font-medium mb-2">菜单按钮功能说明：</div>
            <div class="text-blue-700 space-y-1 text-xs">
              <div>• <strong>位置显示</strong>：在聊天界面输入框旁边显示菜单图标</div>
              <div>• <strong>命令菜单</strong>：点击后显示机器人可用命令列表，按钮文本由系统固定为"Menu"</div>
              <div>• <strong>Web App</strong>：点击后在Telegram内打开指定网页，可自定义按钮文本</div>
              <div>• <strong>用户体验</strong>：减少用户记忆命令，提供可视化操作</div>
            </div>
            <div class="mt-3 pt-2 border-t border-blue-300">
              <div class="font-medium text-blue-800 mb-1">按钮文本设置规则：</div>
              <div class="text-blue-700 text-xs space-y-1">
                <div>• <strong>命令菜单类型</strong>：按钮文本固定为"Menu"，无法修改</div>
                <div>• <strong>Web App类型</strong>：可自定义按钮文本，建议简洁明了（3-12个字符）</div>
                <div>• <strong>官方限制</strong>：这是Telegram Bot API的设计限制，非系统问题</div>
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-blue-300">
              <div class="font-medium text-blue-800 mb-1">配置建议：</div>
              <div class="text-blue-700 text-xs space-y-1">
                <div>• 命令菜单适合功能较多的机器人</div>
                <div>• Web App适合需要复杂交互的场景</div>
                <div>• 如需自定义按钮文本，请选择Web App类型</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Globe, Info, Menu, Terminal } from 'lucide-vue-next'
import { reactive, ref, watch } from 'vue'

// 命令接口定义
interface BotCommand {
  command: string
  description: string
}

// 菜单配置接口
interface MenuButtonConfig {
  is_enabled: boolean
  button_text: string
  menu_type: 'commands' | 'web_app'
  web_app_url: string
  commands: BotCommand[]
}

// Props
interface Props {
  modelValue: MenuButtonConfig
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: MenuButtonConfig]
}>()

// 响应式数据
const showMenuDetails = ref(false)

// 菜单配置数据
const menuConfig = reactive<MenuButtonConfig>({
  is_enabled: false,
  button_text: '菜单',
  menu_type: 'commands',
  web_app_url: '',
  commands: [
    {
      command: 'start',
      description: '开始使用机器人'
    },
    {
      command: 'help',
      description: '获取帮助信息'
    }
  ]
})

// 添加命令
const addCommand = () => {
  menuConfig.commands.push({
    command: '',
    description: ''
  })
}

// 删除命令
const removeCommand = (index: number) => {
  menuConfig.commands.splice(index, 1)
}

// 监听配置变化，同步到父组件
// 使用防抖和变化检测的watch来避免递归更新
let isInternalUpdate = false

watch(
  () => menuConfig,
  (newConfig) => {
    if (isInternalUpdate) return
    
    // 深度比较，只在真正变化时才emit
    const currentValue = JSON.stringify(props.modelValue)
    const newValue = JSON.stringify(newConfig)
    
    if (currentValue !== newValue) {
      emit('update:modelValue', JSON.parse(JSON.stringify(newConfig)))
    }
  },
  { deep: true }
)

// 监听props变化，更新内部数据
watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) return
    
    isInternalUpdate = true
    
    try {
      // 更新基本配置
      Object.assign(menuConfig, {
        is_enabled: newValue.is_enabled || false,
        button_text: newValue.button_text || '菜单',
        menu_type: newValue.menu_type || 'commands',
        web_app_url: newValue.web_app_url || ''
      })
      
      // 特别处理commands数组
      if (newValue.commands && Array.isArray(newValue.commands)) {
        menuConfig.commands = JSON.parse(JSON.stringify(newValue.commands))
      }
    } finally {
      // 延迟重置标记，确保更新完成
      setTimeout(() => {
        isInternalUpdate = false
      }, 50)
    }
  },
  { deep: true, immediate: true }
)

// 初始化数据
if (props.modelValue) {
  Object.assign(menuConfig, {
    is_enabled: props.modelValue.is_enabled || false,
    button_text: props.modelValue.button_text || '菜单',
    menu_type: props.modelValue.menu_type || 'commands',
    web_app_url: props.modelValue.web_app_url || ''
  })
  
  // 特别处理commands数组
  if (props.modelValue.commands && Array.isArray(props.modelValue.commands)) {
    menuConfig.commands = JSON.parse(JSON.stringify(props.modelValue.commands))
  }
}
</script>
