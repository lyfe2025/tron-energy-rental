<!--
 * 键盘配置编辑器组件
 * 职责：提供机器人键盘配置的可视化编辑界面
-->
<template>
  <div class="space-y-6">
    <!-- 键盘配置标题 -->
    <div class="flex items-center gap-2 mb-4">
      <Keyboard class="w-5 h-5 text-indigo-600" />
      <h4 class="text-lg font-semibold text-gray-900">🎹 键盘配置</h4>
    </div>

    <!-- 键盘预览 -->
    <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div class="flex items-center gap-2 mb-3">
        <Monitor class="w-4 h-4 text-blue-600" />
        <span class="text-sm font-medium text-gray-800">📱 键盘预览</span>
      </div>
      
      <div class="bg-white p-4 rounded-lg border shadow-inner max-w-md">
        <div class="space-y-2">
          <div 
            v-for="(row, rowIndex) in keyboardConfig.main_menu.rows" 
            :key="rowIndex"
            class="flex gap-2 justify-center"
          >
            <button
              v-for="(button, buttonIndex) in row.buttons"
              :key="buttonIndex"
              :class="[
                'px-3 py-2 text-sm rounded-md border transition-colors',
                isButtonEnabled(button) 
                  ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' 
                  : 'bg-gray-100 border-gray-300 text-gray-500'
              ]"
              :disabled="!isButtonEnabled(button)"
            >
              {{ button.text }}
            </button>
          </div>
        </div>
      </div>
      
      <div class="mt-3 text-xs text-gray-500">
        💡 预览效果：绿色为启用状态，灰色为禁用状态（价格配置未开启）
      </div>
    </div>

    <!-- 主菜单配置 -->
    <div class="bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Menu class="w-4 h-4 text-green-600" />
          <h5 class="text-md font-semibold text-gray-800">主菜单键盘</h5>
        </div>
        <label class="flex items-center">
          <input
            v-model="keyboardConfig.main_menu.is_enabled"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span class="ml-2 text-sm text-gray-700">启用主菜单</span>
        </label>
      </div>

      <!-- 键盘类型选择 -->
      <div v-if="keyboardConfig.main_menu.is_enabled" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">键盘类型</label>
        <select
          v-model="keyboardConfig.main_menu.type"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="reply">回复键盘 (Reply Keyboard)</option>
          <option value="inline">内嵌键盘 (Inline Keyboard)</option>
        </select>
        <p class="mt-1 text-sm text-gray-500">
          {{ keyboardConfig.main_menu.type === 'inline' ? '内嵌键盘显示在消息下方，支持回调功能' : '回复键盘替换用户输入框，点击后发送文本消息' }}
        </p>
      </div>

      <!-- 键盘行配置 -->
      <div v-if="keyboardConfig.main_menu.is_enabled" class="space-y-4">
        <div 
          v-for="(row, rowIndex) in keyboardConfig.main_menu.rows" 
          :key="rowIndex"
          class="border border-gray-200 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-700">第 {{ rowIndex + 1 }} 行</span>
            <div class="flex items-center gap-2">
              <label class="flex items-center">
                <input
                  v-model="row.is_enabled"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span class="ml-2 text-xs text-gray-600">启用</span>
              </label>
              <button
                type="button"
                @click="removeRow(rowIndex)"
                class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                删除行
              </button>
            </div>
          </div>

          <!-- 按钮配置 -->
          <div v-if="row.is_enabled" class="space-y-3">
            <div 
              v-for="(button, buttonIndex) in row.buttons" 
              :key="buttonIndex"
              class="bg-gray-50 p-3 rounded border"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">按钮文本</label>
                  <input
                    v-model="button.text"
                    type="text"
                    placeholder="按钮显示文字"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div v-if="keyboardConfig.main_menu.type === 'inline'">
                  <label class="block text-xs font-medium text-gray-700 mb-1">回调数据</label>
                  <input
                    v-model="button.callback_data"
                    type="text"
                    placeholder="callback_data"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div v-else class="text-xs text-gray-500 p-2 bg-blue-50 rounded border border-blue-200">
                  <div class="flex items-center gap-1">
                    <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>回复键盘模式：点击按钮将发送按钮文本</span>
                  </div>
                </div>
                
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">价格依赖</label>
                  <select
                    v-model="button.price_config_dependency"
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">无依赖</option>
                    <option value="energy_flash">能量闪租</option>
                    <option value="transaction_package">笔数套餐</option>
                    <option value="trx_exchange">TRX闪兑</option>
                  </select>
                </div>
              </div>
              
              <div class="mt-3 flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <label class="flex items-center">
                    <input
                      v-model="button.is_enabled"
                      type="checkbox"
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span class="ml-2 text-xs text-gray-600">启用按钮</span>
                  </label>
                  
                  <div v-if="button.price_config_dependency" class="flex items-center gap-1">
                    <span :class="getPriceConfigStatusColor(button.price_config_dependency)" class="w-2 h-2 rounded-full"></span>
                    <span class="text-xs text-gray-500">
                      {{ getPriceConfigStatusText(button.price_config_dependency) }}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  @click="removeButton(rowIndex, buttonIndex)"
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  删除按钮
                </button>
              </div>
            </div>
            
            <!-- 添加按钮 -->
            <button
              type="button"
              @click="addButton(rowIndex)"
              class="w-full py-2 text-sm border-2 border-dashed border-gray-300 rounded hover:border-blue-400 text-gray-500 hover:text-blue-600 transition-colors"
            >
              + 添加按钮
            </button>
          </div>
        </div>
        
        <!-- 添加行按钮 -->
        <button
          type="button"
          @click="addRow"
          class="w-full py-3 text-sm border-2 border-dashed border-gray-400 rounded hover:border-blue-500 text-gray-600 hover:text-blue-700 transition-colors"
        >
          + 添加新行
        </button>
      </div>
    </div>

    <!-- 配置统计 -->
    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <div class="flex items-start gap-2">
        <BarChart class="w-4 h-4 text-blue-600 mt-0.5" />
        <div class="text-sm text-blue-800">
          <div class="font-medium mb-1">配置统计</div>
          <div class="text-blue-700 space-y-1">
            <div>• 键盘行数：{{ keyboardConfig.main_menu.rows.length }}</div>
            <div>• 按钮总数：{{ getTotalButtons() }}</div>
            <div>• 启用按钮：{{ getEnabledButtons() }}</div>
            <div>• 价格依赖按钮：{{ getDependentButtons() }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarChart, Keyboard, Menu, Monitor } from 'lucide-vue-next';
