<template>
  <div class="flex gap-2">
    <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
      <span class="text-white text-xs">🤖</span>
    </div>
    <div class="flex-1">
      <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
        <!-- 图片显示（如果启用） -->
        <div v-if="imageEnabled && imageUrl" class="mb-3">
          <img 
            :src="imageUrl" 
            :alt="imageAlt || '笔数套餐配置图片'" 
            class="w-full rounded-lg border"
            @error="handleImageError"
          />
          <div v-if="imageAlt" class="text-xs text-gray-500 mt-1 text-center">
            {{ imageAlt }}
          </div>
        </div>
        
        <!-- 主消息内容 -->
        <div class="text-xs whitespace-pre-line">
          {{ messageContent }}
        </div>
      </div>
      
      <!-- 内嵌键盘（显示在消息下方） -->
      <slot name="keyboard"></slot>
      
      <div class="text-xs text-gray-400 mt-1">{{ currentTime }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  messageContent: string
  currentTime: string
  imageEnabled: boolean
  imageUrl: string
  imageAlt: string
}

defineProps<Props>()

// 图片加载错误处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
}
</script>
