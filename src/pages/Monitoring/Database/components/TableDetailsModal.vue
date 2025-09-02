<template>
  <div v-if="show" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">表详情 - {{ selectedTable?.tableName }}</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        
        <div class="mt-4" v-if="selectedTable">
          <div class="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label class="text-sm font-medium text-gray-600">记录数</label>
              <p class="text-lg font-semibold text-gray-900">{{ formatNumber(selectedTable.rowCount) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">表大小</label>
              <p class="text-lg font-semibold text-gray-900">{{ formatSize(selectedTable.tableSize) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">索引大小</label>
              <p class="text-lg font-semibold text-gray-900">{{ formatSize(typeof selectedTable.indexSize === 'string' ? parseInt(selectedTable.indexSize) || 0 : selectedTable.indexSize || 0) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">最后更新</label>
              <p class="text-lg font-semibold text-gray-900">
                {{ selectedTable.lastUpdated ? formatDateTime(selectedTable.lastUpdated) : '-' }}
              </p>
            </div>
          </div>
          
          <div v-if="selectedTable.columns" class="mt-6">
            <h4 class="text-md font-medium text-gray-900 mb-3">字段信息</h4>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">字段名</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">可空</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">默认值</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="column in selectedTable.columns" :key="column.name">
                    <td class="px-4 py-2 text-sm font-medium text-gray-900">{{ column.name }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900">{{ column.type }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900">{{ column.nullable ? '是' : '否' }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900">{{ column.default || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableInfo } from '@/api/monitoring';
import { X } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  selectedTable: TableInfo | null;
}>()

defineEmits<{
  close: []
}>()

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化数字
const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN')
}

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