import { onMounted, reactive, watch } from 'vue';

// 按钮接口定义
interface KeyboardButton {
  text: string
  callback_data: string
  is_enabled: boolean
  price_config_dependency?: string
}

// 键盘行接口
interface KeyboardRow {
  is_enabled: boolean
  buttons: KeyboardButton[]
}

// 主菜单配置接口
interface MainMenuConfig {
  type: string
  title: string
  description: string
  is_enabled: boolean
  rows: KeyboardRow[]
}

// 键盘配置接口
interface KeyboardConfig {
  main_menu: MainMenuConfig
  inline_keyboards: Record<string, any>
  reply_keyboards: Record<string, any>
  quick_actions: any[]
}

// Props接口
interface Props {
  modelValue: KeyboardConfig
  priceConfigs?: { [key: string]: boolean } // 价格配置状态
}

const props = withDefaults(defineProps<Props>(), {
  priceConfigs: () => ({})
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: KeyboardConfig]
}>()

// 键盘配置数据
const keyboardConfig = reactive<KeyboardConfig>({
  main_menu: {
    type: 'reply',
    title: 'TRON资源租赁主菜单',
    description: '选择您需要的服务',
    is_enabled: true,
    rows: [
      {
        is_enabled: true,
        buttons: [
          {
            text: '⚡ 能量闪租',
            callback_data: 'energy_flash',
            is_enabled: true,
            price_config_dependency: 'energy_flash'
          },
          {
            text: '🔥 笔数套餐',
            callback_data: 'transaction_package',
            is_enabled: true,
            price_config_dependency: 'transaction_package'
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '🔄 TRX闪兑',
            callback_data: 'trx_exchange',
            is_enabled: true,
            price_config_dependency: 'trx_exchange'
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '📋 我的订单',
            callback_data: 'my_orders',
            is_enabled: true,
            price_config_dependency: undefined
          },
          {
            text: '💰 账户余额',
            callback_data: 'check_balance',
            is_enabled: true,
            price_config_dependency: undefined
          }
        ]
      },
      {
        is_enabled: true,
        buttons: [
          {
            text: '❓ 帮助支持',
            callback_data: 'help_support',
            is_enabled: true,
            price_config_dependency: undefined
          },
          {
            text: '🔄 刷新菜单',
            callback_data: 'refresh_menu',
            is_enabled: true,
            price_config_dependency: undefined
          }
        ]
      }
    ]
  },
  inline_keyboards: {},
  reply_keyboards: {},
  quick_actions: []
})

