<template>
  <!-- 过滤器 -->
  <div class="mb-4 p-4 bg-gray-50 rounded-lg">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">日志级别</label>
        <el-select v-model="filters.level" placeholder="选择级别" clearable>
          <el-option label="全部" value="" />
          <el-option label="信息" value="info" />
          <el-option label="警告" value="warning" />
          <el-option label="错误" value="error" />
          <el-option label="调试" value="debug" />
        </el-select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
        <el-select v-model="filters.action" placeholder="选择操作" clearable>
          <el-option label="全部" value="" />
          <el-option label="连接测试" value="connection_test" />
          <el-option label="配置更新" value="config_update" />
          <el-option label="配置同步" value="config_sync" />
          <el-option label="状态变更" value="status_change" />
          <el-option label="健康检查" value="health_check" />
        </el-select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
        <el-date-picker
          v-model="filters.dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </div>
      <div class="flex items-end">
        <el-button type="primary" @click="$emit('query')">查询</el-button>
        <el-button @click="$emit('reset')">重置</el-button>
        <el-button @click="$emit('export')">导出</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Filters {
  level: string
  action: string
  dateRange: [string, string] | null
}

interface Props {
  filters: Filters
}

interface Emits {
  (e: 'query'): void
  (e: 'reset'): void
  (e: 'export'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.gap-4 {
  gap: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.p-4 {
  padding: 1rem;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-medium {
  font-weight: 500;
}

.text-gray-700 {
  color: #374151;
}

.flex {
  display: flex;
}

.items-end {
  align-items: flex-end;
}

.block {
  display: block;
}
</style>
