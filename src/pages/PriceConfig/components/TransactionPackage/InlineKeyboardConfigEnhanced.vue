<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <!-- 增强的头部 -->
    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-white">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold">智能内嵌键盘配置</h3>
            <p class="text-sm text-white/80">创建用户友好的Telegram按钮界面</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-white/80">启用状态</span>
            <button
              @click="toggleEnabled"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/30',
                config.enabled ? 'bg-white/30' : 'bg-white/10'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg',
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <div v-if="config.enabled" class="p-6">
      <!-- 配置状态指示器 -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-700">配置进度</h4>
          <span class="text-xs text-gray-500">{{ configCompletionPercentage }}% 完成</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: configCompletionPercentage + '%' }"
          ></div>
        </div>
        <div class="flex items-center gap-4 mt-2 text-xs">
          <div class="flex items-center gap-1">
            <div :class="['w-2 h-2 rounded-full', config.title ? 'bg-green-500' : 'bg-gray-300']"></div>
            <span class="text-gray-600">基础信息</span>
          </div>
          <div class="flex items-center gap-1">
            <div :class="['w-2 h-2 rounded-full', config.buttons.length > 0 ? 'bg-green-500' : 'bg-gray-300']"></div>
            <span class="text-gray-600">按钮配置</span>
          </div>
          <div class="flex items-center gap-1">
            <div :class="['w-2 h-2 rounded-full', config.next_message ? 'bg-green-500' : 'bg-gray-300']"></div>
            <span class="text-gray-600">响应消息</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 左侧：配置区域 -->
        <div class="space-y-6">
          <!-- 智能配置向导 -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-900">智能配置助手</h4>
                <p class="text-sm text-blue-600">快速生成专业的按钮配置</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                @click="generateSmartButtons"
                :disabled="!hasPackages"
                class="flex items-center justify-center gap-2 p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg class="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <span class="text-sm font-medium text-gray-700">智能生成</span>
              </button>
              
              <div class="relative">
                <select
                  @change="applySelectedTemplate"
                  class="w-full p-3 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">选择模板</option>
                  <option v-for="template in keyboardTemplates" :key="template.id" :value="template.id">
                    {{ template.icon }} {{ template.name }}
                  </option>
                </select>
                <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>
            
            <!-- 智能建议 -->
            <div v-if="suggestions.length > 0" class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <span class="text-sm font-medium text-amber-800">优化建议</span>
              </div>
              <ul class="space-y-1">
                <li v-for="suggestion in suggestions" :key="suggestion" class="text-xs text-amber-700 flex items-start gap-1">
                  <span class="text-amber-500 mt-0.5">•</span>
                  <span>{{ suggestion }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- 基础配置 -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </span>
              基础设置
            </h4>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  键盘标题 *
                  <span class="text-xs text-gray-500 ml-1">(用户看到的消息标题)</span>
                </label>
                <input
                  :value="config.title"
                  @input="updateConfig('title', ($event.target as HTMLInputElement).value)"
                  type="text"
                  placeholder="🔥 选择交易笔数"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  :class="{ 'border-red-300 focus:ring-red-500': !config.title }"
                />
                <p v-if="!config.title" class="text-xs text-red-600 mt-1">请输入键盘标题</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  描述信息
                  <span class="text-xs text-gray-500 ml-1">(可选，提供更多说明)</span>
                </label>
                <input
                  :value="config.description"
                  @input="updateConfig('description', ($event.target as HTMLInputElement).value)"
                  type="text"
                  placeholder="请选择您需要的交易笔数套餐"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  用户选择后的回复 *
                  <span class="text-xs text-gray-500 ml-1">(机器人自动发送的消息)</span>
                </label>
                <input
                  :value="config.next_message"
                  @input="updateConfig('next_message', ($event.target as HTMLInputElement).value)"
                  type="text"
                  placeholder="请输入能量接收地址"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  :class="{ 'border-red-300 focus:ring-red-500': !config.next_message }"
                />
                <p v-if="!config.next_message" class="text-xs text-red-600 mt-1">请输入回复消息</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">按钮布局</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="layout in layoutOptions"
                    :key="layout.value"
                    @click="updateConfig('buttons_per_row', layout.value)"
                    :class="[
                      'p-3 border rounded-lg text-center transition-all duration-200',
                      config.buttons_per_row === layout.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    ]"
                  >
                    <div class="text-lg mb-1">{{ layout.icon }}</div>
                    <div class="text-xs font-medium">{{ layout.name }}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 按钮配置 -->
          <EnhancedInlineKeyboardButtons
            :buttons="config.buttons"
            @update:buttons="updateButtons"
          />
        </div>

        <!-- 右侧：实时预览 -->
        <div class="space-y-6">
          <!-- Telegram风格预览 -->
          <div class="sticky top-4">
            <TelegramStylePreview
              :config="config"
              :show-simulated-reply="showSimulatedReply"
              @button-click="simulateButtonClick"
            />
            
            <!-- 配置统计 -->
            <div class="mt-4 grid grid-cols-3 gap-3">
              <div class="bg-gray-50 rounded-lg p-3 text-center">
                <div class="text-lg font-bold text-gray-900">{{ config.buttons.length }}</div>
                <div class="text-xs text-gray-600">按钮数量</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-3 text-center">
                <div class="text-lg font-bold text-gray-900">{{ Math.ceil(config.buttons.length / config.buttons_per_row) }}</div>
                <div class="text-xs text-gray-600">键盘行数</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-3 text-center">
                <div class="text-lg font-bold text-gray-900">{{ config.buttons_per_row }}</div>
                <div class="text-xs text-gray-600">每行按钮</div>
              </div>
            </div>
            
            <!-- 配置导出 -->
            <div class="mt-4 flex gap-2">
              <button
                @click="exportConfig"
                class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                📤 导出配置
              </button>
              <button
                @click="resetConfig"
                class="flex-1 px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
              >
                🔄 重置配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 未启用状态 -->
    <div v-else class="p-8 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">内嵌键盘未启用</h3>
      <p class="text-gray-600 mb-4">启用内嵌键盘后，用户可以通过点击按钮快速选择套餐，提升交互体验</p>
      <button
        @click="toggleEnabled"
        class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        立即启用
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import EnhancedInlineKeyboardButtons from './EnhancedInlineKeyboardButtons.vue'
import TelegramStylePreview from './TelegramStylePreview.vue'

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

