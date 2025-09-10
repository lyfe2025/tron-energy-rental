<template>
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
            imageEnabled ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              imageEnabled ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <!-- 图片上传 -->
      <div v-if="imageEnabled">
        <label class="block text-sm font-medium text-gray-700 mb-2">上传图片</label>
        <ImageUpload
          :modelValue="imageUrl"
          @update:modelValue="(value) => $emit('update:imageUrl', value)"
          :image-alt="imageAlt"
          @upload-success="handleImageUploadSuccess"
          @upload-error="handleImageUploadError"
        />
      </div>

      <!-- 图片描述 -->
      <div v-if="imageEnabled && imageUrl">
        <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">图片描述（可选）</label>
        <input
          type="text"
          :value="imageAlt"
          @input="(e) => $emit('update:imageAlt', (e.target as HTMLInputElement).value)"
          placeholder="图片的替代文本描述"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-500 mt-1">用于图片加载失败时的替代显示</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageUpload from '../../../../../components/ImageUpload.vue'

interface Props {
  imageEnabled: boolean
  imageUrl: string
  imageAlt: string
  toggleImageEnabled: () => void
  handleImageUploadSuccess: (data: any) => void
  handleImageUploadError: (error: string) => void
}

defineProps<Props>()
defineEmits<{
  'update:imageUrl': [value: string]
  'update:imageAlt': [value: string]
}>()
</script>
