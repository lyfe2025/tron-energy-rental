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
        :displayTitle="displayTitle"
        :dailyFee="dailyFee"
        :isUnlimited="isUnlimited"
        :replyMessage="replyMessage"
        :showReply="showReply"
        :currentTime="currentTime"
        :regularButtons="regularButtons"
        :specialButton="specialButton"
        :simulateButtonClick="simulateButtonClick"
      />

      <!-- 右侧：简化配置 -->
      <div class="md:w-2/3 space-y-4">
        <!-- 图片配置 -->
        <ImageConfiguration
          :imageUrl="imageUrl"
          :imageAlt="imageAlt"
          @update:imageUrl="(value: string) => (imageUrl as any).value = value"
          @update:imageAlt="(value: string) => (imageAlt as any).value = value"
          :imageEnabled="imageEnabled"
          :toggleImageEnabled="toggleImageEnabled"
          :handleImageUploadSuccess="handleImageUploadSuccess"
          :handleImageUploadError="handleImageUploadError"
        />

        <!-- 基础设置和按钮配置 -->
        <PackageSettings
          :displayTitle="displayTitle"
          :dailyFee="dailyFee"
          :isUnlimited="isUnlimited"
          :replyMessage="replyMessage"
          @update:displayTitle="(value: string) => (displayTitle as any).value = value"
          @update:dailyFee="(value: number) => (dailyFee as any).value = value"
          @update:isUnlimited="(value: boolean) => (isUnlimited as any).value = value"
          @update:replyMessage="(value: string) => (replyMessage as any).value = value"
          :buttons="buttons"
          :addButton="addButton"
          :removeButton="removeButton"
          :applyTemplate="applyTemplate"
        />
        
        <!-- 保存按钮 -->
        <div class="mt-6 flex justify-end">
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import type { ConfigCardProps } from '../../types'
import ImageConfiguration from './components/ImageConfiguration.vue'
import PackageSettings from './components/PackageSettings.vue'
import TelegramPreview from './components/TelegramPreview.vue'
import { usePackageConfig } from './composables/usePackageConfig'

const props = defineProps<ConfigCardProps>()

// 使用composable管理所有业务逻辑
const {
  displayTitle,
  dailyFee,
  isUnlimited,
  replyMessage,
  showReply,
  currentTime,
  imageEnabled,
  imageUrl,
  imageAlt,
  buttons,
  regularButtons,
  specialButton,
  handleToggle,
  handleSave,
  simulateButtonClick,
  addButton,
  removeButton,
  applyTemplate,
  toggleImageEnabled,
  handleImageUploadSuccess,
  handleImageUploadError,
  updateTime
} = usePackageConfig(props)

// 解构props以便访问
const { config, saving } = props

// 每次props变化时初始化
watch(() => props.config, () => {
  // 配置变化时重新初始化
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
