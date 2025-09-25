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

    <div v-if="config" class="flex flex-col md:flex-row gap-6">
      <!-- 左侧：实时预览 -->
        <TelegramPreview
          :mainMessageTemplate="mainMessageTemplate"
          :dailyFee="dailyFee"
          :replyMessage="replyMessage"
          :showReply="showReply"
          :showOrderReply="showOrderReply"
          :currentTime="currentTime"
          :regularButtons="regularButtons"
          :specialButton="specialButton"
          :specialButtons="specialButtons"
          :simulateButtonClick="simulateButtonClick"
          :imageEnabled="imageEnabled"
          :imageUrl="imageUrl"
          :imageAlt="imageAlt"
          :usageRules="usageRules"
          :notes="notes"
          :currentUnitPrice="currentUnitPrice"
          :currentTotalAmount="currentTotalAmount"
          :currentTransactionCount="currentTransactionCount"
          :paymentAddress="paymentAddress"
          :orderExpireMinutes="orderExpireMinutes"
          :orderConfirmationTemplate="orderConfirmationTemplate"
          :orderConfirmationTemplateTrx="orderConfirmationTemplateTrx"
          :userInputAddress="userInputAddress"
          :inlineKeyboardEnabled="inlineKeyboardEnabled"
          :keyboardButtonsPerRow="keyboardButtonsPerRow"
        />

      <!-- 右侧：简化配置 -->
      <div class="md:w-2/3 space-y-4">
        <!-- 图片配置 -->
        <ImageConfiguration
          :imageUrl="imageUrl"
          :imageAlt="imageAlt"
          @update:imageUrl="updateImageUrl"
          @update:imageAlt="updateImageAlt"
          :imageEnabled="imageEnabled"
          :toggleImageEnabled="toggleImageEnabled"
          :handleImageUploadSuccess="handleImageUploadSuccess"
          :handleImageUploadError="handleImageUploadError"
        />

        <!-- 主消息配置 -->
        <MainMessageConfig
          :mainMessageTemplate="mainMessageTemplate"
          :dailyFee="dailyFee"
          :replyMessage="replyMessage"
          :applyMainTemplate="applyMainTemplate"
          @update:mainMessageTemplate="updateMainMessageTemplate"
          @update:dailyFee="updateDailyFee"
          @update:replyMessage="updateReplyMessage"
        />

        <!-- 基础设置和按钮配置 -->
        <PackageSettings
          :buttons="buttons"
          :addButton="addButton"
          :removeButton="removeButton"
          :applyTemplate="applyTemplate"
          :paymentAddress="paymentAddress"
          :orderExpireMinutes="orderExpireMinutes"
          :orderConfirmationTemplate="orderConfirmationTemplate"
          :orderConfirmationTemplateTrx="orderConfirmationTemplateTrx"
          :usdtToTrxRate="usdtToTrxRate"
          :inlineKeyboardEnabled="inlineKeyboardEnabled"
          :keyboardButtonsPerRow="keyboardButtonsPerRow"
          :applyOrderTemplate="applyOrderTemplate"
          :applyOrderTemplateTrx="applyOrderTemplateTrx"
          @update:paymentAddress="updatePaymentAddress"
          @update:orderExpireMinutes="updateOrderExpireMinutes"
          @update:orderConfirmationTemplate="updateOrderConfirmationTemplate"
          @update:orderConfirmationTemplateTrx="updateOrderConfirmationTemplateTrx"
          @update:usdtToTrxRate="updateUsdtToTrxRate"
          @update:inlineKeyboardEnabled="updateInlineKeyboardEnabled"
          @update:keyboardButtonsPerRow="updateKeyboardButtonsPerRow"
        />
        
        <!-- 保存按钮 -->
        <div class="mt-6 flex justify-end">
          <button
            @click="handleSave"
            :disabled="props.saving"
            data-testid="save-button"
            :class="[
              'px-6 py-2 text-white rounded-md font-medium transition-all',
              props.saving 
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            ]"
          >
            {{ props.saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import type { ConfigCardProps } from '../types'
import ImageConfiguration from './components/ImageConfiguration.vue'
import MainMessageConfig from './components/MainMessageConfig.vue'
import PackageSettings from './components/PackageSettings.vue'
import TelegramPreview from './components/TelegramPreview.vue'
import { useMainMessageConfig } from './composables/useMainMessageConfig'
import { usePackageConfig } from './composables/usePackageConfig'

const props = defineProps<ConfigCardProps>()

// 使用主消息配置composable
const {
  mainMessageTemplate,
  dailyFee,
  replyMessage,
  usageRules,
  notes,
  formatMainMessage,
  initializeFromConfig: initializeMainMessageConfig,
  saveConfig: saveMainMessageConfig,
  applyMainTemplate,
  updateMainMessageTemplate,
  updateDailyFee,
  updateReplyMessage
} = useMainMessageConfig(props)

// 使用套餐配置composable
const {
  showReply,
  showOrderReply,
  currentTime,
  userInputAddress,
  imageEnabled,
  imageUrl,
  imageAlt,
  buttons,
  regularButtons,
  specialButton,
  specialButtons,
  handleToggle,
  handleSave: originalHandleSave,
  simulateButtonClick,
  addButton,
  removeButton,
  applyTemplate,
  toggleImageEnabled,
  handleImageUploadSuccess,
  handleImageUploadError,
  updateTime,
  initializeFromConfig: initializePackageConfig,
  updateImageUrl,
  updateImageAlt,
  // 订单配置字段
  currentUnitPrice,
  currentTotalAmount,
  currentTransactionCount,
  paymentAddress,
  orderExpireMinutes,
  orderConfirmationTemplate,
  orderConfirmationTemplateTrx,
  usdtToTrxRate,
  inlineKeyboardEnabled,
  keyboardButtonsPerRow,
  updatePaymentAddress,
  updateOrderExpireMinutes,
  updateOrderConfirmationTemplate,
  updateOrderConfirmationTemplateTrx,
  updateUsdtToTrxRate,
  updateInlineKeyboardEnabled,
  updateKeyboardButtonsPerRow,
  applyOrderTemplate,
  applyOrderTemplateTrx
} = usePackageConfig(props)

// 自定义保存函数，整合两个composable的保存逻辑
const handleSave = () => {
  // 更新主消息配置到本地
  saveMainMessageConfig()
  
  // 更新套餐配置到本地并调用父组件保存
  originalHandleSave()
}

// 每次props变化时初始化
watch(() => props.config, (newConfig) => {
  if (newConfig?.mode_type === 'transaction_package') {
    initializeMainMessageConfig()
    initializePackageConfig()
  }
}, { immediate: true })

onMounted(() => {
  updateTime()
  setInterval(updateTime, 60000)
})
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}
</style>
