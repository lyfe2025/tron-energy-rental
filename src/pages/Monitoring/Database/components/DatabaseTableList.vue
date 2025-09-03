<template>
  <div class="bg-white rounded-lg shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">数据表统计</h2>
    </div>
    
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              表名
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              记录数
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              表大小
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              索引大小
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最后更新
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
              <div class="flex items-center justify-center">
                <RefreshCw class="h-5 w-5 animate-spin mr-2" />
                加载中...
              </div>
            </td>
          </tr>
          <tr v-else-if="!dbStats?.tables || dbStats.tables.length === 0">
            <td colspan="6" class="px-6 py-4 text-center text-gray-500">
              暂无数据表信息
            </td>
          </tr>
          <tr v-else v-for="table in dbStats.tables" :key="table.tableName" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <Table class="h-4 w-4 text-gray-400 mr-2" />
                <span class="text-sm font-medium text-gray-900">{{ table.tableName }}</span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatNumber(table.rowCount) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatSize(table.tableSize) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatSize(typeof table.indexSize === 'string' ? 0 : (table.indexSize || 0)) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ table.lastUpdated ? formatDateTime(table.lastUpdated) : '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="$emit('view-details', table)"
                class="text-indigo-600 hover:text-indigo-900 mr-3"
                title="查看详情"
              >
                <Eye class="h-4 w-4" />
              </button>
              <button
                @click="$emit('analyze-table', table.tableName)"
                class="text-green-600 hover:text-green-900"
                title="分析表"
              >
                <BarChart3 class="h-4 w-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 分页控件 -->
    <div v-if="dbStats?.tables && dbStats.tables.length > 0 && tablePagination.total > tablePagination.pageSize" 
         class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      <div class="flex-1 flex justify-between sm:hidden">
        <button
          @click="$emit('previous-page')"
          :disabled="tablePagination.current <= 1"
          class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        <button
          @click="$emit('next-page')"
          :disabled="tablePagination.current >= Math.ceil(tablePagination.total / tablePagination.pageSize)"
          class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
      <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            显示第 <span class="font-medium">{{ (tablePagination.current - 1) * tablePagination.pageSize + 1 }}</span> 到 
            <span class="font-medium">{{ Math.min(tablePagination.current * tablePagination.pageSize, tablePagination.total) }}</span> 条，
            共 <span class="font-medium">{{ tablePagination.total }}</span> 条记录
          </p>
        </div>
        <div>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              @click="$emit('previous-page')"
              :disabled="tablePagination.current <= 1"
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft class="h-5 w-5" />
            </button>
            <button
              @click="$emit('next-page')"
              :disabled="tablePagination.current >= Math.ceil(tablePagination.total / tablePagination.pageSize)"
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight class="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Eye,
    RefreshCw,
    Table
} from 'lucide-vue-next'
import { useDatabaseStats } from '../composables/useDatabaseStats'
import type { DatabaseStats, TableInfo, TablePagination } from '../types/database.types'

interface Props {
  dbStats: DatabaseStats | null
  tablePagination: TablePagination
  loading: boolean
}

interface Emits {
  'view-details': [table: TableInfo]
  'analyze-table': [tableName: string]
  'previous-page': []
  'next-page': []
}

defineProps<Props>()
defineEmits<Emits>()

const { formatSize, formatNumber, formatDateTime } = useDatabaseStats()
</script>