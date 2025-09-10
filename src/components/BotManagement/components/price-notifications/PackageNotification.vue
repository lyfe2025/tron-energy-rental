<template>
  <el-collapse-item title="📦 套餐通知" name="package">
    <div class="notification-group">
      
      <!-- 新套餐上线通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">新套餐上线通知</span>
            <p class="item-description">新增能量套餐时通知所有用户</p>
          </div>
          <el-switch 
            v-model="config.new_package.enabled"
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.new_package.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="通知所有用户">
                <el-switch 
                  v-model="config.new_package.target_all_users" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="限时推广">
                <el-switch 
                  v-model="newPackagePromotion" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="通知内容">
            <el-checkbox-group v-model="newPackageContent">
              <el-checkbox label="package_details">套餐详情</el-checkbox>
              <el-checkbox label="price_comparison">价格对比</el-checkbox>
              <el-checkbox label="benefits_highlight">优势突出</el-checkbox>
              <el-checkbox label="limited_time">限时优惠</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </div>
      </div>

      <el-divider />

      <!-- 限时优惠通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">限时优惠通知</span>
            <p class="item-description">特价活动开始时发送优惠通知</p>
          </div>
          <el-switch 
            v-model="config.limited_offer.enabled"
            active-color="#3B82F6"
            inactive-color="#E5E7EB"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.limited_offer.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="紧急指标">
                <el-switch 
                  v-model="config.limited_offer.urgency_indicators" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="倒计时">
                <el-switch 
                  v-model="limitedOfferCountdown" 
                  active-color="#3B82F6"
            inactive-color="#E5E7EB"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="优惠标识">
            <el-checkbox-group v-model="limitedOfferTags">
              <el-checkbox label="flash_sale">闪购标签</el-checkbox>
              <el-checkbox label="discount_badge">折扣徽章</el-checkbox>
              <el-checkbox label="time_limited">限时标记</el-checkbox>
              <el-checkbox label="stock_alert">库存提醒</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
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
const newPackagePromotion = ref(false)
const limitedOfferCountdown = ref(true)
const newPackageContent = ref(['package_details', 'price_comparison', 'benefits_highlight'])
const limitedOfferTags = ref(['flash_sale', 'discount_badge', 'time_limited'])

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
