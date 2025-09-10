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

    <div v-if="config" class="flex flex-col md:flex-row gap-6" ref="layoutContainer">
      <!-- 左侧：Telegram 显示预览 -->
      <TelegramPreview
        :config="config"
        :getDisplayText="getDisplayText"
        :formatSubtitle="formatSubtitle"
        :handleImageError="handleImageError"
      />

      <!-- 右侧：配置表单 -->
      <div class="md:w-2/3 space-y-6">
        <!-- 基础配置（包含图片配置、基础配置、汇率配置） -->
        <BaseConfiguration
          :config="config"
          :toggleImageEnabled="toggleImageEnabled"
          :handleImageUploadSuccess="handleImageUploadSuccess"
          :handleImageUploadError="handleImageUploadError"
          :toggleAutoExchange="toggleAutoExchange"
        />

        <!-- 显示文本配置 -->
        <DisplayTextConfiguration
          :displayTexts="displayTexts"
        />

        <!-- 注意事项配置 -->
        <NotesConfiguration
          :notes="notes"
          :addNote="addNote"
          :removeNote="removeNote"
        />

        <!-- 保存按钮 -->
        <div class="mt-4 flex justify-end">
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConfigCardProps } from '../types'
import BaseConfiguration from './components/BaseConfiguration.vue'
import DisplayTextConfiguration from './components/DisplayTextConfiguration.vue'
import NotesConfiguration from './components/NotesConfiguration.vue'
import TelegramPreview from './components/TelegramPreview.vue'
import { useTrxExchangeConfig } from './composables/useTrxExchangeConfig'

const props = defineProps<ConfigCardProps>()

// 使用composable管理所有业务逻辑
const {
  layoutContainer,
  displayTexts,
  notes,
  handleToggle,
  handleSave,
  getDisplayText,
  formatSubtitle,
  handleImageError,
  handleImageUploadSuccess,
  handleImageUploadError,
  toggleImageEnabled,
  toggleAutoExchange,
  addNote,
  removeNote
} = useTrxExchangeConfig(props)

// 解构props以便访问
const { config, saving } = props
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}

.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
