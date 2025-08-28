<template>
  <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
    <!-- 移动端分页 -->
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        @click="goToPrevious"
        :disabled="currentPage <= 1"
        class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上一页
      </button>
      <button
        @click="goToNext"
        :disabled="currentPage >= totalPages"
        class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一页
      </button>
    </div>

    <!-- 桌面端分页 -->
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <!-- 统计信息 -->
      <div>
        <p class="text-sm text-gray-700">
          显示第
          <span class="font-medium">{{ startItem }}</span>
          到
          <span class="font-medium">{{ endItem }}</span>
          条，共
          <span class="font-medium">{{ total }}</span>
          条记录
        </p>
      </div>

      <!-- 分页控件 -->
      <div>
        <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="分页">
          <!-- 上一页按钮 -->
          <button
            @click="goToPrevious"
            :disabled="currentPage <= 1"
            class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">上一页</span>
            <ChevronLeft class="h-5 w-5" aria-hidden="true" />
          </button>

          <!-- 页码按钮 -->
          <template v-for="page in visiblePages" :key="page">
            <button
              v-if="page !== '...'"
              @click="goToPage(page as number)"
              :class="[
                'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0',
                page === currentPage
                  ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                  : 'text-gray-900'
              ]"
            >
              {{ page }}
            </button>
            <span
              v-else
              class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
            >
              ...
            </span>
          </template>

          <!-- 下一页按钮 -->
          <button
            @click="goToNext"
            :disabled="currentPage >= totalPages"
            class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">下一页</span>
            <ChevronRight class="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

interface Props {
  currentPage: number;
  pageSize: number;
  total: number;
  maxVisiblePages?: number;
}

interface Emits {
  'update:currentPage': [page: number];
  'page-change': [page: number];
}

const props = withDefaults(defineProps<Props>(), {
  maxVisiblePages: 7
});

const emit = defineEmits<Emits>();

// 计算属性
const totalPages = computed(() => {
  return Math.ceil(props.total / props.pageSize);
});

const startItem = computed(() => {
  if (props.total === 0) return 0;
  return (props.currentPage - 1) * props.pageSize + 1;
});

const endItem = computed(() => {
  const end = props.currentPage * props.pageSize;
  return Math.min(end, props.total);
});

// 可见页码计算
const visiblePages = computed(() => {
  const pages: (number | string)[] = [];
  const total = totalPages.value;
  const current = props.currentPage;
  const maxVisible = props.maxVisiblePages;

  if (total <= maxVisible) {
    // 总页数小于等于最大可见页数，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    // 总页数大于最大可见页数，需要省略
    const halfVisible = Math.floor(maxVisible / 2);
    
    if (current <= halfVisible + 1) {
      // 当前页在前半部分
      for (let i = 1; i <= maxVisible - 2; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    } else if (current >= total - halfVisible) {
      // 当前页在后半部分
      pages.push(1);
      pages.push('...');
      for (let i = total - (maxVisible - 3); i <= total; i++) {
        pages.push(i);
      }
    } else {
      // 当前页在中间部分
      pages.push(1);
      pages.push('...');
      for (let i = current - halfVisible + 2; i <= current + halfVisible - 2; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    }
  }

  return pages;
});

// 方法
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value && page !== props.currentPage) {
    emit('update:currentPage', page);
    emit('page-change', page);
  }
};

const goToPrevious = () => {
  if (props.currentPage > 1) {
    goToPage(props.currentPage - 1);
  }
};

const goToNext = () => {
  if (props.currentPage < totalPages.value) {
    goToPage(props.currentPage + 1);
  }
};
</script>