<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
    <div>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">通知配置</h2>
      <p class="text-gray-600">管理机器人的各类通知设置，包括业务通知、价格提醒、系统消息等</p>
    </div>
    <div class="flex items-center gap-3 mt-4 sm:mt-0">
      <button
        @click="$emit('refresh')"
        :disabled="loading"
        class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Refresh :class="{ 'animate-spin': loading }" class="w-4 h-4" />
        刷新
      </button>
      <button
        @click="$emit('export')"
        class="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Upload class="w-4 h-4" />
        导出配置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh, Upload } from '@element-plus/icons-vue';

interface Props {
  loading: boolean
}

interface Emits {
  (e: 'refresh'): void
  (e: 'export'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
