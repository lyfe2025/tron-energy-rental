<template>
  <el-collapse-item title="📊 库存通知" name="stock">
    <div class="notification-group">
      
      <!-- 库存预警通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">库存预警通知</span>
            <p class="item-description">能量池库存不足时通知管理员</p>
          </div>
          <el-switch 
            v-model="config.stock_warning.enabled"
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.stock_warning.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="仅管理员">
                <el-switch 
                  v-model="config.stock_warning.admin_only" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预警阈值">
                <el-input-number 
                  v-model="stockWarningThreshold"
                  :min="10" :max="90" :step="5"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">%</span>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-alert
            title="库存预警说明"
            type="error"
            :closable="false"
            show-icon
          >
            <template #default>
              当能量池库存低于阈值时，向管理员发送预警，提醒及时补充
            </template>
          </el-alert>
        </div>
      </div>

    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import type { PriceNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

interface Props {
  modelValue: PriceNotificationConfig
}

interface Emits {
  (e: 'update:modelValue', value: PriceNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const stockWarningThreshold = ref(20)

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<style scoped>
.notification-group {
  @apply space-y-4;
}

.notification-item {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow;
}

.item-header {
  @apply flex items-center justify-between mb-4;
}

.item-info {
  @apply flex-1;
}

.item-title {
  @apply text-gray-900 font-semibold text-base block;
}

.item-description {
  @apply text-gray-400 text-sm mt-1;
}

.item-content {
  @apply mt-4 space-y-4;
}

:deep(.el-form-item__label) {
  @apply text-gray-300;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

:deep(.el-input-number .el-input__inner) {
  @apply text-center;
}

:deep(.el-alert) {
  @apply bg-blue-50 border-blue-200;
}

:deep(.el-alert__title),
:deep(.el-alert__description) {
  @apply text-gray-300;
}
</style>
