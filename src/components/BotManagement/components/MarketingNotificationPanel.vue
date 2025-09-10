<template>
  <!-- ✅ 代理组件 - 调用分离后的功能 -->
  <MarketingNotification
    :model-value="modelValue"
    :bot-id="botId"
    @update:model-value="$emit('update:modelValue', $event)"
    @save="$emit('save')"
  />
</template>

<script setup lang="ts">
import type { MarketingNotificationConfig } from '@/types/notification'
import MarketingNotification from '../MarketingNotification/index.vue'

interface Props {
  modelValue: MarketingNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: MarketingNotificationConfig): void
  (e: 'save'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<!-- ✅ 代理组件样式已移至分离后的组件中 -->
