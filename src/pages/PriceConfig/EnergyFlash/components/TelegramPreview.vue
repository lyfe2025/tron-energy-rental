<template>
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
    <div class="p-4 space-y-3 max-h-[700px] overflow-y-auto">
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
                :alt="config.image_alt || '能量闪租配置图片'" 
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
            <div class="text-xs text-gray-600 mb-2 whitespace-pre-line">
              {{ formattedSubtitle }}
            </div>
            <!-- 副标题后换行 -->
            <div v-if="lineBreaks.after_subtitle > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.after_subtitle) }}</div>
            
            <!-- 详细信息 -->
            <div class="text-xs space-y-1">
              <div>{{ formatText('duration_label', '⏱ 租期时效：{duration}小时', config.config.expiry_hours, displayTexts) }}</div>
              <div>{{ formatText('price_label', '💰 单笔价格：{price}TRX', config.config.single_price, displayTexts) }}</div>
              <div>{{ formatText('max_label', '🔢 最大购买：{max}笔', config.config.max_transactions, displayTexts) }}</div>
              <!-- 地址标签（总是显示，优先使用自定义标签） -->
              <div class="pt-1 border-t border-gray-200">{{ getAddressLabel() }}</div>
              <div 
                class="font-mono text-xs text-blue-600 break-all cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors"
                @click="copyAddress"
                :title="'点击复制地址: ' + (config.config.payment_address || 'TExample...')"
              >
                {{ config.config.payment_address || 'TExample...' }}
              </div>
              <div v-if="copyStatus" class="text-xs text-center mt-1 transition-opacity duration-300">
                <span :class="{
                  'text-green-600': copyStatus.includes('✅'),
                  'text-red-600': copyStatus.includes('❌'),
                  'text-yellow-600': copyStatus.includes('⚠️')
                }">
                  {{ copyStatus }}
                </span>
              </div>
              
              <!-- 智能换行：合并详细信息后和警告信息前的换行 -->
              <div v-if="intelligentLineBreaks > 0" class="whitespace-pre-line">{{ generateLineBreaks(intelligentLineBreaks) }}</div>
              
              <!-- 双倍能量警告 -->
              <div v-if="config.config.double_energy_for_no_usdt" class="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                {{ getDisplayText('double_energy_warning', '⚠️ 注意：账户无USDT将消耗双倍能量', displayTexts) }}
              </div>
              
              <!-- 注意事项前换行 -->
              <div v-if="config.config.notes && config.config.notes.length > 0 && lineBreaks.before_notes > 0" class="whitespace-pre-line">{{ generateLineBreaks(lineBreaks.before_notes) }}</div>
              
              <!-- 注意事项 -->
              <div v-if="config.config.notes && config.config.notes.length > 0" class="mt-2 pt-2 border-t border-gray-200">
                <div class="text-xs font-medium text-gray-700 mb-1">注意事项：</div>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEnergyFlashConfig } from '../composables/useEnergyFlashConfig'
import { usePreviewLogic } from '../composables/usePreviewLogic'
import { useTemplateFormatter } from '../composables/useTemplateFormatter'
import type { EnergyFlashConfig } from '../types/energy-flash.types'

interface Props {
  config: EnergyFlashConfig
}

const props = defineProps<Props>()

// 使用composables
const { displayTexts, subtitleTemplates, lineBreaks } = useEnergyFlashConfig(props.config)
const { formatSubtitle, formatText, getDisplayText, generateLineBreaks } = useTemplateFormatter()
const { copyStatus, copyAddress, handleImageError } = usePreviewLogic(props.config)

// 格式化副标题
const formattedSubtitle = computed(() => {
  return formatSubtitle(subtitleTemplates.value, props.config.config, lineBreaks.value)
})

// 获取地址标签（与后端逻辑保持一致）
const getAddressLabel = () => {
  const addressLabel = displayTexts.value.address_label
  // 如果有自定义标签且不是空字符串，使用自定义标签，否则使用默认标签
  if (addressLabel && addressLabel.trim() !== '') {
    return addressLabel
  } else {
    return '💰 下单地址：（点击地址自动复制）'
  }
}

// 智能换行计算（与后端逻辑保持一致）
const intelligentLineBreaks = computed(() => {
  if (props.config.config.double_energy_for_no_usdt) {
    // 当有警告信息时，使用两者中的较大值
    return Math.max(lineBreaks.value.after_details || 0, lineBreaks.value.before_warning || 0)
  } else if (lineBreaks.value.after_details > 0) {
    // 没有警告信息时，使用详细信息后的换行
    return lineBreaks.value.after_details
  }
  return 0
})

// 获取标题文本（与后端逻辑保持一致）
const getTitleText = () => {
  const displayTexts = props.config.config.display_texts || {}
  const keyboardConfig = (props.config as any).inline_keyboard_config || {}
  const name = (props.config as any).name || '能量闪租配置'
  
  // 与后端相同的逻辑：只有非空字符串才使用自定义标题
  const customTitle = (displayTexts as any).title
  if (customTitle && customTitle.trim() !== '') {
    return customTitle
  }
  
  // 使用键盘配置标题或配置名称
  return (keyboardConfig as any).title || name || '⚡闪租能量（需要时）'
}
</script>
