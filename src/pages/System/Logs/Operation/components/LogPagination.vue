<template>
  <div v-if="logs.length > 0" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
    <div class="flex-1 flex justify-between sm:hidden">
      <button
        @click="$emit('prev-page')"
        :disabled="pagination.current <= 1"
        class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上一页
      </button>
      <button
        @click="$emit('next-page')"
        :disabled="pagination.current >= Math.ceil(pagination.total / pagination.pageSize)"
        class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一页
      </button>
    </div>
    <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
      <div>
        <p class="text-sm text-gray-700">
          显示第 <span class="font-medium">{{ (pagination.current - 1) * pagination.pageSize + 1 }}</span> 到 
          <span class="font-medium">{{ Math.min(pagination.current * pagination.pageSize, pagination.total) }}</span> 条，
          共 <span class="font-medium">{{ pagination.total }}</span> 条记录
        </p>
      </div>
      <div>
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
          <button
            @click="$emit('prev-page')"
            :disabled="pagination.current <= 1"
            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft class="h-5 w-5" />
          </button>
          <button
            @click="$emit('next-page')"
            :disabled="pagination.current >= Math.ceil(pagination.total / pagination.pageSize)"
            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight class="h-5 w-5" />
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { OperationLog, Pagination } from '../types/operation-logs.types'

interface Props {
  logs: OperationLog[]
  pagination: Pagination
}

interface Emits {
  'prev-page': []
  'next-page': []
}

defineProps<Props>()
defineEmits<Emits>()
</script>
