<template>
  <el-collapse-item title="🚀 功能推广" name="feature">
    <div class="notification-group">
      
      <!-- 新功能介绍 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">新功能介绍</span>
            <p class="item-description">功能上线时向目标用户介绍新特性</p>
            <div class="manual-trigger-badge">🔧 管理员手动触发</div>
          </div>
          <el-switch 
            v-model="config.new_feature.enabled" 
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.new_feature.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="仅活跃用户">
                <el-switch 
                  v-model="config.new_feature.target_active_users" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分批发送">
                <el-switch 
                  v-model="newFeatureBatchSend" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="推广策略">
            <el-checkbox-group v-model="newFeatureStrategy">
              <el-checkbox label="tutorial_included">包含使用教程</el-checkbox>
              <el-checkbox label="demo_video">演示视频</el-checkbox>
              <el-checkbox label="early_access">抢先体验</el-checkbox>
              <el-checkbox label="feedback_collection">收集反馈</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-alert
            title="功能推广建议"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              建议在功能稳定后1-2天内发送，避免在用户活跃度低的时间段推送
            </template>
          </el-alert>
        </div>
      </div>

      <el-divider />

      <!-- VIP专享通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">VIP专享通知</span>
            <p class="item-description">VIP用户专享活动和特权通知</p>
            <div class="manual-trigger-badge">🔧 管理员手动触发</div>
          </div>
          <el-switch 
            v-model="config.vip_exclusive.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.vip_exclusive.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="仅VIP用户">
                <el-switch 
                  v-model="config.vip_exclusive.vip_only" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="专属标识">
                <el-switch 
                  v-model="vipExclusiveBadge" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="VIP特权内容">
            <el-checkbox-group v-model="vipExclusiveContent">
              <el-checkbox label="priority_support">优先客服</el-checkbox>
              <el-checkbox label="exclusive_discounts">专享折扣</el-checkbox>
              <el-checkbox label="early_features">功能抢先体验</el-checkbox>
              <el-checkbox label="special_events">专属活动</el-checkbox>
            </el-checkbox-group>
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
const newFeatureBatchSend = ref(true)
const vipExclusiveBadge = ref(true)

// 策略配置
const newFeatureStrategy = ref(['tutorial_included', 'feedback_collection'])
const vipExclusiveContent = ref(['priority_support', 'exclusive_discounts', 'early_features'])
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

.manual-trigger-badge {
  @apply inline-block bg-orange-600 text-white text-xs px-2 py-1 rounded mt-2;
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

:deep(.el-alert) {
  @apply bg-gray-800 border-gray-600;
}

:deep(.el-alert__title),
:deep(.el-alert__description) {
  @apply text-gray-300;
}
</style>
