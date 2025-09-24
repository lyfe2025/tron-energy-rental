<template>
  <!-- 图片配置 -->
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">🖼️ 图片配置</h3>
    
    <div class="space-y-4">
      <!-- 启用图片开关 -->
      <div class="flex items-center justify-between">
        <div>
          <label class="text-sm font-medium text-gray-700">启用图片显示</label>
          <p class="text-xs text-gray-500">在Telegram消息中显示图片</p>
        </div>
        <button
          @click="toggleImageEnabled"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config.enable_image ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config.enable_image ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <!-- 图片上传 -->
      <div v-if="config.enable_image">
        <label class="block text-sm font-medium text-gray-700 mb-2">上传图片</label>
        <ImageUpload
          v-model="config.image_url"
          :image-alt="config.image_alt"
          config-type="trx_exchange"
          @upload-success="handleImageUploadSuccess"
          @upload-error="handleImageUploadError"
        />
      </div>

      <!-- 图片描述 -->
      <div v-if="config.enable_image && config.image_url">
        <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">图片描述（可选）</label>
        <input
          type="text"
          v-model="config.image_alt"
          placeholder="图片的替代文本描述"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-500 mt-1">用于图片加载失败时的替代显示</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageUpload from '../../../../components/ImageUpload.vue';
import type { ImageUploadData, TrxExchangeConfig } from '../types/trx-exchange.types';

interface Props {
  config: TrxExchangeConfig
}

const props = defineProps<Props>()

/**
 * 图片相关处理函数
 */
const handleImageUploadSuccess = (data: ImageUploadData) => {
  props.config.image_url = data.url
  console.log('图片上传成功:', data)
}

const handleImageUploadError = (error: string) => {
  console.error('图片上传失败:', error)
}

const toggleImageEnabled = () => {
  props.config.enable_image = !props.config.enable_image
  if (!props.config.enable_image) {
    props.config.image_url = ''
    props.config.image_alt = ''
  }
}
</script>
