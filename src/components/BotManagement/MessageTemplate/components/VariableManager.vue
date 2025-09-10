<template>
  <!-- 变量管理对话框 -->
  <el-dialog :model-value="visible" title="变量管理" width="600px" @update:model-value="$emit('update:visible', $event)">
    <div class="variable-manager">
      <div 
        v-for="(variable, index) in variables" 
        :key="index"
        class="variable-item"
      >
        <el-row :gutter="10">
          <el-col :span="6">
            <el-input v-model="variable.name" placeholder="变量名" />
          </el-col>
          <el-col :span="4">
            <el-select v-model="variable.type" placeholder="类型" class="w-full">
              <el-option label="字符串" value="string" />
              <el-option label="数字" value="number" />
              <el-option label="日期" value="date" />
              <el-option label="货币" value="currency" />
            </el-select>
          </el-col>
          <el-col :span="10">
            <el-input v-model="variable.description" placeholder="描述" />
          </el-col>
          <el-col :span="4">
            <el-button 
              size="small" 
              type="danger"
              @click="$emit('remove-variable', index)"
            >
              删除
            </el-button>
          </el-col>
        </el-row>
      </div>
      <el-button size="small" @click="$emit('add-variable')">➕ 添加变量</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import type { TemplateVariable } from '../types/template.types'

interface Props {
  visible: boolean
  variables: TemplateVariable[]
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'add-variable'): void
  (e: 'remove-variable', index: number): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.variable-manager {
  @apply space-y-3;
}

.variable-item {
  @apply p-3 bg-gray-800 rounded border border-gray-700;
}

:deep(.el-dialog) {
  @apply bg-white border border-gray-200 shadow-xl;
}

:deep(.el-dialog__header) {
  @apply bg-gray-800 border-b border-gray-700;
}

:deep(.el-dialog__title) {
  @apply text-gray-900;
}

:deep(.el-input__inner) {
  @apply bg-gray-800 border-gray-600 text-gray-900;
}

:deep(.el-select .el-input__inner) {
  @apply bg-gray-800 border-gray-600 text-gray-900;
}
</style>