// 检查按钮是否应该启用
const isButtonEnabled = (button: KeyboardButton): boolean => {
  if (!button.is_enabled) return false
  if (!button.price_config_dependency) return true
  return props.priceConfigs[button.price_config_dependency] || false
}

// 获取价格配置状态颜色
const getPriceConfigStatusColor = (dependency: string): string => {
  return props.priceConfigs[dependency] ? 'bg-green-500' : 'bg-red-500'
}

// 获取价格配置状态文本
const getPriceConfigStatusText = (dependency: string): string => {
  return props.priceConfigs[dependency] ? '已启用' : '未启用'
}

// 添加新行
const addRow = () => {
  keyboardConfig.main_menu.rows.push({
    is_enabled: true,
    buttons: []
  })
}

// 删除行
const removeRow = (rowIndex: number) => {
  keyboardConfig.main_menu.rows.splice(rowIndex, 1)
}

// 添加按钮
const addButton = (rowIndex: number) => {
  const newButton: KeyboardButton = {
    text: '新按钮',
    callback_data: 'new_action',
    is_enabled: true,
    price_config_dependency: undefined
  }
  keyboardConfig.main_menu.rows[rowIndex].buttons.push(newButton)
}

// 删除按钮
const removeButton = (rowIndex: number, buttonIndex: number) => {
  keyboardConfig.main_menu.rows[rowIndex].buttons.splice(buttonIndex, 1)
}

// 统计函数
const getTotalButtons = (): number => {
  return keyboardConfig.main_menu.rows.reduce((total, row) => total + row.buttons.length, 0)
}

const getEnabledButtons = (): number => {
  return keyboardConfig.main_menu.rows.reduce(
    (total, row) => total + row.buttons.filter(btn => btn.is_enabled).length, 
    0
  )
}

const getDependentButtons = (): number => {
  return keyboardConfig.main_menu.rows.reduce(
    (total, row) => total + row.buttons.filter(btn => btn.price_config_dependency !== undefined && btn.price_config_dependency !== '').length, 
    0
  )
}

// 监听配置变化，同步到父组件
let isUpdatingFromParent = false

watch(
  () => keyboardConfig,
  (newConfig) => {
    if (!isUpdatingFromParent) {
      emit('update:modelValue', JSON.parse(JSON.stringify(newConfig)))
    }
  },
  { deep: true }
)

// 监听外部数据变化
watch(
  () => props.modelValue,
  (newValue) => {
    isUpdatingFromParent = true
    if (newValue) {
      // 深度合并数据，特别处理数组类型
      if (newValue.main_menu) {
        Object.assign(keyboardConfig.main_menu, newValue.main_menu)
        // 特别处理 rows 数组
        if (newValue.main_menu.rows && Array.isArray(newValue.main_menu.rows)) {
          keyboardConfig.main_menu.rows = JSON.parse(JSON.stringify(newValue.main_menu.rows))
        }
      }
      if (newValue.inline_keyboards) {
        keyboardConfig.inline_keyboards = newValue.inline_keyboards
      }
      if (newValue.reply_keyboards) {
        keyboardConfig.reply_keyboards = newValue.reply_keyboards
      }
      if (newValue.quick_actions) {
        keyboardConfig.quick_actions = newValue.quick_actions
      }
    }
    // 使用nextTick确保更新完成后再重置标志
    setTimeout(() => {
      isUpdatingFromParent = false
    }, 0)
  },
  { deep: true, immediate: true }
)

// 组件挂载时初始化数据
onMounted(() => {
  isUpdatingFromParent = true
  if (props.modelValue) {
    // 深度合并数据，特别处理数组类型
    if (props.modelValue.main_menu) {
      Object.assign(keyboardConfig.main_menu, props.modelValue.main_menu)
      // 特别处理 rows 数组
      if (props.modelValue.main_menu.rows && Array.isArray(props.modelValue.main_menu.rows)) {
        keyboardConfig.main_menu.rows = JSON.parse(JSON.stringify(props.modelValue.main_menu.rows))
      }
    }
    if (props.modelValue.inline_keyboards) {
      keyboardConfig.inline_keyboards = props.modelValue.inline_keyboards
    }
    if (props.modelValue.reply_keyboards) {
      keyboardConfig.reply_keyboards = props.modelValue.reply_keyboards
    }
    if (props.modelValue.quick_actions) {
      keyboardConfig.quick_actions = props.modelValue.quick_actions
    }
  }
  
  // 初始化完成后重置标志
  setTimeout(() => {
    isUpdatingFromParent = false
  }, 0)
})
</script>

<style scoped>
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  @apply ring-2 ring-blue-500 border-transparent;
}
</style>
