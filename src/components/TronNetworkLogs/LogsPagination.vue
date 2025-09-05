<template>
  <!-- 分页 -->
  <div class="mt-4 flex justify-center">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="[20, 50, 100]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="$emit('sizeChange', $event)"
      @current-change="$emit('currentChange', $event)"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentPage: number
  pageSize: number
  total: number
}

interface Emits {
  (e: 'sizeChange', size: number): void
  (e: 'currentChange', page: number): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.mt-4 {
  margin-top: 1rem;
}

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}
</style>
