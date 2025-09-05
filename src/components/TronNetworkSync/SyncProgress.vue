<!--
 * 同步进度展示组件
 * 职责：显示同步进度和步骤状态
-->
<template>
  <div v-if="steps.length > 0" class="sync-progress mb-4">
    <h4 class="text-lg font-medium mb-2">同步进度</h4>
    <div class="space-y-2">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="flex items-center space-x-2 p-2 rounded"
        :class="getStepClass(step.status)"
      >
        <el-icon v-if="step.status === 'success'" class="text-green-500">
          <Check />
        </el-icon>
        <el-icon v-else-if="step.status === 'error'" class="text-red-500">
          <Close />
        </el-icon>
        <el-icon v-else-if="step.status === 'loading'" class="text-blue-500">
          <Loading />
        </el-icon>
        <el-icon v-else class="text-gray-400">
          <Clock />
        </el-icon>
        
        <span class="flex-1">{{ step.name }}</span>
        
        <span v-if="step.duration" class="text-xs text-gray-500">
          {{ step.duration }}ms
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Clock, Close, Loading } from '@element-plus/icons-vue'

interface SyncStep {
  name: string
  status: 'pending' | 'loading' | 'success' | 'error'
  duration?: number
}

interface Props {
  steps: SyncStep[]
}

defineProps<Props>()

const getStepClass = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-50 border border-green-200'
    case 'error': return 'bg-red-50 border border-red-200'
    case 'loading': return 'bg-blue-50 border border-blue-200'
    default: return 'bg-gray-50 border border-gray-200'
  }
}
</script>

<style scoped>
.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.p-2 {
  padding: 0.5rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.flex-1 {
  flex: 1 1 0%;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.text-green-500 {
  color: #10b981;
}

.text-red-500 {
  color: #ef4444;
}

.text-blue-500 {
  color: #3b82f6;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-gray-500 {
  color: #6b7280;
}

.bg-green-50 {
  background-color: #f0fdf4;
}

.bg-red-50 {
  background-color: #fef2f2;
}

.bg-blue-50 {
  background-color: #eff6ff;
}

.bg-gray-50 {
  background-color: #f9fafb;
}

.border {
  border-width: 1px;
}

.border-green-200 {
  border-color: #bbf7d0;
}

.border-red-200 {
  border-color: #fecaca;
}

.border-blue-200 {
  border-color: #bfdbfe;
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.rounded {
  border-radius: 0.25rem;
}
</style>
