<template>
  <el-collapse-item title="📈 价格变动通知" name="price_change">
    <div class="notification-group">
      
      <!-- 价格上涨通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">价格上涨通知</span>
            <p class="item-description">能量价格上涨时提醒用户及时购买</p>
          </div>
          <el-switch 
            v-model="config.price_increase.enabled" 
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.price_increase.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="触发阈值">
                <el-input-number 
                  v-model="config.price_increase.threshold_percent"
                  :min="1" :max="50" :step="1"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">%</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="紧急提醒">
                <el-switch 
                  v-model="priceIncreaseUrgent" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="通知内容">
            <el-checkbox-group v-model="priceIncreaseContent">
              <el-checkbox label="show_percentage">显示涨幅百分比</el-checkbox>
              <el-checkbox label="show_comparison">显示价格对比</el-checkbox>
              <el-checkbox label="suggest_action">建议购买时机</el-checkbox>
              <el-checkbox label="market_analysis">市场分析</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-alert
            title="价格上涨提醒策略"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              当价格上涨超过设定阈值时，向订阅用户发送提醒，建议提前购买
            </template>
          </el-alert>
        </div>
      </div>

      <el-divider />

      <!-- 价格下降通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">价格下降通知</span>
            <p class="item-description">能量价格下降时通知用户优惠机会</p>
          </div>
          <el-switch 
            v-model="config.price_decrease.enabled"
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.price_decrease.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="触发阈值">
                <el-input-number 
                  v-model="config.price_decrease.threshold_percent"
                  :min="1" :max="50" :step="1"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">%</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="优惠标签">
                <el-switch 
                  v-model="priceDecreaseDiscount" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-alert
            title="价格下降提醒策略"
            type="success"
            :closable="false"
            show-icon
          >
            <template #default>
              当价格下降超过设定阈值时，向用户推送优惠购买机会
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
const priceIncreaseUrgent = ref(true)
const priceDecreaseDiscount = ref(true)
const priceIncreaseContent = ref(['show_percentage', 'show_comparison', 'suggest_action'])

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

:deep(.el-checkbox__label) {
  @apply text-gray-300;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}

:deep(.el-alert) {
  @apply bg-blue-50 border-blue-200;
}

:deep(.el-alert__title),
:deep(.el-alert__description) {
  @apply text-gray-300;
}
</style>
