<!--
 * 同步结果显示组件
 * 职责：显示同步完成后的结果和详细信息
-->
<template>
  <div v-if="syncResult" class="space-y-6">
    <!-- 结果总览 -->
    <div class="text-center py-6">
      <div class="mb-4">
        <CheckCircle v-if="syncResult.success" class="w-12 h-12 text-green-600 mx-auto" />
        <AlertCircle v-else-if="syncResult.hasPartialSuccess" class="w-12 h-12 text-yellow-600 mx-auto" />
        <XCircle v-else class="w-12 h-12 text-red-600 mx-auto" />
      </div>
      <h4 class="text-lg font-medium text-gray-900 mb-2">
        {{ syncResult.success ? '同步完成！' : 
           syncResult.hasPartialSuccess ? '部分同步成功' : '同步失败' }}
      </h4>
      <p class="text-gray-600">
        {{ getSyncResultDescription(syncResult) }}
      </p>
    </div>

    <!-- 详细结果 -->
    <div class="border rounded-lg p-4">
      <h5 class="font-medium text-gray-900 mb-4">同步详情</h5>
      <div class="space-y-3">
        <div 
          v-for="(result, key) in syncResult.results" 
          :key="key"
          class="flex items-center gap-3 p-2 rounded"
          :class="{
            'bg-green-50': result === true,
            'bg-red-50': result === false,
            'bg-gray-50': result === null
          }"
        >
          <CheckCircle v-if="result === true" class="w-4 h-4 text-green-600" />
          <XCircle v-else-if="result === false" class="w-4 h-4 text-red-600" />
          <Minus v-else class="w-4 h-4 text-gray-400" />
          <span class="text-sm">{{ getSyncItemName(String(key)) }}</span>
          <span 
            v-if="result === true" 
            class="text-xs text-green-600 ml-auto"
          >
            成功
          </span>
          <span 
            v-else-if="result === false" 
            class="text-xs text-red-600 ml-auto"
          >
            失败
          </span>
          <span 
            v-else 
            class="text-xs text-gray-400 ml-auto"
          >
            跳过
          </span>
        </div>
      </div>
    </div>

    <!-- 错误信息显示 -->
    <div v-if="syncResult.errors && syncResult.errors.length > 0" class="border border-red-200 rounded-lg p-4 bg-red-50">
      <h5 class="font-medium text-red-900 mb-3 flex items-center gap-2">
        <AlertTriangle class="w-4 h-4" />
        错误详情
      </h5>
      <div class="space-y-2">
        <div 
          v-for="(error, index) in syncResult.errors" 
          :key="index"
          class="text-sm text-red-800 bg-red-100 border border-red-200 rounded p-2"
        >
          {{ error }}
        </div>
      </div>
    </div>

    <!-- 完整日志 -->
    <div v-if="syncLogs.length > 0" class="border rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h5 class="font-medium text-gray-900">完整日志</h5>
        <button 
          @click="$emit('toggle-logs')"
          class="text-xs text-gray-600 hover:text-gray-700 transition-colors"
        >
          {{ showFullLogs ? '收起' : '展开' }}
        </button>
      </div>
      <div v-if="showFullLogs" class="space-y-1 max-h-60 overflow-y-auto bg-gray-50 border rounded p-3">
        <div 
          v-for="(log, index) in syncLogs" 
          :key="index"
          class="text-xs font-mono"
          :class="{
            'text-green-600': log.includes('✅'),
            'text-red-600': log.includes('❌'),
            'text-yellow-600': log.includes('⚠️'),
            'text-blue-600': log.includes('🎯'),
            'text-gray-600': !log.includes('✅') && !log.includes('❌') && !log.includes('⚠️') && !log.includes('🎯')
          }"
        >
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Minus,
    XCircle
} from 'lucide-vue-next'
import { useSyncDisplay } from '../composables/useSyncDisplay'
import type { SyncResult } from '../types/sync.types'

// Props
interface Props {
  syncResult: SyncResult | null
  syncLogs: string[]
  showFullLogs: boolean
}

defineProps<Props>()

// Emits
defineEmits<{
  'toggle-logs': []
}>()

// 显示工具函数
const { getSyncItemName, getSyncResultDescription } = useSyncDisplay()
</script>
