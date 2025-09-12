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
              <!-- 图片显示（如果启用） -->
              <div v-if="imageEnabled && imageUrl" class="mb-3">
                <img 
                  :src="imageUrl" 
                  :alt="imageAlt || '笔数套餐配置图片'" 
                  class="w-full rounded-lg border"
                  @error="handleImageError"
                />
                <div v-if="imageAlt" class="text-xs text-gray-500 mt-1 text-center">
                  {{ imageAlt }}
                </div>
              </div>
              
              <!-- 标题 -->
              <div class="font-bold text-sm mb-1 text-green-600">
                🔥 {{ displayTitle }} 🔥（{{ isUnlimited ? '无时间限制' : '有时间限制' }}）
              </div>
              <!-- 标题后换行 -->
              <div v-if="lineBreaks.after_title > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.after_title) }}</div>
              
              <!-- 副标题 -->
              <div class="text-xs text-gray-600">
                {{ formatSubtitle(subtitleTemplate, dailyFee) }}
              </div>
              <!-- 副标题后换行 -->
              <div v-if="lineBreaks.after_subtitle > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.after_subtitle) }}</div>
              
              <!-- 使用规则前换行 -->
              <div v-if="usageRules.length > 0 && lineBreaks.before_usage_rules > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.before_usage_rules) }}</div>
              
              <!-- 使用规则 -->
              <div v-if="usageRules.length > 0">
                <div 
                  v-for="(rule, index) in usageRules" 
                  :key="index"
                  class="text-xs text-red-600"
                >
                  {{ rule }}
                </div>
              </div>
              
              <!-- 注意事项前换行 -->
              <div v-if="notes.length > 0 && lineBreaks.before_notes > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.before_notes) }}</div>
              
              <!-- 注意事项 -->
              <div v-if="notes.length > 0">
                <div 
                  v-for="(note, index) in notes" 
                  :key="index"
                  class="text-xs text-yellow-600"
                >
                  {{ note }}
                </div>
              </div>
              
              <!-- 套餐按钮前换行 -->
              <div v-if="lineBreaks.after_packages > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.after_packages) }}</div>
              
              <!-- 内嵌键盘 -->
              <div>
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
import { computed } from 'vue'
import type { Button } from '../composables/usePackageConfig'

interface Props {
  displayTitle: string
  subtitleTemplate: string
  dailyFee: number
  isUnlimited: boolean
  replyMessage: string
  showReply: boolean
  currentTime: string
  regularButtons: Button[]
  specialButton: Button | undefined
  simulateButtonClick: (button: Button) => void
  imageEnabled: boolean
  imageUrl: string
  imageAlt: string
  usageRules: string[]
  notes: string[]
  lineBreaks?: any
  generateLineBreaks?: (count: number) => string
}

const props = defineProps<Props>()

// 默认换行配置
const lineBreaks = computed(() => {
  return props.lineBreaks || {
    after_title: 0,
    after_subtitle: 0,
    after_packages: 0,
    before_usage_rules: 0,
    before_notes: 0
  }
})

// 生成换行字符串
const generateLineBreaks = (count: number): string => {
  return props.generateLineBreaks ? props.generateLineBreaks(count) : (count > 0 ? '\n'.repeat(count) : '')
}

// 格式化副标题模板，支持变量替换
const formatSubtitle = (template: string, dailyFee: number) => {
  if (!template) return ''
  return template.replace(/\{dailyFee\}/g, dailyFee.toString())
}


// 图片加载错误处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
}
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
