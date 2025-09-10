<template>
  <!-- 按钮配置 -->
  <div class="buttons-config mt-6">
    <h4 class="text-gray-900 mb-4">🔘 内联按钮配置</h4>
    <div 
      v-for="(buttonRow, rowIndex) in buttons" 
      :key="rowIndex"
      class="button-row-config mb-3"
    >
      <div class="row-header mb-2">
        <span class="text-gray-700">第 {{ rowIndex + 1 }} 行按钮</span>
        <el-button size="small" type="danger" @click="$emit('remove-row', rowIndex)">删除行</el-button>
      </div>
      <div 
        v-for="(button, btnIndex) in buttonRow" 
        :key="btnIndex"
        class="button-config-item mb-2"
      >
        <el-row :gutter="10">
          <el-col :span="6">
            <el-input v-model="button.text" placeholder="按钮文字" />
          </el-col>
          <el-col :span="4">
            <el-select v-model="button.type" placeholder="类型" class="w-full">
              <el-option label="回调" value="callback_data" />
              <el-option label="链接" value="url" />
            </el-select>
          </el-col>
          <el-col :span="8">
            <el-input v-model="button.value" placeholder="回调数据或URL" />
          </el-col>
          <el-col :span="4">
            <el-button size="small" @click="$emit('add-button', rowIndex)">➕</el-button>
            <el-button 
              size="small" 
              type="danger"
              @click="$emit('remove-button', { row: rowIndex, button: btnIndex })"
              :disabled="buttonRow.length === 1"
            >
              ➖
            </el-button>
          </el-col>
        </el-row>
      </div>
    </div>
    
    <el-button 
      type="primary" 
      size="small"
      @click="$emit('add-row')"
      class="bg-green-600 hover:bg-green-700 border-green-600"
    >
      ➕ 添加按钮行
    </el-button>
  </div>
</template>

<script setup lang="ts">
import type { TemplateButton } from '../types/template.types'

interface Props {
  buttons: TemplateButton[][]
}

interface Emits {
  (e: 'add-row'): void
  (e: 'remove-row', index: number): void
  (e: 'add-button', rowIndex: number): void
  (e: 'remove-button', data: { row: number, button: number }): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.buttons-config {
  @apply p-4 bg-gray-50 rounded border border-gray-200;
}

.button-row-config {
  @apply p-3 bg-white rounded border border-gray-600;
}

.row-header {
  @apply flex items-center justify-between;
}

.button-config-item {
  @apply space-y-2;
}

:deep(.el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
}

:deep(.el-select .el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
}
</style>
