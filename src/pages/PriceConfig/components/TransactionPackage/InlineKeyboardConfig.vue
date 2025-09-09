<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <!-- 头部 -->
    <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z"/>
              </svg>
            </span>
            内嵌键盘配置
          </h3>
          <p class="text-sm text-gray-600 mt-1">为用户提供便捷的按钮选择界面</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">启用</span>
          <button
            @click="toggleEnabled"
            :class="[
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              config.enabled ? 'bg-indigo-600' : 'bg-gray-200'
            ]"
          >
            <span
              :class="[
                'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                config.enabled ? 'translate-x-5' : 'translate-x-1'
              ]"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div v-if="config.enabled" class="p-6">
      <div class="space-y-6">
        <!-- 快速配置 -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div>
              <h4 class="font-medium text-gray-900">快速配置</h4>
              <p class="text-sm text-gray-500">使用模板或智能生成快速设置</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="generateSmartButtons"
              class="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              智能生成
            </button>
            <div class="relative">
              <select
                @change="applySelectedTemplate"
                class="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">选择模板</option>
                <option v-for="template in keyboardTemplates" :key="template.id" :value="template.id">
                  {{ template.icon }} {{ template.name }}
                </option>
              </select>
              <svg class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-700">效果预览</span>
              <div class="ml-auto text-xs text-gray-500">{{ config.buttons.length }} 个按钮</div>
            </div>
          </div>
          
          <div class="p-4 bg-white">
            <!-- 消息内容 -->
            <div class="bg-blue-500 text-white rounded-lg p-3 mb-3 max-w-xs">
              <div class="text-sm font-medium">{{ config.title || '选择套餐' }}</div>
              <div v-if="config.description" class="text-xs opacity-90 mt-1">
                {{ config.description }}
              </div>
            </div>
            
            <!-- 按钮预览 -->
            <div v-if="config.buttons.length > 0" class="max-w-xs">
              <div 
                :class="[
                  'grid gap-1',
                  config.buttons_per_row === 1 ? 'grid-cols-1' :
                  config.buttons_per_row === 2 ? 'grid-cols-2' :
                  'grid-cols-3'
                ]"
              >
                <button
                  v-for="(button, index) in config.buttons.slice(0, 6)"
                  :key="index"
                  @click="simulateButtonClick(button)"
                  class="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-100 transition-colors"
                >
                  {{ button.text }}
                </button>
              </div>
              <div v-if="config.buttons.length > 6" class="text-xs text-gray-500 mt-2 text-center">
                还有 {{ config.buttons.length - 6 }} 个按钮...
              </div>
            </div>
            
            <!-- 模拟回复 -->
            <div v-if="showSimulatedReply" class="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded">
              机器人: {{ config.next_message || '请输入地址' }}
            </div>
          </div>
        </div>

        <!-- 键盘基础配置 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">键盘标题</label>
            <input
              :value="config.title"
              @input="updateConfig('title', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="选择交易笔数"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">描述信息</label>
            <input
              :value="config.description"
              @input="updateConfig('description', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="请选择您需要的交易笔数"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">用户选择后的提示消息</label>
          <input
            :value="config.next_message"
            @input="updateConfig('next_message', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="请输入能量接收地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">按钮布局</label>
          <select
            :value="config.buttons_per_row"
            @change="updateConfig('buttons_per_row', parseInt(($event.target as HTMLSelectElement).value))"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option :value="1">每行1个按钮（纵向排列）</option>
            <option :value="2">每行2个按钮（横向排列）</option>
            <option :value="3">每行3个按钮（紧凑排列）</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">控制内嵌键盘按钮的显示布局</p>
        </div>

        <!-- 按钮配置 -->
        <InlineKeyboardButtons
          :buttons="config.buttons"
          @update:buttons="updateButtons"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import InlineKeyboardButtons from './InlineKeyboardButtons.vue'

interface Button {
  id: string
  text: string
  callback_data: string
  transaction_count: number
  price: number
  description: string
}

interface InlineKeyboardConfigData {
  enabled: boolean
  keyboard_type: string
  title: string
  description: string
  buttons_per_row: number
  buttons: Button[]
  next_message: string
  validation: any
}

interface InlineKeyboardConfigProps {
  config: InlineKeyboardConfigData
  packages?: any[]
}

const props = defineProps<InlineKeyboardConfigProps>()
const emit = defineEmits<{
  'update:config': [config: InlineKeyboardConfigData]
}>()

const showSimulatedReply = ref(false)

