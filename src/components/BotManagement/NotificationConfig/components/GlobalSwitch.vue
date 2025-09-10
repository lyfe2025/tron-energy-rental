<template>
  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
          <span class="text-2xl">🔔</span>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-1">通知功能总开关</h3>
          <p class="text-gray-600 text-sm">启用后，机器人将自动向用户发送各类通知消息</p>
        </div>
      </div>
      <el-switch 
        :model-value="enabled"
        size="large"
        active-color="#3B82F6"
        inactive-color="#E5E7EB"
        @change="$emit('update:enabled', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  enabled: boolean
}

interface Emits {
  (e: 'update:enabled', value: boolean): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
