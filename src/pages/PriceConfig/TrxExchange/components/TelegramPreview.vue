<template>
  <div class="md:w-1/3">
    <!-- Telegram风格预览 -->
    <div class="bg-white rounded-lg border shadow-sm max-w-sm sticky top-4">
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
      <div class="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        <!-- 机器人消息 -->
        <div class="flex gap-2">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs">🤖</span>
          </div>
          <div class="flex-1">
            <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
              <!-- 图片显示（如果启用） -->
              <div v-if="config.enable_image && config.image_url" class="mb-3">
                <img 
                  :src="config.image_url" 
                  :alt="config.image_alt || 'TRX闪兑配置图片'" 
                  class="w-full rounded-lg border"
                  @error="handleImageError"
                />
                <div v-if="config.image_alt" class="text-xs text-gray-500 mt-1 text-center">
                  {{ config.image_alt }}
                </div>
              </div>
              
              <!-- 标题 -->
              <div class="font-bold text-sm mb-1 text-green-600">
                {{ getTitleText() }}
              </div>
              <!-- 标题后换行 -->
              <div v-if="lineBreaks.after_title > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.after_title) }}</div>
              
              <!-- 副标题 -->
              <div class="text-xs text-gray-600 mb-2">
                {{ formatSubtitle() }}
              </div>
              <!-- 副标题后换行 -->
              <div v-if="lineBreaks.after_subtitle > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.after_subtitle) }}</div>
              
              <!-- 汇率信息 -->
              <div class="text-xs">
                <div class="font-medium">{{ getDisplayText('rate_title', '📊 当前汇率') }}</div>
                <div>💱 USDT→TRX汇率: 1 USDT = {{ config.config.usdt_to_trx_rate || '0' }} TRX</div>
                <div>💱 TRX→USDT汇率: 1 TRX = {{ config.config.trx_to_usdt_rate || '0' }} USDT</div>
                <div class="text-gray-600">{{ getDisplayText('rate_description', '当前汇率仅供参考') }}</div>
                
                <!-- 汇率信息后换行 -->
                <div v-if="lineBreaks.after_rates > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.after_rates) }}</div>
                
                <div class="pt-1 border-t border-gray-200">{{ getDisplayText('address_label', '📍 兑换地址') }}</div>
                <div class="font-mono text-xs text-blue-600 break-all">{{ config.config.exchange_address || 'TExample...' }}</div>
                
                <!-- 汇率更新间隔 -->
                <div v-if="config.config.rate_update_interval" class="text-xs mt-2">
                  🔄 汇率更新: 每{{ config.config.rate_update_interval }}分钟
                </div>
                
                <!-- 地址信息（包含汇率更新）后换行，智能合并before_notes -->
                <div v-if="shouldShowAddressBreaks" class="whitespace-pre-line">{{ generateLineBreaks(addressLineBreaks) }}</div>
                
                <!-- 注意事项 -->
                <div v-if="config.config.notes && config.config.notes.length > 0" class="border-t border-gray-200">
                  <div class="text-xs font-medium text-gray-700 mb-1">📌 注意事项：</div>
                  <div v-for="(note, index) in config.config.notes" :key="index" class="text-xs text-gray-600">
                    {{ note }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 消息发送时间 -->
            <div class="text-xs text-gray-400 mt-1">
              刚刚
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  config: any
  getDisplayText: (key: string, defaultValue: string) => string
  formatSubtitle: () => string
  handleImageError: (event: Event) => void
  lineBreaks?: any
  generateLineBreaks?: (count: number) => string
}

const props = defineProps<Props>()

// 默认换行配置
const lineBreaks = computed(() => {
  return props.lineBreaks || {
    after_title: 0,
    after_subtitle: 0,
    after_rates: 0,
    after_address: 0,
    before_notes: 0
  }
})

// 生成换行字符串
const generateLineBreaks = (count: number): string => {
  return props.generateLineBreaks ? props.generateLineBreaks(count) : (count > 0 ? '\n'.repeat(count) : '')
}

// 智能地址换行计算（避免双重换行）
const shouldShowAddressBreaks = computed(() => {
  const hasNotes = props.config.config.notes && props.config.config.notes.length > 0
  return (lineBreaks.value.after_address > 0) || (hasNotes && lineBreaks.value.before_notes > 0)
})

const addressLineBreaks = computed(() => {
  const hasNotes = props.config.config.notes && props.config.config.notes.length > 0
  if (hasNotes) {
    // 如果有注意事项，使用两者中的较大值
    return Math.max(lineBreaks.value.after_address || 0, lineBreaks.value.before_notes || 0)
  } else {
    // 没有注意事项，只使用after_address
    return lineBreaks.value.after_address || 0
  }
})

// 获取标题文本（与后端逻辑保持一致）
const getTitleText = () => {
  const displayTexts = props.config.config.display_texts || {}
  
  // 与后端相同的逻辑：只有非空字符串才使用自定义标题
  const customTitle = (displayTexts as any).title
  if (customTitle && customTitle.trim() !== '') {
    return customTitle
  }
  
  // TRX闪兑的默认标题
  return '🟢USDT自动兑换TRX🔴'
}

</script>
