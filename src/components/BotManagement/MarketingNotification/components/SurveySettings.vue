<template>
  <el-collapse-item title="📋 调研反馈" name="survey">
    <div class="notification-group">
      
      <!-- 满意度调查 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">满意度调查</span>
            <p class="item-description">定期收集用户反馈和建议</p>
            <div class="auto-trigger-badge">🤖 自动触发</div>
          </div>
          <el-switch 
            v-model="config.satisfaction_survey.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.satisfaction_survey.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="调查频率">
                <el-input-number 
                  v-model="config.satisfaction_survey.frequency_days"
                  :min="30" :max="365" :step="30"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">天</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="参与奖励">
                <el-switch 
                  v-model="surveyReward" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="调查内容">
            <el-checkbox-group v-model="surveyContent">
              <el-checkbox label="service_quality">服务质量</el-checkbox>
              <el-checkbox label="feature_satisfaction">功能满意度</el-checkbox>
              <el-checkbox label="price_feedback">价格反馈</el-checkbox>
              <el-checkbox label="improvement_suggestions">改进建议</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </div>
      </div>

      <el-divider />

      <!-- 生日祝福 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">生日祝福</span>
            <p class="item-description">用户生日当天发送祝福和礼品</p>
            <div class="auto-trigger-badge">🤖 自动触发</div>
          </div>
          <el-switch 
            v-model="config.birthday_greeting.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.birthday_greeting.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="包含礼品">
                <el-switch 
                  v-model="birthdayGift" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发送时间">
                <el-time-picker
                  v-model="birthdayTime"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="选择时间"
                  class="w-full"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="生日礼品">
            <el-radio-group v-model="birthdayGiftType">
              <el-radio label="discount_coupon">折扣券</el-radio>
              <el-radio label="free_energy">免费能量</el-radio>
              <el-radio label="vip_trial">VIP试用</el-radio>
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
const surveyReward = ref(true)
const birthdayGift = ref(true)
const birthdayTime = ref('10:00')

// 调查内容配置
const surveyContent = ref(['service_quality', 'feature_satisfaction', 'improvement_suggestions'])

// 类型配置
const birthdayGiftType = ref('discount_coupon')
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

:deep(.el-input-number .el-input__inner) {
  @apply text-center;
}

:deep(.el-time-picker .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
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
