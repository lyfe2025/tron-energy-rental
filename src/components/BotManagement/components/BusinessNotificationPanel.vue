<template>
  <div class="business-notification-panel">
    <div class="panel-header mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span class="text-2xl">💼</span>
            业务通知配置
          </h3>
          <p class="text-gray-600 text-sm mt-1">配置订单、支付、能量代理等核心业务流程的通知</p>
        </div>
        <el-switch 
          v-model="config.enabled"
          active-text="已启用"
          inactive-text="已禁用"
          size="large"
          active-color="#3B82F6"
          inactive-color="#E5E7EB"
          @change="$emit('save')"
        />
      </div>
    </div>

    <!-- 订单相关通知 -->
    <el-collapse v-model="activeNames" class="notification-collapse">
      
      <el-collapse-item title="📋 订单通知" name="order">
        <div class="notification-group">
          
          <!-- 订单创建通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">订单创建通知</span>
                <p class="item-description">用户下单成功时立即发送确认通知</p>
              </div>
              <el-switch 
                v-model="config.order_created.enabled" 
                active-color="#3B82F6"
                inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.order_created.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="发送延迟">
                    <el-input-number 
                      v-model="config.order_created.delay_seconds"
                      :min="0" :max="300" 
                      controls-position="right"
                      class="w-full"
                    />
                    <span class="ml-2 text-gray-400">秒</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="包含图片">
                    <el-switch 
                      v-model="config.order_created.include_image" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="包含内容">
                <el-checkbox-group v-model="orderCreatedFields">
                  <el-checkbox label="order_id">订单号</el-checkbox>
                  <el-checkbox label="package_name">套餐名称</el-checkbox>
                  <el-checkbox label="amount">金额</el-checkbox>
                  <el-checkbox label="target_address">目标地址</el-checkbox>
                  <el-checkbox label="payment_qr">支付二维码</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="操作按钮">
                <el-checkbox-group v-model="orderCreatedButtons">
                  <el-checkbox label="view_details">查看详情</el-checkbox>
                  <el-checkbox label="contact_support">联系客服</el-checkbox>
                  <el-checkbox label="cancel_order">取消订单</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>
          </div>

          <el-divider />

          <!-- 支付成功通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">支付成功通知</span>
                <p class="item-description">检测到支付到账后立即发送确认通知</p>
              </div>
              <el-switch 
                v-model="config.payment_success.enabled"
                active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.payment_success.enabled">
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-form-item label="包含图片">
                    <el-switch 
                      v-model="config.payment_success.include_image" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="显示交易链接">
                    <el-switch 
                      v-model="config.payment_success.show_tx_link" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="包含按钮">
                    <el-switch 
                      v-model="config.payment_success.include_buttons" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="后续操作提示">
                <el-checkbox-group v-model="paymentSuccessActions">
                  <el-checkbox label="show_processing_time">显示处理时间</el-checkbox>
                  <el-checkbox label="show_delegation_status">显示代理状态</el-checkbox>
                  <el-checkbox label="offer_more_packages">推荐其他套餐</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>
          </div>

          <el-divider />

          <!-- 支付失败通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">支付失败通知</span>
                <p class="item-description">支付超时或失败时发送提醒通知</p>
              </div>
              <el-switch 
                v-model="config.payment_failed.enabled"
                active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.payment_failed.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="重试通知">
                    <el-switch 
                      v-model="config.payment_failed.retry_notification" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="包含客服联系">
                    <el-switch 
                      v-model="config.payment_failed.include_support_contact" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>

        </div>
      </el-collapse-item>

      <!-- 能量代理通知 -->
      <el-collapse-item title="⚡ 能量代理通知" name="energy">
        <div class="notification-group">
          
          <!-- 能量代理成功通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">能量代理成功通知</span>
                <p class="item-description">能量代理完成后发送确认通知</p>
              </div>
              <el-switch 
                v-model="config.energy_delegation_complete.enabled"
                active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.energy_delegation_complete.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="显示交易链接">
                    <el-switch 
                      v-model="config.energy_delegation_complete.show_tx_link" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="包含图片">
                    <el-switch 
                      v-model="config.energy_delegation_complete.include_image" 
                      active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>

          <el-divider />

          <!-- 能量代理失败通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">能量代理失败通知</span>
                <p class="item-description">代理过程失败时发送错误通知</p>
              </div>
              <el-switch 
                v-model="config.energy_delegation_failed.enabled"
                active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.energy_delegation_failed.enabled">
              <el-form-item label="包含客服联系">
                <el-switch 
                  v-model="config.energy_delegation_failed.include_support_contact" 
                  active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                />
              </el-form-item>
            </div>
          </div>

        </div>
      </el-collapse-item>

      <!-- 账户相关通知 -->
      <el-collapse-item title="💰 账户通知" name="account">
        <div class="notification-group">
          
          <!-- 余额充值成功通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">余额充值成功通知</span>
                <p class="item-description">用户充值到账后发送确认通知</p>
              </div>
              <el-switch 
                v-model="config.balance_recharged.enabled"
                active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
          </div>

          <el-divider />

          <!-- 余额不足提醒 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">余额不足提醒</span>
                <p class="item-description">下单时余额不足时发送提醒</p>
              </div>
              <el-switch 
                v-model="config.balance_insufficient.enabled"
                active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
          </div>

          <!-- 订单状态更新通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">订单状态更新通知</span>
                <p class="item-description">订单状态变更时发送更新通知</p>
              </div>
              <el-switch 
                v-model="config.order_status_update.enabled"
                active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.order_status_update.enabled">
              <el-form-item label="编辑现有消息">
                <el-switch 
                  v-model="config.order_status_update.edit_existing_message" 
                  active-color="#3B82F6"
                      inactive-color="#E5E7EB"
                />
                <div class="mt-2 text-sm text-gray-400">
                  启用后将编辑原消息而不是发送新消息
                </div>
              </el-form-item>
            </div>
          </div>

        </div>
      </el-collapse-item>

    </el-collapse>

    <!-- 配置预览 -->
    <div class="config-preview mt-6">
      <el-card>
        <template #header>
          <span class="text-gray-900 font-semibold flex items-center gap-2">
            <span class="text-xl">📊</span>
            配置概览
          </span>
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
import type { BusinessNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

interface Props {
  modelValue: BusinessNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: BusinessNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const activeNames = ref(['order', 'energy', 'account'])

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 配置字段
const orderCreatedFields = ref(['order_id', 'package_name', 'amount', 'target_address'])
const orderCreatedButtons = ref(['view_details', 'contact_support'])
const paymentSuccessActions = ref(['show_processing_time', 'show_delegation_status'])

// 统计信息
const enabledCount = computed(() => {
  const notifications = [
    config.value.order_created,
    config.value.payment_success,
    config.value.payment_failed,
    config.value.energy_delegation_complete,
    config.value.energy_delegation_failed,
    config.value.order_status_update,
    config.value.balance_recharged,
    config.value.balance_insufficient
  ]
  return notifications.filter(n => n.enabled).length
})

const totalCount = computed(() => 8)
</script>

<style scoped>
.business-notification-panel {
  @apply min-h-full;
}

:deep(.notification-collapse) {
  @apply bg-transparent border-0;
}

:deep(.notification-collapse .el-collapse-item) {
  @apply bg-white border border-gray-200 rounded-lg mb-4 shadow-sm;
}

:deep(.notification-collapse .el-collapse-item__header) {
  @apply bg-gray-50 text-gray-900 px-6 py-4 text-lg font-semibold border-0 rounded-t-lg hover:bg-gray-100 transition-colors;
}

:deep(.notification-collapse .el-collapse-item__content) {
  @apply bg-white border-0 px-6 pb-6;
}

:deep(.notification-collapse .el-collapse-item.is-active .el-collapse-item__header) {
  @apply border-b border-gray-200 bg-blue-50;
}

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
  @apply text-gray-600 text-sm mt-1;
}

.item-content {
  @apply mt-4 space-y-4;
}

:deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

:deep(.el-input-number .el-input__inner) {
  @apply text-center;
}

:deep(.el-checkbox__label) {
  @apply text-gray-700;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-blue-600 border-blue-600;
}

.config-preview :deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

.config-preview :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.stat-item {
  @apply text-center p-3 bg-blue-50 rounded-lg border border-blue-200;
}

.stat-value {
  @apply text-2xl font-bold text-blue-600;
}

.stat-label {
  @apply text-sm text-gray-600 mt-1;
}

/* 按钮样式优化 */
:deep(.el-button) {
  @apply rounded-lg font-medium transition-all duration-200;
}

:deep(.el-button--primary) {
  @apply bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm hover:shadow-md;
}

/* 开关样式优化 */
:deep(.el-switch) {
  @apply transition-all duration-200;
}

:deep(.el-switch.is-checked .el-switch__core) {
  @apply bg-blue-600 border-blue-600;
}

/* 卡片阴影效果 */
.business-notification-panel .bg-white {
  @apply shadow-sm hover:shadow-md transition-shadow duration-200;
}
</style>
