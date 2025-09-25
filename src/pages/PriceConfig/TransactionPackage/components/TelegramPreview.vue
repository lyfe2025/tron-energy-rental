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
      
      <!-- 消息内容 - 使用重构后的组件 -->
      <div class="p-4 space-y-3">
        <RefactoredTelegramPreview v-bind="refactoredProps" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RefactoredTelegramPreview from '../../../../components/telegram-preview/TelegramPreview.vue'
import type { Button } from '../composables/usePackageConfig'

interface Props {
  // 消息配置
  mainMessageTemplate?: string
  dailyFee: number
  usageRules: string[]
  notes: string[]
  
  // 按钮配置
  regularButtons: Button[]
  specialButtons: Button[]
  
  // 图片配置
  imageEnabled: boolean
  imageUrl: string
  imageAlt: string
  
  // 订单确认配置
  currentUnitPrice?: number
  currentTotalAmount?: number
  currentTransactionCount?: number
  paymentAddress?: string
  orderExpireMinutes?: number
  orderConfirmationTemplate?: string
  orderConfirmationTemplateTrx?: string
}

const props = defineProps<Props>()

// 将props传递给重构后的组件
const refactoredProps = computed(() => ({
  mainMessageTemplate: props.mainMessageTemplate,
  dailyFee: props.dailyFee,
  usageRules: props.usageRules || [],
  notes: props.notes || [],
  regularButtons: props.regularButtons || [],
  specialButtons: props.specialButtons || [],
  imageEnabled: props.imageEnabled || false,
  imageUrl: props.imageUrl || '',
  imageAlt: props.imageAlt || '',
  currentUnitPrice: props.currentUnitPrice,
  currentTotalAmount: props.currentTotalAmount,
  currentTransactionCount: props.currentTransactionCount,
  paymentAddress: props.paymentAddress,
  orderExpireMinutes: props.orderExpireMinutes,
  orderConfirmationTemplate: props.orderConfirmationTemplate,
  orderConfirmationTemplateTrx: props.orderConfirmationTemplateTrx
}))
</script>

<!--
重构说明：
原始607行代码已分离到以下模块：
- src/components/telegram-preview/TelegramPreview.vue (主组件)
- src/components/telegram-preview/components/ (子组件)
- src/components/telegram-preview/composables/ (业务逻辑)
- src/components/telegram-preview/utils/ (工具函数)

此文件现在作为向后兼容的包装器
-->