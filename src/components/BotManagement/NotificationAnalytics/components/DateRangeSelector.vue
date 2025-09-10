<template>
  <div class="date-range-selector mb-6">
    <el-card>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-gray-900 font-medium">📊 数据分析时间范围</span>
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="$emit('change')"
            class="w-96"
          />
          <el-select v-model="quickRange" @change="handleQuickRangeChange" class="w-32">
            <el-option label="今天" value="today" />
            <el-option label="昨天" value="yesterday" />
            <el-option label="近7天" value="week" />
            <el-option label="近30天" value="month" />
            <el-option label="近90天" value="quarter" />
          </el-select>
        </div>
        <div class="flex items-center gap-2">
          <el-button type="info" @click="$emit('export')" :loading="exporting">
            📋 导出报告
          </el-button>
          <el-button @click="$emit('refresh')" :loading="loading">
            🔄 刷新数据
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue: [string, string]
  loading?: boolean
  exporting?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: [string, string]): void
  (e: 'change'): void
  (e: 'export'): void
  (e: 'refresh'): void
  (e: 'quick-range-change', range: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  exporting: false
})

const emit = defineEmits<Emits>()

const dateRange = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const quickRange = ref('week')

const handleQuickRangeChange = (range: string) => {
  emit('quick-range-change', range)
}
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

:deep(.el-card__header) {
  @apply bg-gray-800 border-gray-700;
}

:deep(.el-input__inner),
:deep(.el-select .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}

:deep(.el-date-editor .el-input__inner) {
  @apply bg-gray-800 border-gray-600 text-white;
}
</style>
