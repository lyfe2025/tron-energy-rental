<!--
 * Bot表单Webhook配置主组件（分离重构版）
 * 职责：组合各子组件，提供完整的Webhook配置功能
-->
<template>
  <div v-if="workMode === 'webhook'" class="space-y-4 border-t pt-6">
    <div class="flex items-center gap-2 mb-4">
      <Globe class="w-5 h-5 text-purple-600" />
      <h4 class="text-lg font-semibold text-gray-900">🌐 Webhook 配置</h4>
      <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
        推送模式
      </span>
    </div>
    
    <!-- URL 输入组件 -->
    <WebhookUrlInput
      :display-url="displayWebhookUrl"
      :base-url="getBaseUrlFromInput(displayWebhookUrl)"
      :final-url="finalWebhookUrl"
      :work-mode="workMode"
      @url-update="displayWebhookUrl = $event"
    />

    <!-- 安全设置组件 -->
    <WebhookSecuritySettings
      :secret="modelValue.webhook_secret"
      :max-connections="modelValue.max_connections"
      :secret-visible="uiState.secretVisible"
      :secret-generated="uiState.secretGenerated"
      @secret-update="updateField('webhook_secret', $event)"
      @connections-update="updateField('max_connections', $event)"
      @generate-secret="generateWebhookSecret"
      @toggle-visibility="toggleSecretVisibility"
    />

    <!-- 状态检查组件（仅在编辑模式显示） -->
    <WebhookStatusIndicator
      :mode="mode"
      :bot-data="botData"
      :webhook-url="modelValue.webhook_url"
      :base-url="getBaseUrlFromInput(displayWebhookUrl)"
      :final-url="finalWebhookUrl"
      :webhook-status="webhookStatus"
      :checking="checking"
      :applying="applying"
      @check-status="handleCheckWebhookStatus"
      @apply-settings="handleApplyWebhookSettings"
    />

    <!-- 信息面板组件 -->
    <WebhookInfoPanel :mode="mode" />
  </div>
</template>

<script setup lang="ts">
import { Globe } from 'lucide-vue-next'
import WebhookInfoPanel from './BotFormWebhookConfig/components/WebhookInfoPanel.vue'
import WebhookSecuritySettings from './BotFormWebhookConfig/components/WebhookSecuritySettings.vue'
import WebhookStatusIndicator from './BotFormWebhookConfig/components/WebhookStatusIndicator.vue'
import WebhookUrlInput from './BotFormWebhookConfig/components/WebhookUrlInput.vue'
import { useWebhookConfig } from './BotFormWebhookConfig/composables/useWebhookConfig'
import { useWebhookTesting } from './BotFormWebhookConfig/composables/useWebhookTesting'
import type { WebhookEmits, WebhookProps } from './BotFormWebhookConfig/types/webhook.types'

// Props 和 Emits
const props = withDefaults(defineProps<WebhookProps>(), {
  mode: 'create'
})

const emit = defineEmits<WebhookEmits>()

// 使用配置管理composable
const {
  uiState,
  displayWebhookUrl,
  finalWebhookUrl,
  getBaseUrlFromInput,
  updateField,
  generateWebhookSecret,
  toggleSecretVisibility
} = useWebhookConfig(props, emit)

// 使用测试管理composable
const {
  webhookStatus,
  checking,
  applying,
  checkWebhookStatus,
  applyWebhookSettings
} = useWebhookTesting(props)

// 事件处理
const handleCheckWebhookStatus = () => {
  checkWebhookStatus()
}

const handleApplyWebhookSettings = () => {
  applyWebhookSettings(props.modelValue.webhook_url)
}
</script>
