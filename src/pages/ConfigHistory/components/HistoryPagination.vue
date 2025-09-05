<template>
  <!-- 分页 -->
  <div class="flex justify-center mt-6" v-if="showPagination">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next, jumper, total"
      @current-change="$emit('currentChange', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  pageSize: number
  total: number
}

interface Emits {
  (e: 'currentChange', page: number): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const showPagination = computed(() => {
  return props.total > props.pageSize
})
</script>

<style scoped>
.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}

.mt-6 {
  margin-top: 1.5rem;
}
</style>
