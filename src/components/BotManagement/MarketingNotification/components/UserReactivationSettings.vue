<template>
  <el-collapse-item title="🔄 用户召回" name="reactivation">
    <div class="notification-group">
      
      <!-- 用户召回通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">用户召回通知</span>
            <p class="item-description">长期未使用的用户召回活动</p>
            <div class="auto-trigger-badge">🤖 自动触发</div>
          </div>
          <el-switch 
            v-model="config.user_reactivation.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.user_reactivation.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="未活跃天数">
                <el-input-number 
                  v-model="config.user_reactivation.inactive_days"
                  :min="7" :max="180" :step="7"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">天</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="召回优惠">
                <el-switch 
                  v-model="reactivationDiscount" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="召回策略">
            <el-checkbox-group v-model="reactivationStrategy">
              <el-checkbox label="personalized_message">个性化消息</el-checkbox>
              <el-checkbox label="comeback_bonus">回归奖励</el-checkbox>
              <el-checkbox label="feature_highlights">功能亮点</el-checkbox>
              <el-checkbox label="success_stories">成功案例</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="召回频率">
            <el-radio-group v-model="reactivationFrequency">
              <el-radio label="once">仅一次</el-radio>
              <el-radio label="weekly">每周一次</el-radio>
              <el-radio label="monthly">每月一次</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
      </div>

    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import type { MarketingNotificationConfig } from '@/types/notification';
import { ref } from 'vue';

interface Props {
  config: MarketingNotificationConfig
}

interface Emits {
  (e: 'save'): void
}

defineProps<Props>()
defineEmits<Emits>()

// 配置选项
const reactivationDiscount = ref(true)

// 策略配置
const reactivationStrategy = ref(['personalized_message', 'comeback_bonus', 'feature_highlights'])

// 频率配置
const reactivationFrequency = ref('monthly')
</script>

<style scoped>
.notification-group {
  @apply space-y-4;
}

.notification-item {
  @apply bg-gray-800 rounded-lg p-4 border border-gray-700;
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

.auto-trigger-badge {
  @apply inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mt-2;
}

.item-content {
  @apply mt-4 space-y-4;
}

:deep(.el-form-item__label) {
  @apply text-gray-300;
}

:deep(.el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

:deep(.el-input-number .el-input__inner) {
  @apply text-center;
}

:deep(.el-checkbox__label) {
  @apply text-gray-300;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}

:deep(.el-radio__label) {
  @apply text-gray-300;
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  @apply bg-green-600 border-green-600;
}
</style>
