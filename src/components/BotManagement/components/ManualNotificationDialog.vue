<template>
  <!-- ✅ 代理组件 - 调用分离后的功能 -->
  <ManualNotification 
    v-model="dialogVisible"
    :bot-id="botId"
    @sent="$emit('sent', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ManualNotification from '../ManualNotification/index.vue'

interface Props {
  modelValue: boolean
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'sent', notificationId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<!-- ✅ 代理组件样式已移至分离后的组件中 -->
