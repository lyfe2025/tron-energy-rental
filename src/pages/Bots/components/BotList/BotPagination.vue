<template>
  <div class="flex justify-center mt-8">
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-700">
        共 {{ total }} 条记录
      </span>
      <div class="flex gap-1">
        <button
          @click="$emit('page-change', currentPage - 1)"
          :disabled="currentPage <= 1"
          class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        <span class="px-3 py-1 text-sm text-gray-700">
          第 {{ currentPage }} / {{ Math.ceil(total / pageSize) }} 页
        </span>
        <button
          @click="$emit('page-change', currentPage + 1)"
          :disabled="currentPage >= Math.ceil(total / pageSize)"
          class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentPage: number
  pageSize: number
  total: number
}

defineProps<Props>()

defineEmits<{
  'page-change': [page: number]
}>()
</script>
