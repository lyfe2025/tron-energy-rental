<!--
 * Bot表单工作模式组件
 * 职责：提供机器人工作模式选择（Polling vs Webhook）
-->
<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-4">
      <Settings class="w-5 h-5 text-purple-600" />
      <h4 class="text-lg font-semibold text-gray-900">高级设置</h4>
    </div>
    
    <!-- 工作模式选择 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-3">
        工作模式
      </label>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div
          @click="updateWorkMode('polling')"
          :class="[
            'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
            modelValue === 'polling'
              ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <input
                :checked="modelValue === 'polling'"
                name="work_mode"
                type="radio"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
            </div>
            <div class="ml-3">
              <div class="flex items-center gap-2">
                <Activity class="w-4 h-4 text-blue-600" />
                <span class="block text-sm font-medium text-gray-900">Polling 轮询</span>
              </div>
              <div class="block text-xs text-gray-500 mt-1">
                机器人主动轮询获取消息，适合开发环境
              </div>
              <div class="flex items-center gap-4 mt-2 text-xs">
                <span class="flex items-center gap-1 text-green-600">
                  <CheckCircle class="w-3 h-3" />
                  本地开发
                </span>
                <span class="flex items-center gap-1 text-green-600">
                  <CheckCircle class="w-3 h-3" />
                  简单配置
                </span>
                <span class="flex items-center gap-1 text-amber-600">
                  <AlertCircle class="w-3 h-3" />
                  资源消耗
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          @click="updateWorkMode('webhook')"
          :class="[
            'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none',
            modelValue === 'webhook'
              ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          ]"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <input
                :checked="modelValue === 'webhook'"
                name="work_mode"
                type="radio"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
            </div>
            <div class="ml-3">
              <div class="flex items-center gap-2">
                <Globe class="w-4 h-4 text-blue-600" />
                <span class="block text-sm font-medium text-gray-900">Webhook 推送</span>
              </div>
              <div class="block text-xs text-gray-500 mt-1">
                Telegram主动推送消息，适合生产环境
              </div>
              <div class="flex items-center gap-4 mt-2 text-xs">
                <span class="flex items-center gap-1 text-green-600">
                  <CheckCircle class="w-3 h-3" />
                  高性能
                </span>
                <span class="flex items-center gap-1 text-green-600">
                  <CheckCircle class="w-3 h-3" />
                  实时性
                </span>
                <span class="flex items-center gap-1 text-amber-600">
                  <AlertCircle class="w-3 h-3" />
                  需HTTPS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 当前模式状态显示（仅在编辑模式显示） -->
      <div v-if="mode === 'edit' && botData" class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <Settings class="w-4 h-4 text-gray-600" />
          <span class="text-sm font-medium text-gray-800">当前运行模式状态</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span 
              :class="[
                'px-2 py-1 rounded-full text-xs font-medium',
                botData.work_mode === 'webhook' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              ]"
            >
              {{ botData.work_mode === 'webhook' ? 'Webhook 模式' : 'Polling 模式' }}
            </span>
            <span class="text-xs text-gray-500">
              {{ formatTime(botData.updated_at) }}
            </span>
          </div>
          <button
            type="button"
            @click="handleApplyModeChange"
            :disabled="!hasChangedMode"
            class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ hasChangedMode ? '应用切换' : '无变化' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Polling模式说明 -->
    <div v-if="modelValue === 'polling'" class="space-y-2">
      <!-- 简洁提示 -->
      <div class="p-2 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="text-xs text-green-700 flex items-center gap-2">
            <Activity class="w-3 h-3" />
            <span>简单易用 • 本地开发友好 • 自动重连</span>
          </div>
          <button
            type="button"
            @click="showPollingDetails = !showPollingDetails"
            class="text-xs text-green-600 hover:text-green-700 transition-colors flex items-center gap-1"
          >
            <Info class="w-3 h-3" />
            {{ showPollingDetails ? '收起' : '详情' }}
          </button>
        </div>
      </div>
      
      <!-- 折叠的详细说明 -->
      <div v-if="showPollingDetails" class="p-3 bg-blue-50 border border-blue-200 rounded-lg transition-all">
        <div class="flex items-start gap-2">
          <Info class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-blue-800">
            <div class="font-medium mb-2">Polling 模式特点：</div>
            <div class="text-blue-700 space-y-1 text-xs">
              <div>• <strong>简单易用</strong>：无需HTTPS域名和SSL证书配置</div>
              <div>• <strong>开发友好</strong>：适合本地开发和测试环境</div>
              <div>• <strong>稳定可靠</strong>：网络故障时自动重连，故障恢复能力强</div>
            </div>
            <div class="mt-3 pt-2 border-t border-blue-300">
              <div class="font-medium text-blue-800 mb-1">性能说明：</div>
              <div class="text-blue-700 text-xs space-y-1">
                <div>• 消息延迟1-3秒（轮询间隔）</div>
                <div>• 适合中小型机器人（<5000用户）</div>
                <div>• 服务器会持续轮询消耗资源</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Activity, AlertCircle, CheckCircle, Globe, Info, Settings } from 'lucide-vue-next'
import { computed, ref } from 'vue'

// 响应式数据
const showPollingDetails = ref(false)

// Props
interface BotData {
  work_mode?: 'polling' | 'webhook'
  updated_at?: string
}

interface Props {
  modelValue: 'polling' | 'webhook'
  mode?: 'create' | 'edit'
  botData?: BotData | null
  originalMode?: 'polling' | 'webhook'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create',
  originalMode: 'polling'
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: 'polling' | 'webhook']
  'applyModeChange': []
}>()

// 更新工作模式
const updateWorkMode = (mode: 'polling' | 'webhook') => {
  emit('update:modelValue', mode)
}

// 检查是否修改了工作模式
const hasChangedMode = computed(() => {
  return props.originalMode && props.modelValue !== props.originalMode
})

// 应用模式切换
const handleApplyModeChange = () => {
  if (hasChangedMode.value) {
    emit('applyModeChange')
  }
}

// 时间格式化工具函数
const formatTime = (timeString?: string) => {
  if (!timeString) return ''
  
  try {
    const date = new Date(timeString)
    return date.toLocaleString('zh-CN')
  } catch {
    return timeString
  }
}
</script>
