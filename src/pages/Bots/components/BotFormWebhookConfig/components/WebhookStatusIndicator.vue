<!--
 * Webhook状态指示器组件
 * 职责：显示Webhook状态、URL对比和操作按钮
-->
<template>
  <div v-if="mode === 'edit' && botData?.work_mode === 'webhook'" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <Globe class="w-4 h-4 text-yellow-600" />
        <span class="text-sm font-medium text-yellow-800">Webhook 状态检查</span>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          @click="handleCheckStatus"
          :disabled="checking"
          class="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
        >
          {{ checking ? '检查中...' : '检查状态' }}
        </button>
        <button 
          type="button"
          @click="handleApplySettings"
          :disabled="applying || !webhookUrl"
          class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {{ applying ? '应用中...' : '应用设置' }}
        </button>
      </div>
    </div>
    
    <div v-if="webhookStatus" class="text-xs space-y-2">
      <!-- URL配置对比 -->
      <div class="p-2 bg-gray-50 rounded border">
        <div class="font-medium text-gray-800 mb-1">📍 URL配置对比</div>
        <div class="space-y-1">
          <div class="text-gray-700">
            <span class="font-medium">基础URL（用户输入）:</span><br>
            <code class="text-xs bg-blue-50 text-blue-800 px-1 py-0.5 rounded">{{ baseUrl }}</code>
          </div>
          <div class="text-gray-700">
            <span class="font-medium">最终URL（系统生成）:</span><br>
            <code class="text-xs bg-green-50 text-green-800 px-1 py-0.5 rounded">{{ finalUrl }}</code>
          </div>
          <div class="text-gray-700">
            <span class="font-medium">Telegram中的URL:</span><br>
            <code class="text-xs bg-purple-50 text-purple-800 px-1 py-0.5 rounded">{{ webhookStatus.url || '未设置' }}</code>
            <span 
              v-if="webhookStatus.url && webhookStatus.url === finalUrl" 
              class="ml-2 px-1 py-0.5 text-xs bg-green-100 text-green-700 rounded"
            >
              ✅ 已同步
            </span>
            <span 
              v-else-if="webhookStatus.url && webhookStatus.url !== finalUrl" 
              class="ml-2 px-1 py-0.5 text-xs bg-orange-100 text-orange-700 rounded"
            >
              ⚠️ 需要同步
            </span>
          </div>
        </div>
      </div>
      
      <!-- 状态信息 -->
      <div class="text-gray-700">
        <span class="font-medium">连接状态:</span> 
        <span :class="statusColorClass">
          {{ statusDescription }}
        </span>
      </div>
      <div class="text-gray-700">
        <span class="font-medium">待处理消息:</span> 
        <span class="text-yellow-600">{{ webhookStatus.pending_update_count || 0 }} 条</span>
      </div>
      <div class="text-gray-700">
        <span class="font-medium">密钥验证:</span> 
        <span class="text-gray-600">{{ webhookStatus.configured_secret ? '已配置' : '未配置' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Globe } from 'lucide-vue-next'
import { computed } from 'vue'
import type { BotData, WebhookStatus } from '../types/webhook.types'

interface Props {
  mode?: 'create' | 'edit'
  botData?: BotData | null
  webhookUrl: string
  baseUrl: string
  finalUrl: string
  webhookStatus: WebhookStatus | null
  checking: boolean
  applying: boolean
}

interface Emits {
  checkStatus: []
  applySettings: []
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})
const emit = defineEmits<Emits>()

const statusDescription = computed(() => {
  if (!props.webhookStatus) return '未检查'
  if (props.webhookStatus.last_error_message) return `错误: ${props.webhookStatus.last_error_message}`
  return '正常'
})

const statusColorClass = computed(() => {
  if (!props.webhookStatus) return 'text-gray-600'
  if (props.webhookStatus.last_error_message) return 'text-red-600'
  return 'text-green-600'
})

const handleCheckStatus = () => {
  emit('checkStatus')
}

const handleApplySettings = () => {
  emit('applySettings')
}
</script>
