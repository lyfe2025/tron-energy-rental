<template>
  <!-- 筛选和搜索 -->
  <div class="filters-section mb-6">
    <el-card class="filter-card">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 搜索 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">搜索</label>
          <el-input
            :model-value="searchQuery"
            placeholder="搜索配置项、操作者..."
            clearable
            @input="$emit('update:searchQuery', $event)"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 配置类型筛选 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">配置类型</label>
          <el-select
            :model-value="configTypeFilter"
            placeholder="选择配置类型"
            clearable
            style="width: 100%"
            @change="$emit('update:configTypeFilter', $event)"
          >
            <el-option label="机器人配置" value="bot" />
            <el-option label="网络配置" value="network" />
            <el-option label="能量池配置" value="energy_pool" />
            <el-option label="系统配置" value="system" />
          </el-select>
        </div>

        <!-- 操作类型筛选 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
          <el-select
            :model-value="actionTypeFilter"
            placeholder="选择操作类型"
            clearable
            style="width: 100%"
            @change="$emit('update:actionTypeFilter', $event)"
          >
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="启用" value="enable" />
            <el-option label="禁用" value="disable" />
          </el-select>
        </div>

        <!-- 时间范围 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
          <el-date-picker
            :model-value="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            @change="$emit('update:dateRange', $event)"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-between items-center mt-4">
        <div class="flex space-x-2">
          <el-button @click="$emit('resetFilters')">
            <el-icon><Refresh /></el-icon>
            重置筛选
          </el-button>
          <el-button type="primary" @click="$emit('exportHistory')">
            <el-icon><Download /></el-icon>
            导出历史
          </el-button>
        </div>
        <div class="text-sm text-gray-500">
          共 {{ totalCount }} 条记录
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Download, Refresh, Search } from '@element-plus/icons-vue'

interface Props {
  searchQuery: string
  configTypeFilter: string
  actionTypeFilter: string
  dateRange: [string, string] | null
  totalCount: number
}

interface Emits {
  (e: 'update:searchQuery', value: string): void
  (e: 'update:configTypeFilter', value: string): void
  (e: 'update:actionTypeFilter', value: string): void
  (e: 'update:dateRange', value: [string, string] | null): void
  (e: 'resetFilters'): void
  (e: 'exportHistory'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.filter-card {
  border: 1px solid #e4e7ed;
}

.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.gap-4 {
  gap: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.block {
  display: block;
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

.text-gray-500 {
  color: #6b7280;
}

.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.items-center {
  align-items: center;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}
</style>
