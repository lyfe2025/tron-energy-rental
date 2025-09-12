<template>
  <div class="text-center py-12">
    <Bot class="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <h3 class="text-lg font-medium text-gray-900 mb-2">暂无机器人</h3>
    <p class="text-gray-500 mb-4">开始创建您的第一个Telegram机器人配置</p>
    <button
      @click="$emit('create-bot')"
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
    >
      <Plus class="w-4 h-4" />
      创建机器人
    </button>
  </div>
</template>

<script setup lang="ts">
import { Bot, Plus } from 'lucide-vue-next';

defineEmits<{
  'create-bot': []
}>()
</script>
