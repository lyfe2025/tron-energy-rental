<template>
  <div class="border rounded-lg p-4 bg-gray-50">
    <h4 class="text-sm font-medium text-gray-900 mb-3">💬 Telegram预览</h4>
    <div class="bg-white rounded-lg p-3 min-h-[300px] font-mono text-sm">
      
      <!-- 机器人发送的主消息 -->
      <MessageDisplay
        :message-content="messageContent"
        :current-time="currentTime"
        :image-enabled="imageEnabled"
        :image-url="imageUrl"
        :image-alt="imageAlt"
      >
        <template #keyboard>
          <InlineKeyboard
            :regular-buttons="regularButtons"
            :special-buttons="specialButtons"
            :simulate-button-click="simulateButtonClick"
          />
        </template>
      </MessageDisplay>

      <!-- 用户输入模拟 -->
      <UserInput
        :show-reply="showReply"
        :show-order-reply="showOrderReply"
        :user-input-address="userInputAddress"
      />

      <!-- 订单确认回复 -->
      <OrderConfirmation
        v-if="showOrderReply"
        :formatted-order-confirmation="formattedOrderConfirmation"
        :current-payment-mode="currentPaymentMode"
        :current-time="currentTime"
        :copy-status="copyStatus"
        :switch-payment-mode="switchPaymentMode"
        :cancel-order="cancelOrder"
      />
      
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Button } from '../../pages/PriceConfig/TransactionPackage/composables/usePackageConfig'
import InlineKeyboard from './components/InlineKeyboard.vue'
import MessageDisplay from './components/MessageDisplay.vue'
import OrderConfirmation from './components/OrderConfirmation.vue'
import UserInput from './components/UserInput.vue'
import { useTelegramMessage } from './composables/useTelegramMessage'

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

// 使用重构后的composable
const {
  showReply,
  showOrderReply,
  userInputAddress,
  currentTime,
  currentPaymentMode,
  copyStatus,
  messageContent,
  formattedOrderConfirmation,
  simulateButtonClick,
  switchPaymentMode,
  cancelOrder
} = useTelegramMessage(props)
</script>
