<template>
  <div v-if="pagination && pagination.total > 0" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
    <div class="flex-1 flex justify-between sm:hidden">
      <!-- 移动端分页 -->
      <button
        @click="previousPage"
        :disabled="pagination.page <= 1"
        class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上一页
      </button>
      <button
        @click="nextPage"
        :disabled="pagination.page >= pagination.total_pages"
        class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一页
      </button>
    </div>
    
    <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
      <!-- 统计信息 -->
      <div>
        <p class="text-sm text-gray-700">
          显示第
          <span class="font-medium">{{ startIndex }}</span>
          到
          <span class="font-medium">{{ endIndex }}</span>
          项，共
          <span class="font-medium">{{ pagination.total }}</span>
          项
        </p>
      </div>
      
      <!-- 桌面端分页 -->
      <div>
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <!-- 上一页 -->
          <button
            @click="previousPage"
            :disabled="pagination.page <= 1"
            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">上一页</span>
            <ChevronLeft class="h-5 w-5" />
          </button>
          
          <!-- 页码 -->
          <template v-for="page in visiblePages" :key="page">
            <button
              v-if="page !== '...'"
              @click="goToPage(page as number)"
              :class="[
                'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                page === pagination.page
                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
              ]"
            >
              {{ page }}
            </button>
            <span
              v-else
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
            >
              ...
            </span>
          </template>
          
          <!-- 下一页 -->
          <button
            @click="nextPage"
            :disabled="pagination.page >= pagination.total_pages"
            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">下一页</span>
            <ChevronRight class="h-5 w-5" />
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'

interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

interface Props {
  pagination: Pagination
}

interface Emits {
  (e: 'page-change', page: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算显示的起始和结束索引
const startIndex = computed(() => {
  return (props.pagination.page - 1) * props.pagination.page_size + 1
})

const endIndex = computed(() => {
  const end = props.pagination.page * props.pagination.page_size
  return Math.min(end, props.pagination.total)
})

// 计算可见的页码
const visiblePages = computed(() => {
  const current = props.pagination.page
  const total = props.pagination.total_pages
  const pages: (number | string)[] = []
  
  if (total <= 7) {
    // 总页数少于等于7页，全部显示
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数超过7页，智能显示
    pages.push(1)
    
    if (current > 4) {
      pages.push('...')
    }
    
    const start = Math.max(2, current - 2)
    const end = Math.min(total - 1, current + 2)
    
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        pages.push(i)
      }
    }
    
    if (current < total - 3) {
      pages.push('...')
    }
    
    if (total > 1) {
      pages.push(total)
    }
  }
  
  return pages
})

// 分页操作
const previousPage = () => {
  if (props.pagination.page > 1) {
    emit('page-change', props.pagination.page - 1)
  }
}

const nextPage = () => {
  if (props.pagination.page < props.pagination.total_pages) {
    emit('page-change', props.pagination.page + 1)
  }
}

const goToPage = (page: number) => {
  if (page !== props.pagination.page && page >= 1 && page <= props.pagination.total_pages) {
    emit('page-change', page)
  }
}
</script>

<style scoped>
/* 分页组件特定样式 */
</style>
