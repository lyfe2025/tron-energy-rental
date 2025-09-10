<template>
  <!-- ✅ 代理组件 - 调用分离后的功能 -->
  <SystemNotification 
    v-model="config"
    :bot-id="botId"
    @save="$emit('save')"
    @send-maintenance="$emit('send-maintenance')"
    @send-alert="$emit('send-alert')"
    @send-announcement="$emit('send-announcement')"
    @send-report="$emit('send-report')"
  />
</template>

<script setup lang="ts">
import type { SystemNotificationConfig } from '@/types/notification'
import { computed } from 'vue'
import SystemNotification from '../SystemNotification/index.vue'

interface Props {
  modelValue: SystemNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: SystemNotificationConfig): void
  (e: 'save'): void
  (e: 'send-maintenance'): void
  (e: 'send-alert'): void
  (e: 'send-announcement'): void
  (e: 'send-report'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<!-- ✅ 代理组件样式已移至分离后的组件中 -->