// 键盘模板配置
const keyboardTemplates = ref([
  {
    id: 'basic',
    name: '基础套餐',
    icon: '💰',
    description: '1, 5, 10 笔的基础配置',
    buttonCount: 3,
    config: {
      title: '🔥 笔数套餐服务',
      description: '请选择您需要的交易笔数：',
      buttons_per_row: 1,
      buttons: [
        { id: generateId(), text: '1笔 - 100 TRX', callback_data: 'transaction_package_1', transaction_count: 1, price: 100, description: '单笔交易' },
        { id: generateId(), text: '5笔 - 450 TRX', callback_data: 'transaction_package_5', transaction_count: 5, price: 450, description: '小量套餐' },
        { id: generateId(), text: '10笔 - 850 TRX', callback_data: 'transaction_package_10', transaction_count: 10, price: 850, description: '标准套餐' }
      ]
    }
  },
  {
    id: 'premium',
    name: '高级套餐',
    icon: '💎',
    description: '包含大量笔数的高级配置',
    buttonCount: 5,
    config: {
      title: '💎 高级笔数套餐',
      description: '选择大量交易套餐，享受更多优惠：',
      buttons_per_row: 2,
      buttons: [
        { id: generateId(), text: '5笔 - 450 TRX', callback_data: 'transaction_package_5', transaction_count: 5, price: 450, description: '入门套餐' },
        { id: generateId(), text: '10笔 - 850 TRX', callback_data: 'transaction_package_10', transaction_count: 10, price: 850, description: '标准套餐' },
        { id: generateId(), text: '20笔 - 1600 TRX', callback_data: 'transaction_package_20', transaction_count: 20, price: 1600, description: '热门套餐' },
        { id: generateId(), text: '50笔 - 3750 TRX', callback_data: 'transaction_package_50', transaction_count: 50, price: 3750, description: '批量套餐' },
        { id: generateId(), text: '100笔 - 7000 TRX', callback_data: 'transaction_package_100', transaction_count: 100, price: 7000, description: '企业套餐' }
      ]
    }
  },
  {
    id: 'compact',
    name: '紧凑布局',
    icon: '📱',
    description: '每行3个按钮的紧凑布局',
    buttonCount: 6,
    config: {
      title: '📱 快速选择',
      description: '点击选择交易笔数：',
      buttons_per_row: 3,
      buttons: [
        { id: generateId(), text: '1笔', callback_data: 'transaction_package_1', transaction_count: 1, price: 100, description: '单笔' },
        { id: generateId(), text: '5笔', callback_data: 'transaction_package_5', transaction_count: 5, price: 450, description: '小包' },
        { id: generateId(), text: '10笔', callback_data: 'transaction_package_10', transaction_count: 10, price: 850, description: '标准' },
        { id: generateId(), text: '20笔', callback_data: 'transaction_package_20', transaction_count: 20, price: 1600, description: '热门' },
        { id: generateId(), text: '50笔', callback_data: 'transaction_package_50', transaction_count: 50, price: 3750, description: '批量' },
        { id: generateId(), text: '自定义', callback_data: 'transaction_package_custom', transaction_count: 0, price: 0, description: '自定义数量' }
      ]
    }
  }
])

// 生成唯一ID
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

const toggleEnabled = () => {
  const newConfig = { ...props.config, enabled: !props.config.enabled }
  emit('update:config', newConfig)
}

const updateConfig = (field: string, value: any) => {
  const newConfig = { ...props.config, [field]: value }
  emit('update:config', newConfig)
}

const updateButtons = (buttons: Button[]) => {
  const newConfig = { ...props.config, buttons }
  emit('update:config', newConfig)
}

const simulateButtonClick = (button: Button) => {
  showSimulatedReply.value = true
  setTimeout(() => {
    showSimulatedReply.value = false
  }, 3000)
}

const applySelectedTemplate = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const templateId = target.value
  if (!templateId) return
  
  const template = keyboardTemplates.value.find(t => t.id === templateId)
  if (template) {
    const newConfig = { ...props.config, ...template.config }
    emit('update:config', newConfig)
  }
  target.value = '' // 重置选择
}

const generateSmartButtons = () => {
  if (props.packages && props.packages.length > 0) {
    const buttons = props.packages.map((pkg: any) => ({
      id: generateId(),
      text: `${pkg.transaction_count}笔 - ${pkg.price} TRX`,
      callback_data: `transaction_package_${pkg.transaction_count}`,
      transaction_count: pkg.transaction_count,
      price: pkg.price,
      description: `${pkg.transaction_count}笔套餐`
    }))
    
    const newConfig = {
      ...props.config,
      buttons,
      title: '🔥 笔数套餐服务',
      description: '根据现有套餐智能生成的按钮配置'
    }
    emit('update:config', newConfig)
  }
}
</script>
