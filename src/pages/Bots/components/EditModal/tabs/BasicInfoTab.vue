<!--
 * 基本信息标签页
 * 职责：显示和编辑机器人的基本信息
-->
<template>
  <div class="space-y-6">
    <!-- 基础信息表单 -->
    <BotFormBasicInfo
      :modelValue="basicInfo"
      @update:modelValue="$emit('update:basicInfo', $event)"
      mode="edit"
    />

    <!-- 状态信息 -->
    <div class="space-y-4 border-t pt-6">
      <div class="flex items-center gap-2 mb-4">
        <Activity class="w-5 h-5 text-green-600" />
        <h4 class="text-lg font-semibold text-gray-900">状态信息</h4>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 启用/禁用开关 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            当前状态
          </label>
          <div class="flex items-center">
            <button
              type="button"
              @click="handleStatusToggle"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                isActive ? 'bg-blue-600' : 'bg-gray-200'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  isActive ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
            <span class="ml-3 text-sm text-gray-700">
              {{ isActive ? '启用' : '禁用' }}
            </span>
          </div>
        </div>
        
        <!-- 健康状态检查 -->
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            健康状态
          </label>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <span 
                  :class="healthCheckResult ? getHealthStatusColor(healthCheckResult.status) : getHealthStatusColor(botData?.health_status)"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ healthCheckResult ? getHealthStatusText(healthCheckResult.status) : getHealthStatusText(botData?.health_status) }}
                </span>
                <span class="text-sm text-gray-500">
                  {{ healthCheckResult ? formatTime(healthCheckResult.last_check) : (formatTime(botData?.last_health_check) || '未检查') }}
                </span>
              </div>
              <button
                @click="handleHealthCheck"
                :disabled="healthChecking || !botData?.id"
                class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="检查机器人健康状态"
              >
                <Loader2 v-if="healthChecking" :size="12" class="animate-spin" />
                <Activity v-else :size="12" />
                {{ healthChecking ? '检查中...' : '立即检查' }}
              </button>
            </div>
            
            <!-- 健康检查详细信息 -->
            <HealthCheckDetails 
              v-if="showHealthDetails && healthCheckResult"
              :result="healthCheckResult"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Activity, Loader2 } from 'lucide-vue-next'
import type { BotData } from '../../../composables/useBotFormShared'
import { formatTime, getHealthStatusColor, getHealthStatusText } from '../../../composables/useBotFormShared'
import BotFormBasicInfo from '../../BotFormBasicInfo.vue'
import { useHealthCheck } from '../composables/useHealthCheck'
import HealthCheckDetails from './components/HealthCheckDetails.vue'

// Props
interface Props {
  basicInfo: {
    name: string
    username: string
    token: string
    description: string
    short_description: string
  }
  isActive: boolean
  botData?: BotData | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:basicInfo': [value: any]
  'update:isActive': [value: boolean]
  'refresh': []
}>()

// 使用健康检查逻辑
const {
  healthChecking,
  healthCheckResult,
  showHealthDetails,
  performHealthCheck
} = useHealthCheck()

// 状态切换处理
const handleStatusToggle = () => {
  emit('update:isActive', !props.isActive)
}

// 健康检查处理
const handleHealthCheck = () => {
  performHealthCheck(props.botData, emit)
}
</script>
