<!--
 * 同步进度显示组件
 * 职责：显示同步进行中的状态和实时日志
-->
<template>
  <div class="space-y-6">
    <div class="text-center py-8">
      <Loader2 class="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
      <h4 class="text-lg font-medium text-gray-900 mb-2">正在同步到Telegram...</h4>
      <p class="text-gray-600">请稍候，这可能需要几秒钟</p>
    </div>
    
    <!-- 实时日志显示 -->
    <div v-if="syncLogs.length > 0" class="bg-gray-50 border rounded-lg p-4">
      <h5 class="font-medium text-gray-900 mb-3">同步进度</h5>
      <div class="space-y-1 max-h-40 overflow-y-auto">
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
import { Loader2 } from 'lucide-vue-next';

// Props
interface Props {
  syncLogs: string[]
}

defineProps<Props>()
</script>
