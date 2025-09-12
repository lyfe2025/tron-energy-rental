<!--
 * 消息配置标签页
 * 职责：显示和编辑机器人的消息配置
-->
<template>
  <div class="space-y-6">
    <!-- 命令配置 -->
    <div class="space-y-4 border-t pt-6">
      <BotFormMessages
        :modelValue="messageConfig"
        @update:modelValue="$emit('update:messageConfig', $event)"
        mode="edit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BotFormMessages from '../../BotFormMessages.vue'

// Props
interface Props {
  messageConfig: {
    welcome_message: string
    help_message: string
    custom_commands: any[]
    is_active: boolean
  }
}

defineProps<Props>()

// Emits
defineEmits<{
  'update:messageConfig': [value: any]
}>()
</script>
