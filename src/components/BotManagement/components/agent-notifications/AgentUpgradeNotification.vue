<template>
  <el-collapse-item title="⭐ 升级通知" name="upgrade">
    <div class="notification-group">
      
      <!-- 代理等级升级通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">代理等级升级通知</span>
            <p class="item-description">达到升级条件时发送祝贺通知</p>
          </div>
          <el-switch 
            v-model="config.level_upgrade.enabled"
            active-color="#3B82F6"
              inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.level_upgrade.enabled">
          <el-form-item label="包含新权益介绍">
            <el-switch 
              v-model="config.level_upgrade.include_benefits" 
              active-color="#3B82F6"
              inactive-color="#E5E7EB"
            />
            <div class="mt-2 text-sm text-gray-400">
              详细介绍新等级的佣金率、权益和特权
            </div>
          </el-form-item>
          
          <el-form-item label="升级条件展示">
            <el-checkbox-group v-model="upgradeDisplayOptions">
              <el-checkbox label="show_progress">显示升级进度</el-checkbox>
              <el-checkbox label="next_level_preview">下一等级预览</el-checkbox>
              <el-checkbox label="achievement_badge">成就徽章</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </div>
      </div>

    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import type { AgentNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

interface Props {
  modelValue: AgentNotificationConfig
}

interface Emits {
  (e: 'update:modelValue', value: AgentNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const upgradeDisplayOptions = ref(['show_progress', 'achievement_badge'])

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

:deep(.el-checkbox__label) {
  @apply text-gray-300;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}
</style>