// 布局选项
const layoutOptions = ref([
  { value: 1, name: '纵向', icon: '📝' },
  { value: 2, name: '横向', icon: '📱' },
  { value: 3, name: '紧凑', icon: '🔲' }
])

// 键盘模板配置（增强版本）
const keyboardTemplates = ref([
  {
    id: 'beginner',
    name: '新手友好',
    icon: '🌟',
    description: '适合新用户的简单配置',
    config: {
      title: '🔥 选择交易笔数',
      description: '新用户专享，简单易懂',
      buttons_per_row: 1,
      next_message: '请输入您的TRON地址',
      buttons: [
        { id: generateId(), text: '1笔 - 100 TRX', callback_data: 'tx_1', transaction_count: 1, price: 100, description: '试用套餐' },
        { id: generateId(), text: '5笔 - 450 TRX (省50)', callback_data: 'tx_5', transaction_count: 5, price: 450, description: '小量优惠' }
      ]
    }
  },
  {
    id: 'popular',
    name: '热门推荐',
    icon: '🔥',
    description: '最受欢迎的配置方案',
    config: {
      title: '💎 热门套餐推荐',
      description: '99%用户的选择，性价比最高',
      buttons_per_row: 2,
      next_message: '请输入能量接收地址',
      buttons: [
        { id: generateId(), text: '5笔 - 450 TRX', callback_data: 'tx_5', transaction_count: 5, price: 450, description: '入门首选' },
        { id: generateId(), text: '10笔 - 850 TRX', callback_data: 'tx_10', transaction_count: 10, price: 850, description: '最受欢迎' },
        { id: generateId(), text: '20笔 - 1600 TRX', callback_data: 'tx_20', transaction_count: 20, price: 1600, description: '高频用户' },
        { id: generateId(), text: '50笔 - 3750 TRX', callback_data: 'tx_50', transaction_count: 50, price: 3750, description: '企业推荐' }
      ]
    }
  },
  {
    id: 'enterprise',
    name: '企业专用',
    icon: '🏢',
    description: '适合大量交易的企业用户',
    config: {
      title: '🏢 企业级套餐',
      description: '大量交易，超值优惠',
      buttons_per_row: 3,
      next_message: '请提供企业TRON地址',
      buttons: [
        { id: generateId(), text: '50笔', callback_data: 'tx_50', transaction_count: 50, price: 3750, description: '中等企业' },
        { id: generateId(), text: '100笔', callback_data: 'tx_100', transaction_count: 100, price: 7000, description: '大型企业' },
        { id: generateId(), text: '200笔', callback_data: 'tx_200', transaction_count: 200, price: 13000, description: '超大企业' },
        { id: generateId(), text: '500笔', callback_data: 'tx_500', transaction_count: 500, price: 30000, description: '集团客户' },
        { id: generateId(), text: '1000笔', callback_data: 'tx_1000', transaction_count: 1000, price: 55000, description: '旗舰套餐' },
        { id: generateId(), text: '定制方案', callback_data: 'tx_custom', transaction_count: 0, price: 0, description: '联系客服' }
      ]
    }
  }
])

