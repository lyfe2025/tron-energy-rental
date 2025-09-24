<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">TRX闪兑模式</h2>
        <p class="text-gray-600 text-sm mt-1">USDT自动兑换TRX服务配置</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">启用状态</span>
        <button
          @click="handleToggle"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            props.config?.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              props.config?.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <div v-if="props.config" class="flex flex-col md:flex-row gap-6" ref="layoutContainer">
      <!-- 左侧：Telegram 显示预览 -->
      <div class="md:w-1/3">
        <TelegramPreview
          :config="props.config"
          :mainMessageTemplate="mainMessageTemplate"
          :usdtToTrxRate="usdtToTrxRate"
          :trxToUsdtRate="trxToUsdtRate"
          :minAmount="minAmount"
          :maxAmount="maxAmount"
          :paymentAddress="paymentAddress"
        />
      </div>

      <!-- 右侧：配置表单 -->
      <div class="md:w-2/3 space-y-6">
        <!-- 图片配置 -->
        <ImageConfig :config="props.config" />

        <!-- 主消息配置 -->
        <MainMessageConfig
          :usdtToTrxRate="usdtToTrxRate"
          :trxToUsdtRate="trxToUsdtRate"
          :minAmount="minAmount"
          :maxAmount="maxAmount"
          :paymentAddress="paymentAddress"
          :mainMessageTemplate="mainMessageTemplate"
          :applyMainTemplate="applyMainTemplate"
          @update:usdtToTrxRate="updateUsdtToTrxRate"
          @update:trxToUsdtRate="updateTrxToUsdtRate"
          @update:minAmount="updateMinAmount"
          @update:maxAmount="updateMaxAmount"
          @update:paymentAddress="updatePaymentAddress"
          @update:mainMessageTemplate="updateMainMessageTemplate"
        />

        <!-- 保存按钮 -->
        <div class="mt-4 flex justify-end">
          <button
            @click="handleSave"
            :disabled="props.saving"
            data-testid="save-button"
            :class="[
              'px-4 py-2 text-white rounded-md font-medium transition-all',
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
import type { ConfigCardProps } from '../types'
import ImageConfig from './components/ImageConfig.vue'
import MainMessageConfig from './components/MainMessageConfig.vue'
import TelegramPreview from './components/TelegramPreview.vue'
import { useMainMessageConfig } from './composables/useMainMessageConfig'
import { useTrxExchangeConfig } from './composables/useTrxExchangeConfig'

const props = defineProps<ConfigCardProps>()

// 使用composable管理所有业务逻辑
const {
  layoutContainer,
  handleToggle,
  handleSave: originalHandleSave,
  handleImageError,
  handleImageUploadSuccess,
  handleImageUploadError,
  toggleImageEnabled
} = useTrxExchangeConfig(props)

// 使用主消息配置管理
const {
  mainMessageTemplate,
  usdtToTrxRate,
  trxToUsdtRate,
  minAmount,
  maxAmount,
  paymentAddress,
  initializeFromConfig,
  saveConfig,
  applyMainTemplate,
  updateUsdtToTrxRate,
  updateTrxToUsdtRate,
  updateMinAmount,
  updateMaxAmount,
  updatePaymentAddress,
  updateMainMessageTemplate
} = useMainMessageConfig(props.config)

// 初始化主消息配置
initializeFromConfig()

// 自定义保存函数，集成主消息配置保存
const handleSave = () => {
  // 保存主消息配置
  saveConfig()
  
  // 调用原始保存函数
  originalHandleSave()
}
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}

.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
