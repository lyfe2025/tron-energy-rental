<!--
 * 健康检查详细信息组件
 * 职责：显示健康检查的详细结果
-->
<template>
  <div class="mt-3 p-4 bg-gray-50 rounded-lg border">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <div 
          class="w-2 h-2 rounded-full"
          :class="result.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'"
        ></div>
        <span class="text-sm font-medium text-gray-900">
          检查结果：{{ result.status === 'healthy' ? '正常' : '异常' }}
        </span>
      </div>
      
      <div v-if="result.details" class="text-xs text-gray-600 space-y-1">
        <div>工作模式：{{ getWorkModeText(result.details.work_mode) }}</div>
        <div>检查类型：{{ getCheckTypeText(result.details.check_type) }}</div>
        <div v-if="result.details.environment">
          运行环境：{{ getEnvironmentText(result.details.environment) }}
        </div>
        <div v-if="result.details.webhook_url">
          Webhook地址：{{ result.details.webhook_url }}
        </div>
        <div v-if="result.response_time_ms">
          响应时间：{{ result.response_time_ms }}ms
        </div>
      </div>
      
      <!-- 错误信息显示 -->
      <div v-if="result.status !== 'healthy' && result.error_message" 
           class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
        <div class="flex items-start gap-2">
          <div class="w-4 h-4 text-red-500 mt-0.5">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-red-800">检查失败原因</div>
            <div class="text-sm text-red-700 mt-1">{{ result.error_message }}</div>
          </div>
        </div>
      </div>
      
      <!-- 成功信息显示 -->
      <div v-if="result.status === 'healthy'" 
           class="mt-3 p-3 bg-green-50 border border-green-200 rounded">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 text-green-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <span class="text-sm font-medium text-green-800">机器人工作正常</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HealthCheckResult } from '../../composables/useHealthCheck';

// Props
interface Props {
  result: HealthCheckResult
}

defineProps<Props>()

// 工作模式文本转换
const getWorkModeText = (mode: string): string => {
  const modeMap: { [key: string]: string } = {
    webhook: 'Webhook',
    polling: 'Polling',
    unknown: '未知'
  }
  return modeMap[mode] || mode
}

// 检查类型文本转换
const getCheckTypeText = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    webhook_connectivity: 'Webhook连接检查',
    telegram_api: 'Telegram API检查',
    local_validation: '本地配置验证',
    api_request_failed: 'API请求失败',
    network_error: '网络错误'
  }
  return typeMap[type] || '未知检查类型'
}

// 运行环境文本转换
const getEnvironmentText = (env: string): string => {
  const envMap: { [key: string]: string } = {
    local: '本地开发',
    production: '生产环境'
  }
  return envMap[env] || env
}
</script>