// 计算配置完成度
const configCompletionPercentage = computed(() => {
  let score = 0
  if (config.value.title) score += 25
  if (config.value.buttons.length > 0) score += 50
  if (config.value.next_message) score += 25
  return score
})

// 计算是否有套餐数据
const hasPackages = computed(() => {
  return props.packages && props.packages.length > 0
})

// 智能建议
const suggestions = computed(() => {
  const hints = []
  
  if (config.value.buttons.length === 0) {
    hints.push('建议添加至少2-4个按钮选项')
  }
  
  if (config.value.buttons.length > 8) {
    hints.push('按钮过多可能影响用户体验，建议控制在8个以内')
  }
  
  if (!config.value.title) {
    hints.push('添加吸引人的标题能提升用户点击率')
  }
  
  if (config.value.buttons_per_row === 1 && config.value.buttons.length > 5) {
    hints.push('按钮较多时建议使用横向布局节省空间')
  }
  
  if (config.value.buttons_per_row === 3 && config.value.buttons.some(b => b.text.length > 10)) {
    hints.push('紧凑布局时建议使用较短的按钮文本')
  }
  
  return hints
})

// 响应式配置对象
const config = computed(() => props.config)

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
      description: `${pkg.transaction_count}笔套餐，性价比高`
    }))
    
    const newConfig = {
      ...props.config,
      buttons,
      title: '🔥 笔数套餐服务',
      description: '基于您的套餐配置智能生成',
      next_message: '请输入能量接收地址'
    }
    emit('update:config', newConfig)
  }
}

const exportConfig = () => {
  const configData = JSON.stringify(props.config, null, 2)
  const blob = new Blob([configData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'keyboard-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

const resetConfig = () => {
  if (confirm('确定要重置所有配置吗？此操作不可撤销。')) {
    const newConfig = {
      ...props.config,
      title: '',
      description: '',
      buttons: [],
      next_message: '',
      buttons_per_row: 1
    }
    emit('update:config', newConfig)
  }
}

// 监听配置变化，提供实时反馈
watch(() => props.config, (newConfig) => {
  // 这里可以添加配置变化的副作用，比如验证、提示等
  console.log('Configuration updated:', newConfig)
}, { deep: true })
</script>

<style scoped>
/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

/* 渐变文本效果 */
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
