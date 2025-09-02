<template>
  <div class="bg-white rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">慢查询日志</h2>
    </div>
    
    <div class="p-6">
      <div v-if="!slowQueries || (Array.isArray(slowQueries) && slowQueries.length === 0) || (typeof slowQueries === 'number')" class="text-center py-8 text-gray-500">
        暂无慢查询记录
      </div>
      
      <div v-else-if="Array.isArray(slowQueries)" class="space-y-4">
        <div 
          v-for="query in slowQueries" 
          :key="query.id" 
          class="border rounded-lg p-4 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <Clock class="h-4 w-4 text-gray-400" />
              <span class="text-sm text-gray-600">{{ formatDateTime(query.timestamp) }}</span>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-600">执行时间: {{ query.duration }}ms</span>
              <span 
                class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                :class="query.duration > 5000 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'"
              >
                {{ query.duration > 5000 ? '严重' : '警告' }}
              </span>
            </div>
          </div>
          
          <div class="mt-2">
            <p class="text-sm font-medium text-gray-700 mb-1">SQL语句:</p>
            <pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{{ query.query || '' }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Clock } from 'lucide-vue-next';

interface SlowQuery {
  id: string | number;
  timestamp: string;
  duration: number;
  query: string;
}

defineProps<{
  slowQueries: SlowQuery[] | number | undefined | null;
}>()

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>
