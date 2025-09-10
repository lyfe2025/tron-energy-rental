<template>
  <!-- 导入配置对话框 -->
  <el-dialog :model-value="visible" title="导入配置" width="600px" @update:model-value="handleVisibilityChange">
    <el-upload
      :auto-upload="false"
      :on-change="handleFileChange"
      :show-file-list="false"
      accept=".json"
      drag
    >
      <el-icon class="upload-icon"><Plus /></el-icon>
      <div class="text-gray-300">点击或拖拽文件到此区域上传</div>
      <div class="text-sm text-gray-400 mt-2">只支持.json格式的配置文件</div>
    </el-upload>
    
    <template #footer>
      <el-button @click="handleVisibilityChange(false)">取消</el-button>
      <el-button type="primary" @click="emit('confirm-import')" :disabled="!hasImportData">确认导入</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'

interface Props {
  visible: boolean
  hasImportData: boolean
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'file-change', file: any): void
  (e: 'confirm-import'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleFileChange = (file: any) => {
  emit('file-change', file)
}

const handleVisibilityChange = (visible: boolean) => {
  emit('update:visible', visible)
}
</script>

<style scoped>
:deep(.el-dialog) {
  @apply bg-white border border-gray-200 shadow-xl;
}

:deep(.el-dialog__header) {
  @apply bg-gray-800 border-b border-gray-700;
}

:deep(.el-dialog__title) {
  @apply text-gray-900;
}

:deep(.el-upload-dragger) {
  @apply bg-gray-800 border-gray-600 hover:border-green-600;
}

.upload-icon {
  @apply text-6xl text-gray-400;
}
</style>
