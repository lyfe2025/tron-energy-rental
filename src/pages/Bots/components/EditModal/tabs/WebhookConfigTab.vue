<!--
 * Webhook配置标签页
 * 职责：显示和编辑机器人的Webhook相关配置
-->
<template>
  <div class="space-y-6">
    <!-- 工作模式选择 -->
    <BotFormWorkMode
      :modelValue="workMode"
      @update:modelValue="$emit('update:workMode', $event)"
      mode="edit"
      :bot-data="botData"
      :original-mode="originalMode"
      @applyModeChange="$emit('applyModeChange')"
    />

    <!-- Webhook配置 -->
    <BotFormWebhookConfig
      :modelValue="webhookConfig"
      @update:modelValue="$emit('update:webhookConfig', $event)"
      :work-mode="workMode"
      mode="edit"
      :bot-data="botData"
    />
  </div>
</template>

<script setup lang="ts">
import type { BotData } from '../../../composables/useBotFormShared'
import BotFormWebhookConfig from '../../BotFormWebhookConfig.vue'
import BotFormWorkMode from '../../BotFormWorkMode.vue'

// Props
interface Props {
  workMode: 'polling' | 'webhook'
  originalMode: 'polling' | 'webhook'
  webhookConfig: {
    webhook_url: string
    webhook_secret: string
    max_connections: number
  }
  botData?: BotData | null
}

defineProps<Props>()

// Emits
defineEmits<{
  'update:workMode': [value: 'polling' | 'webhook']
  'update:webhookConfig': [value: any]
  'applyModeChange': []
}>()
</script>
