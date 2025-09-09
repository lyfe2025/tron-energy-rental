<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">笔数套餐模式</h2>
        <p class="text-gray-600 text-sm mt-1">简洁高效的套餐配置界面</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">启用状态</span>
        <button
          @click="handleToggle"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config?.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <div v-if="config" class="flex flex-col lg:flex-row gap-6">
      <!-- 左侧：实时预览 -->
      <div class="lg:w-1/2">
        <div class="bg-gray-50 p-4 rounded-lg sticky top-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            📱 Telegram 预览效果
            <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">实时同步</span>
          </h3>
          
          <!-- Telegram风格预览 -->
          <div class="bg-white rounded-lg border shadow-sm max-w-sm">
            <!-- 机器人头部 -->
            <div class="bg-blue-500 text-white px-4 py-3 rounded-t-lg">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span class="text-xs">🤖</span>
                </div>
                <div>
                  <div class="text-sm font-medium">TRON能量租赁机器人</div>
                  <div class="text-xs text-blue-100">在线</div>
                </div>
              </div>
            </div>
            
            <!-- 消息内容 -->
            <div class="p-4 space-y-3 max-h-96 overflow-y-auto">
              <!-- 机器人消息 -->
              <div class="flex gap-2">
                <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-white text-xs">🤖</span>
                </div>
                <div class="flex-1">
                  <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
                    <!-- 红色横幅图片模拟 -->
                    <div class="bg-red-500 text-white text-center py-2 px-3 rounded mb-2 text-xs font-bold">
                      笔数套餐 转账0手续费<br>
                      转U不扣TRX
                    </div>
                    
                    <!-- 标题 -->
                    <div class="font-bold text-sm mb-1">
                      🔥 {{ displayTitle }} 🔥（{{ isUnlimited ? '无时间限制' : '有时间限制' }}）
                    </div>
                    
                    <!-- 副标题 -->
                    <div class="text-xs text-gray-600 mb-2">
                      （24小时不使用，则扣{{ dailyFee }}笔占费）
                    </div>
                    
                    <!-- 使用规则 -->
                    <div class="space-y-1 mb-2">
                      <div class="text-xs text-red-600 flex items-start gap-1">
                        <span class="text-red-500 mt-0.5">🔺</span>
                        <span>对方有U没U都是扣除一笔转账</span>
                      </div>
                      <div class="text-xs text-red-600 flex items-start gap-1">
                        <span class="text-red-500 mt-0.5">🔺</span>
                        <span>转移笔数到其他地址请联系客服</span>
                      </div>
                      <div class="text-xs text-red-600 flex items-start gap-1">
                        <span class="text-red-500 mt-0.5">🔺</span>
                        <span>为他人购买，填写他人地址即可</span>
                      </div>
                    </div>
                    
                    <!-- 使用说明 -->
                    <div class="text-xs text-yellow-600 mb-3 flex items-start gap-1">
                      <span class="text-yellow-500 mt-0.5">💡</span>
                      <span>笔数开/关按钮，可查询账单，开/关笔数</span>
                    </div>
                    
                    <!-- 内嵌键盘 -->
                    <div class="space-y-1">
                      <!-- 前面的按钮（2列布局） -->
                      <div class="grid grid-cols-2 gap-1">
                        <button
                          v-for="button in regularButtons"
                          :key="button.id"
                          @click="simulateButtonClick(button)"
                          class="bg-green-100 border border-green-300 text-green-800 px-3 py-2 rounded text-xs font-medium hover:bg-green-200 transition-colors"
                        >
                          {{ button.count }}笔
                        </button>
                      </div>
                      
                      <!-- 最后的特殊按钮（全宽） -->
                      <button
                        v-if="specialButton"
                        @click="simulateButtonClick(specialButton)"
                        class="w-full bg-green-100 border border-green-300 text-green-800 px-3 py-2 rounded text-xs font-medium hover:bg-green-200 transition-colors"
                      >
                        {{ specialButton.count }}笔
                      </button>
                    </div>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">{{ currentTime }}</div>
                </div>
              </div>
              
              <!-- 模拟用户选择后的回复 -->
              <div v-if="showReply" class="flex gap-2 animate-fade-in">
                <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-white text-xs">🤖</span>
                </div>
                <div class="flex-1">
                  <div class="bg-gray-100 rounded-lg p-2 max-w-xs">
                    <div class="text-xs">{{ replyMessage }}</div>
                  </div>
                  <div class="text-xs text-gray-400 mt-1">{{ currentTime }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：简化配置 -->
      <div class="lg:w-1/2 space-y-4">
        <!-- 基础设置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">📝 基础设置</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">套餐标题</label>
              <input
                v-model="displayTitle"
                type="text"
                placeholder="笔数套餐"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">占费(笔/24h)</label>
                <input
                  v-model.number="dailyFee"
                  type="number"
                  min="0"
                  step="0.1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div class="flex items-center pt-6">
                <label class="flex items-center">
                  <input
                    v-model="isUnlimited"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span class="ml-2 text-sm text-gray-700">无时间限制</span>
                </label>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">选择后回复消息</label>
              <input
                v-model="replyMessage"
                type="text"
                placeholder="请输入能量接收地址:"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- 按钮配置 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">🔘 按钮配置</h3>
            <button
              @click="addButton"
              class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              ➕ 添加按钮
            </button>
          </div>
          
          <!-- 按钮列表 -->
          <div class="space-y-3 max-h-64 overflow-y-auto">
            <div
              v-for="(button, index) in buttons"
              :key="button.id"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <input
                v-model.number="button.count"
                type="number"
                min="1"
                placeholder="笔数"
                class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-500">笔</span>
              
              <input
                v-model.number="button.price"
                type="number"
                min="0"
                step="0.1"
                placeholder="价格"
                class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-500">TRX</span>
              
              <div class="flex items-center gap-1">
                <label class="flex items-center">
                  <input
                    v-model="button.isSpecial"
                    type="checkbox"
                    class="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span class="ml-1 text-xs text-gray-600">全宽</span>
                </label>
              </div>
              
              <button
                @click="removeButton(index)"
                class="ml-auto text-red-600 hover:text-red-800 text-sm"
              >
                🗑️
              </button>
            </div>
          </div>
          
          <!-- 快速模板 -->
          <div class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-medium text-gray-700">快速模板:</span>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button
                @click="applyTemplate('basic')"
                class="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
              >
                基础套餐
              </button>
              <button
                @click="applyTemplate('popular')"
                class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
              >
                热门套餐
              </button>
              <button
                @click="applyTemplate('enterprise')"
                class="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200"
              >
                企业套餐
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <button
        @click="handleSave"
        :disabled="saving"
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { ConfigCardProps } from '../../types';

const props = defineProps<ConfigCardProps>()

// 解构props以便访问函数和属性
const { onToggle, onSave, config, saving } = props

// 响应式数据
const displayTitle = ref('笔数套餐')
const dailyFee = ref(1)
const isUnlimited = ref(true)
const replyMessage = ref('请输入能量接收地址:')
const showReply = ref(false)
const currentTime = ref('')

interface Button {
  id: string
  count: number
  price: number
  isSpecial: boolean
}

// 根据真实截图配置7个按钮：10笔、20笔、50笔、100笔、200笔、300笔、500笔（最后一个全宽）
const buttons = ref<Button[]>([
  { id: '1', count: 10, price: 200, isSpecial: false },
  { id: '2', count: 20, price: 380, isSpecial: false },
  { id: '3', count: 50, price: 900, isSpecial: false },
  { id: '4', count: 100, price: 1700, isSpecial: false },
  { id: '5', count: 200, price: 3200, isSpecial: false },
  { id: '6', count: 300, price: 4500, isSpecial: false },
  { id: '7', count: 500, price: 7000, isSpecial: true }
])

// 计算属性
const regularButtons = computed(() => buttons.value.filter(b => !b.isSpecial))
const specialButton = computed(() => buttons.value.find(b => b.isSpecial))

const handleToggle = () => {
  onToggle('transaction_package')
}

const handleSave = () => {
  // 构建配置数据
  if (config) {
    // 更新基础配置
    config.config.daily_fee = dailyFee.value
    config.config.display_texts = {
      title: `🔥 ${displayTitle.value} 🔥（${isUnlimited.value ? '无时间限制' : '有时间限制'}）`,
      subtitle: `（24小时不使用，则扣${dailyFee.value}笔占费）`,
      usage_title: '💡 笔数开/关按钮，可查询账单，开/关笔数',
      address_prompt: replyMessage.value
    }
    
    // 更新套餐数据
    config.config.packages = buttons.value.map(button => ({
      name: `${button.count}笔套餐`,
      transaction_count: button.count,
      price: button.price,
      currency: 'TRX'
    }))
    
    // 更新内嵌键盘配置
    config.inline_keyboard_config = {
      enabled: true,
      keyboard_type: 'transaction_count_selection',
      title: `🔥 ${displayTitle.value} 🔥`,
      description: `选择您需要的交易笔数`,
      buttons_per_row: 2,
      buttons: buttons.value.map(button => ({
        id: button.id,
        text: `${button.count}笔`,
        callback_data: `transaction_package_${button.count}`,
        transaction_count: button.count,
        price: button.price,
        description: `${button.count}笔套餐`
      })),
      next_message: replyMessage.value,
      validation: {
        address_required: true,
        min_transaction_count: 1,
        max_transaction_count: 1000
      }
    }
  }
  
  onSave('transaction_package')
}

const simulateButtonClick = (button: Button) => {
  showReply.value = true
  setTimeout(() => {
    showReply.value = false
  }, 3000)
}

const addButton = () => {
  const newId = Date.now().toString()
  buttons.value.push({
    id: newId,
    count: 10,
    price: 200,
    isSpecial: false
  })
}

const removeButton = (index: number) => {
  buttons.value.splice(index, 1)
}

const applyTemplate = (templateType: string) => {
  switch (templateType) {
    case 'basic':
      buttons.value = [
        { id: '1', count: 5, price: 100, isSpecial: false },
        { id: '2', count: 10, price: 190, isSpecial: false },
        { id: '3', count: 20, price: 360, isSpecial: false },
        { id: '4', count: 50, price: 850, isSpecial: true }
      ]
      break
    case 'popular':
      buttons.value = [
        { id: '1', count: 10, price: 200, isSpecial: false },
        { id: '2', count: 20, price: 380, isSpecial: false },
        { id: '3', count: 50, price: 900, isSpecial: false },
        { id: '4', count: 100, price: 1700, isSpecial: false },
        { id: '5', count: 200, price: 3200, isSpecial: false },
        { id: '6', count: 300, price: 4500, isSpecial: false },
        { id: '7', count: 500, price: 7000, isSpecial: true }
      ]
      break
    case 'enterprise':
      buttons.value = [
        { id: '1', count: 100, price: 1700, isSpecial: false },
        { id: '2', count: 200, price: 3200, isSpecial: false },
        { id: '3', count: 500, price: 7000, isSpecial: false },
        { id: '4', count: 1000, price: 13000, isSpecial: false },
        { id: '5', count: 2000, price: 24000, isSpecial: false },
        { id: '6', count: 5000, price: 55000, isSpecial: true }
      ]
      break
  }
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

onMounted(() => {
  updateTime()
  setInterval(updateTime, 60000)
})
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
