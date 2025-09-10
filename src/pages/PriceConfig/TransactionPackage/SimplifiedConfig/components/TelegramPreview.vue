<template>
  <div class="md:w-1/3">
    <!-- Telegram风格预览 -->
    <div class="bg-white rounded-lg border shadow-sm max-w-sm sticky top-4 min-h-[600px]">
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
      <div class="p-4 space-y-3">
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
</template>

<script setup lang="ts">
import type { Button } from '../composables/usePackageConfig'

interface Props {
  displayTitle: string
  dailyFee: number
  isUnlimited: boolean
  replyMessage: string
  showReply: boolean
  currentTime: string
  regularButtons: Button[]
  specialButton: Button | undefined
  simulateButtonClick: (button: Button) => void
}

defineProps<Props>()
</script>

<style scoped>
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

</style>
