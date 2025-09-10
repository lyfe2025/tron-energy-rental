<template>
  <el-card class="form-card mt-4">
    <template #header>
      <span class="text-gray-900">👁️ 消息预览</span>
    </template>

    <div class="message-preview">
      <div class="telegram-preview">
        <div class="telegram-message">
          <div class="message-content">
            <div v-if="content.title" class="message-title">
              {{ content.title }}
            </div>
            <div class="message-text" v-html="content.content"></div>
            <div v-if="content.image_url" class="message-image">
              <img :src="content.image_url" alt="预览图片" />
            </div>
          </div>
          
          <!-- 按钮预览 -->
          <div v-if="content.action_button?.text && content.action_button?.type !== 'none'" class="buttons-preview">
            <div class="telegram-button">
              {{ content.action_button.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
interface PreviewContent {
  title: string
  content: string
  image_url?: string
  action_button?: {
    text: string
    type: string
    value: string
  } | null
}

interface Props {
  content: PreviewContent
}

defineProps<Props>()
</script>

<style scoped>
.form-card {
  @apply bg-white border-gray-200;
}

.form-card :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.telegram-preview {
  @apply max-w-md mx-auto;
}

.telegram-message {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-600;
}

.message-title {
  @apply font-bold text-lg text-gray-900 mb-2;
}

.message-text {
  @apply text-gray-300 whitespace-pre-line;
}

.message-image img {
  @apply max-w-full rounded mt-2;
}

.telegram-button {
  @apply inline-block bg-blue-600 text-gray-900 px-4 py-2 rounded mt-2 cursor-pointer hover:bg-blue-700 transition-colors;
}
</style>
