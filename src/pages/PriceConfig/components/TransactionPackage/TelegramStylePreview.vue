<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-lg">
    <!-- Telegram应用头部 -->
    <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.568 8.16c-.72 3.984-1.44 7.2-1.68 8.4-.096.48-.288.576-.48.6-.48.072-.96-.096-1.44-.384-1.92-1.2-3.12-1.92-4.8-3.12-.72-.48-.24-1.2.144-1.68.096-.12 1.8-1.68 3.6-3.36.192-.192.096-.48-.192-.384-2.4 1.536-4.8 3.264-6.72 4.8-.576.384-1.104.576-1.68.192-.864-.48-1.68-1.056-2.4-1.44-.912-.48-.912-1.44 0-1.92 3.6-1.44 7.2-2.88 10.8-4.32 1.44-.576 2.88.384 2.4 2.16z"/>
          </svg>
        </div>
        <div>
          <div class="font-medium text-sm">TRON能量租赁机器人</div>
          <div class="text-xs text-blue-100">在线 • 最后活跃时间: 刚刚</div>
        </div>
      </div>
    </div>

    <!-- 聊天界面 -->
    <div class="bg-gray-50 min-h-[400px] max-h-[500px] overflow-y-auto custom-scrollbar">
      <!-- 聊天背景图案 -->
      <div class="absolute inset-0 opacity-5">
        <svg class="w-full h-full" viewBox="0 0 100 100" fill="none">
          <pattern id="chat-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="currentColor"/>
          </pattern>
          <rect width="100" height="100" fill="url(#chat-pattern)"/>
        </svg>
      </div>

      <div class="relative p-4 space-y-4">
        <!-- 机器人消息：键盘消息 -->
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.568 8.16c-.72 3.984-1.44 7.2-1.68 8.4-.096.48-.288.576-.48.6-.48.072-.96-.096-1.44-.384-1.92-1.2-3.12-1.92-4.8-3.12-.72-.48-.24-1.2.144-1.68.096-.12 1.8-1.68 3.6-3.36.192-.192.096-.48-.192-.384-2.4 1.536-4.8 3.264-6.72 4.8-.576.384-1.104.576-1.68.192-.864-.48-1.68-1.056-2.4-1.44-.912-.48-.912-1.44 0-1.92 3.6-1.44 7.2-2.88 10.8-4.32 1.44-.576 2.88.384 2.4 2.16z"/>
            </svg>
          </div>
          <div class="max-w-xs">
            <!-- 消息气泡 -->
            <div class="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-200">
              <div class="text-sm font-medium text-gray-900 mb-1">
                {{ config.title || '选择套餐' }}
              </div>
              <div v-if="config.description" class="text-xs text-gray-600 mb-3">
                {{ config.description }}
              </div>
              
              <!-- 内嵌键盘 -->
              <div v-if="config.buttons.length > 0" class="space-y-1">
                <div 
                  v-for="(row, rowIndex) in buttonRows"
                  :key="rowIndex"
                  class="flex gap-1"
                >
                  <button
                    v-for="(button, buttonIndex) in row"
                    :key="button.id"
                    @click="handleButtonClick(button)"
                    :class="[
                      'flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-700 transition-all duration-200 font-medium text-center',
                      'hover:shadow-sm active:scale-95'
                    ]"
                  >
                    {{ button.text }}
                  </button>
                </div>
                
                <!-- 返回主菜单按钮 -->
                <button 
                  class="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm text-gray-700 transition-colors font-medium mt-2"
                >
                  🔙 返回主菜单
                </button>
              </div>
              
              <!-- 空状态 -->
              <div v-else class="text-center py-4 text-gray-500">
                <div class="text-2xl mb-2">⚙️</div>
                <div class="text-xs">暂无按钮配置</div>
              </div>
            </div>
            
            <!-- 时间戳 -->
            <div class="text-xs text-gray-400 mt-1 ml-2">
              {{ currentTime }}
            </div>
          </div>
        </div>

        <!-- 模拟用户点击后的回复 -->
        <div v-if="showSimulatedReply" class="flex items-start gap-3 animate-slide-in">
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.568 8.16c-.72 3.984-1.44 7.2-1.68 8.4-.096.48-.288.576-.48.6-.48.072-.96-.096-1.44-.384-1.92-1.2-3.12-1.92-4.8-3.12-.72-.48-.24-1.2.144-1.68.096-.12 1.8-1.68 3.6-3.36.192-.192.096-.48-.192-.384-2.4 1.536-4.8 3.264-6.72 4.8-.576.384-1.104.576-1.68.192-.864-.48-1.68-1.056-2.4-1.44-.912-.48-.912-1.44 0-1.92 3.6-1.44 7.2-2.88 10.8-4.32 1.44-.576 2.88.384 2.4 2.16z"/>
            </svg>
          </div>
          <div class="max-w-xs">
            <div class="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-gray-200">
              <div class="text-sm text-gray-900">
                {{ config.next_message || '请输入地址' }}
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1 ml-2">
              {{ currentTime }}
            </div>
          </div>
        </div>

        <!-- 输入提示 -->
        <div class="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
          <div class="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </div>
          <div class="flex-1 text-sm text-gray-500">点击上方按钮进行选择...</div>
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览工具栏 -->
    <div class="bg-gray-100 px-4 py-3 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          <span>实时预览</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span class="text-gray-600">{{ config.buttons.length }} 个按钮</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span class="text-gray-600">{{ Math.ceil(config.buttons.length / config.buttons_per_row) }} 行</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface Button {
  id: string
  text: string
  callback_data: string
  transaction_count: number
  price: number
  description: string
}

interface Config {
  title: string
  description: string
  buttons: Button[]
  buttons_per_row: number
  next_message: string
}

interface TelegramStylePreviewProps {
  config: Config
  showSimulatedReply: boolean
}

const props = defineProps<TelegramStylePreviewProps>()
const emit = defineEmits<{
  'button-click': [button: Button]
}>()

const currentTime = ref('')

// 计算按钮行布局
const buttonRows = computed(() => {
  const rows = []
  const buttonsPerRow = props.config.buttons_per_row || 1
  
  for (let i = 0; i < props.config.buttons.length; i += buttonsPerRow) {
    rows.push(props.config.buttons.slice(i, i + buttonsPerRow))
  }
  
  return rows
})

// 处理按钮点击
const handleButtonClick = (button: Button) => {
  // 添加点击动画效果
  const event = new CustomEvent('telegram-button-click', { detail: button })
  document.dispatchEvent(event)
  
  emit('button-click', button)
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

onMounted(() => {
  updateTime()
  // 每分钟更新一次时间
  setInterval(updateTime, 60000)
})
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
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

/* 按钮点击效果 */
@keyframes buttonPress {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.button-press {
  animation: buttonPress 0.15s ease-out;
}

/* Telegram风格的聊天气泡 */
.chat-bubble {
  position: relative;
}

.chat-bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: -8px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 8px 8px 0;
  border-color: transparent white transparent transparent;
}

/* 键盘按钮悬停效果 */
.keyboard-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
}

.keyboard-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}
</style>
