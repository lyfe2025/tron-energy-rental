<template>
  <div class="price-notification-panel">
    <div class="panel-header mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">💰 价格通知配置</h3>
          <p class="text-gray-400 text-sm mt-1">配置价格变动、新套餐、优惠活动等价格相关通知</p>
        </div>
        <el-switch 
          v-model="config.enabled"
          active-text="已启用"
          inactive-text="已禁用"
          size="large"
          active-color="#00ff88"
          @change="$emit('save')"
        />
      </div>
    </div>

    <!-- 价格变动通知 -->
    <el-collapse v-model="activeNames" class="notification-collapse">
      
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
                active-color="#00ff88"
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
                      active-color="#00ff88"
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
                active-color="#00ff88"
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
                      active-color="#00ff88"
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

      <!-- 套餐相关通知 -->
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
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.new_package.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="通知所有用户">
                    <el-switch 
                      v-model="config.new_package.target_all_users" 
                      active-color="#00ff88"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="限时推广">
                    <el-switch 
                      v-model="newPackagePromotion" 
                      active-color="#00ff88"
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
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.limited_offer.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="紧急指标">
                    <el-switch 
                      v-model="config.limited_offer.urgency_indicators" 
                      active-color="#00ff88"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="倒计时">
                    <el-switch 
                      v-model="limitedOfferCountdown" 
                      active-color="#00ff88"
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

      <!-- 库存管理通知 -->
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
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.stock_warning.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="仅管理员">
                    <el-switch 
                      v-model="config.stock_warning.admin_only" 
                      active-color="#00ff88"
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

    </el-collapse>

    <!-- 价格监控设置 -->
    <div class="price-monitoring-config mt-6">
      <el-card>
        <template #header>
          <span class="text-white">📊 价格监控设置</span>
        </template>
        <div class="monitoring-grid">
          <div class="monitoring-item">
            <div class="monitoring-header">
              <span class="monitoring-icon">📈</span>
              <span class="monitoring-title">实时监控</span>
            </div>
            <div class="monitoring-details">
              <el-switch 
                v-model="realTimeMonitoring" 
                active-color="#00ff88"
                active-text="已启用"
                inactive-text="已禁用"
              />
              <p class="monitoring-desc">每5分钟检查价格变动</p>
            </div>
          </div>
          
          <div class="monitoring-item">
            <div class="monitoring-header">
              <span class="monitoring-icon">⏰</span>
              <span class="monitoring-title">定时报告</span>
            </div>
            <div class="monitoring-details">
              <el-select v-model="dailyReportTime" placeholder="选择时间" class="w-full">
                <el-option label="上午 9:00" value="09:00" />
                <el-option label="中午 12:00" value="12:00" />
                <el-option label="下午 18:00" value="18:00" />
                <el-option label="晚上 21:00" value="21:00" />
              </el-select>
              <p class="monitoring-desc">每日价格走势汇总</p>
            </div>
          </div>
          
          <div class="monitoring-item">
            <div class="monitoring-header">
              <span class="monitoring-icon">🎯</span>
              <span class="monitoring-title">目标价格</span>
            </div>
            <div class="monitoring-details">
              <el-input-number 
                v-model="targetPrice"
                :min="0.01" :max="10" :step="0.01"
                controls-position="right"
                class="w-full"
              />
              <p class="monitoring-desc">价格目标提醒 (TRX)</p>
            </div>
          </div>
          
          <div class="monitoring-item">
            <div class="monitoring-header">
              <span class="monitoring-icon">📱</span>
              <span class="monitoring-title">推送策略</span>
            </div>
            <div class="monitoring-details">
              <el-select v-model="pushStrategy" placeholder="选择策略" class="w-full">
                <el-option label="立即推送" value="immediate" />
                <el-option label="智能时间" value="smart" />
                <el-option label="批量推送" value="batch" />
              </el-select>
              <p class="monitoring-desc">通知发送时机控制</p>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 配置预览 -->
    <div class="config-preview mt-6">
      <el-card>
        <template #header>
          <span class="text-white">📊 配置概览</span>
        </template>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="stat-item">
            <div class="stat-value">{{ enabledCount }}</div>
            <div class="stat-label">已启用通知</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ totalCount }}</div>
            <div class="stat-label">总通知数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ Math.round((enabledCount / totalCount) * 100) }}%</div>
            <div class="stat-label">启用率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ config.enabled ? '✅' : '❌' }}</div>
            <div class="stat-label">模块状态</div>
          </div>
        </div>
      </el-card>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { PriceNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

interface Props {
  modelValue: PriceNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: PriceNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const activeNames = ref(['price_change', 'package', 'stock'])

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 配置选项
const priceIncreaseUrgent = ref(true)
const priceDecreaseDiscount = ref(true)
const newPackagePromotion = ref(false)
const limitedOfferCountdown = ref(true)
const stockWarningThreshold = ref(20)

// 通知内容配置
const priceIncreaseContent = ref(['show_percentage', 'show_comparison', 'suggest_action'])
const newPackageContent = ref(['package_details', 'price_comparison', 'benefits_highlight'])
const limitedOfferTags = ref(['flash_sale', 'discount_badge', 'time_limited'])

// 价格监控配置
const realTimeMonitoring = ref(true)
const dailyReportTime = ref('09:00')
const targetPrice = ref(2.5)
const pushStrategy = ref('smart')

// 统计信息
const enabledCount = computed(() => {
  const notifications = [
    config.value.price_increase,
    config.value.price_decrease,
    config.value.new_package,
    config.value.limited_offer,
    config.value.stock_warning
  ]
  return notifications.filter(n => n.enabled).length
})

const totalCount = computed(() => 5)
</script>

<style scoped>
.price-notification-panel {
  @apply min-h-full;
}

:deep(.notification-collapse) {
  @apply bg-transparent border-0;
}

:deep(.notification-collapse .el-collapse-item) {
  @apply bg-gray-900 border border-gray-700 rounded-lg mb-4;
}

:deep(.notification-collapse .el-collapse-item__header) {
  @apply bg-gray-800 text-white px-6 py-4 text-lg font-semibold border-0 rounded-t-lg;
}

:deep(.notification-collapse .el-collapse-item__content) {
  @apply bg-gray-900 border-0 px-6 pb-6;
}

:deep(.notification-collapse .el-collapse-item.is-active .el-collapse-item__header) {
  @apply border-b border-gray-700;
}

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
  @apply text-white font-semibold text-base block;
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
  @apply bg-gray-800 border-gray-600 text-white;
}

:deep(.el-select .el-input__inner) {
  @apply bg-gray-800 border-gray-600 text-white;
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
  @apply bg-gray-800 border-gray-600;
}

:deep(.el-alert__title),
:deep(.el-alert__description) {
  @apply text-gray-300;
}

.price-monitoring-config :deep(.el-card) {
  @apply bg-gray-900 border-gray-700;
}

.price-monitoring-config :deep(.el-card__header) {
  @apply bg-gray-800 border-gray-700;
}

.monitoring-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.monitoring-item {
  @apply bg-gray-800 rounded-lg p-4 border border-gray-700;
}

.monitoring-header {
  @apply flex items-center gap-2 mb-3;
}

.monitoring-icon {
  @apply text-xl;
}

.monitoring-title {
  @apply text-white font-semibold;
}

.monitoring-details {
  @apply space-y-2;
}

.monitoring-desc {
  @apply text-gray-400 text-xs;
}

.config-preview :deep(.el-card) {
  @apply bg-gray-900 border-gray-700;
}

.config-preview :deep(.el-card__header) {
  @apply bg-gray-800 border-gray-700;
}

.stat-item {
  @apply text-center p-3 bg-gray-800 rounded-lg;
}

.stat-value {
  @apply text-2xl font-bold text-green-400;
}

.stat-label {
  @apply text-sm text-gray-400 mt-1;
}
</style>
