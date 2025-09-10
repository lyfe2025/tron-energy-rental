<template>
  <div class="agent-notification-panel">
    <div class="panel-header mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">👥 代理通知配置</h3>
          <p class="text-gray-400 text-sm mt-1">配置代理申请、佣金、升级等代理业务相关通知</p>
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

    <!-- 代理申请通知 -->
    <el-collapse v-model="activeNames" class="notification-collapse">
      
      <el-collapse-item title="📝 代理申请通知" name="application">
        <div class="notification-group">
          
          <!-- 代理申请提交通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">代理申请提交通知</span>
                <p class="item-description">用户提交代理申请后立即发送确认通知</p>
              </div>
              <el-switch 
                v-model="config.application_submitted.enabled" 
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.application_submitted.enabled">
              <el-alert
                title="申请确认通知"
                type="info"
                :closable="false"
                show-icon
              >
                <template #default>
                  包含申请状态、审核时间预期、联系方式等信息
                </template>
              </el-alert>
            </div>
          </div>

          <el-divider />

          <!-- 代理审核通过通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">代理审核通过通知</span>
                <p class="item-description">管理员审核通过后发送欢迎通知</p>
              </div>
              <el-switch 
                v-model="config.application_approved.enabled"
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.application_approved.enabled">
              <el-form-item label="包含欢迎指南">
                <el-switch 
                  v-model="config.application_approved.include_welcome_guide" 
                  active-color="#00ff88"
                />
                <div class="mt-2 text-sm text-gray-400">
                  包含代理使用指南和常见问题解答
                </div>
              </el-form-item>
            </div>
          </div>

          <el-divider />

          <!-- 代理审核拒绝通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">代理审核拒绝通知</span>
                <p class="item-description">管理员审核拒绝后发送说明通知</p>
              </div>
              <el-switch 
                v-model="config.application_rejected.enabled"
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.application_rejected.enabled">
              <el-form-item label="包含反馈信息">
                <el-switch 
                  v-model="config.application_rejected.include_feedback" 
                  active-color="#00ff88"
                />
                <div class="mt-2 text-sm text-gray-400">
                  包含拒绝原因和改进建议
                </div>
              </el-form-item>
            </div>
          </div>

        </div>
      </el-collapse-item>

      <!-- 佣金相关通知 -->
      <el-collapse-item title="💰 佣金通知" name="commission">
        <div class="notification-group">
          
          <!-- 佣金到账通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">佣金到账通知</span>
                <p class="item-description">下级用户消费产生佣金时发送通知</p>
              </div>
              <el-switch 
                v-model="config.commission_earned.enabled"
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.commission_earned.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="最小金额阈值">
                    <el-input-number 
                      v-model="config.commission_earned.min_amount"
                      :min="0.1" :max="100" :step="0.1"
                      controls-position="right"
                      class="w-full"
                    />
                    <span class="ml-2 text-gray-400">TRX</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="包含订单详情">
                    <el-switch 
                      v-model="commissionIncludeDetails" 
                      active-color="#00ff88"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-alert
                title="佣金计算说明"
                type="warning"
                :closable="false"
                show-icon
              >
                <template #default>
                  低于阈值的佣金将累积到下次通知一起发送
                </template>
              </el-alert>
            </div>
          </div>

          <el-divider />

          <!-- 提现成功通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">提现成功通知</span>
                <p class="item-description">佣金提现完成后发送确认通知</p>
              </div>
              <el-switch 
                v-model="config.withdrawal_completed.enabled"
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.withdrawal_completed.enabled">
              <el-alert
                title="提现通知内容"
                type="success"
                :closable="false"
                show-icon
              >
                <template #default>
                  包含提现金额、手续费、到账时间、交易哈希等信息
                </template>
              </el-alert>
            </div>
          </div>

        </div>
      </el-collapse-item>

      <!-- 代理升级通知 -->
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
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.level_upgrade.enabled">
              <el-form-item label="包含新权益介绍">
                <el-switch 
                  v-model="config.level_upgrade.include_benefits" 
                  active-color="#00ff88"
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

      <!-- 统计报告通知 -->
      <el-collapse-item title="📊 统计报告" name="reports">
        <div class="notification-group">
          
          <!-- 月度佣金统计通知 -->
          <div class="notification-item">
            <div class="item-header">
              <div class="item-info">
                <span class="item-title">月度佣金统计通知</span>
                <p class="item-description">每月发送佣金收益汇总报告</p>
              </div>
              <el-switch 
                v-model="config.monthly_summary.enabled"
                active-color="#00ff88"
                @change="$emit('save')"
              />
            </div>
            <div class="item-content" v-if="config.monthly_summary.enabled">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="发送日期">
                    <el-select v-model="config.monthly_summary.send_on_day" placeholder="选择发送日期" class="w-full">
                      <el-option label="每月1号" :value="1" />
                      <el-option label="每月5号" :value="5" />
                      <el-option label="每月10号" :value="10" />
                      <el-option label="每月15号" :value="15" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="包含图表">
                    <el-switch 
                      v-model="monthlyIncludeChart" 
                      active-color="#00ff88"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="统计内容">
                <el-checkbox-group v-model="monthlyReportContent">
                  <el-checkbox label="total_commission">总佣金收入</el-checkbox>
                  <el-checkbox label="referral_count">推荐用户数</el-checkbox>
                  <el-checkbox label="order_count">订单数量</el-checkbox>
                  <el-checkbox label="performance_ranking">业绩排名</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>
          </div>

        </div>
      </el-collapse-item>

    </el-collapse>

    <!-- 代理等级配置 -->
    <div class="agent-levels-config mt-6">
      <el-card>
        <template #header>
          <span class="text-white">🏆 代理等级设置</span>
        </template>
        <div class="levels-grid">
          <div v-for="level in agentLevels" :key="level.name" class="level-card">
            <div class="level-header">
              <span class="level-icon">{{ level.icon }}</span>
              <span class="level-name">{{ level.name }}</span>
            </div>
            <div class="level-details">
              <div class="level-item">
                <span class="label">佣金率:</span>
                <span class="value">{{ level.commission }}%</span>
              </div>
              <div class="level-item">
                <span class="label">条件:</span>
                <span class="value">{{ level.requirement }}</span>
              </div>
              <div class="level-item">
                <span class="label">权益:</span>
                <span class="value">{{ level.benefits }}</span>
              </div>
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
import type { AgentNotificationConfig } from '@/types/notification'
import { computed, ref } from 'vue'

interface Props {
  modelValue: AgentNotificationConfig
  botId: string
}

interface Emits {
  (e: 'update:modelValue', value: AgentNotificationConfig): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const activeNames = ref(['application', 'commission', 'upgrade', 'reports'])

// 计算属性
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 配置选项
const commissionIncludeDetails = ref(true)
const monthlyIncludeChart = ref(true)
const upgradeDisplayOptions = ref(['show_progress', 'achievement_badge'])
const monthlyReportContent = ref(['total_commission', 'referral_count', 'order_count'])

// 代理等级配置
const agentLevels = ref([
  {
    name: '初级代理',
    icon: '🥉',
    commission: 3,
    requirement: '推荐5人',
    benefits: '基础佣金'
  },
  {
    name: '中级代理', 
    icon: '🥈',
    commission: 5,
    requirement: '推荐20人',
    benefits: '优先客服'
  },
  {
    name: '高级代理',
    icon: '🥇',
    commission: 8,
    requirement: '推荐50人',
    benefits: '专属经理'
  },
  {
    name: '钻石代理',
    icon: '💎',
    commission: 12,
    requirement: '推荐100人',
    benefits: '全部权益'
  }
])

// 统计信息
const enabledCount = computed(() => {
  const notifications = [
    config.value.application_submitted,
    config.value.application_approved,
    config.value.application_rejected,
    config.value.commission_earned,
    config.value.level_upgrade,
    config.value.withdrawal_completed,
    config.value.monthly_summary
  ]
  return notifications.filter(n => n.enabled).length
})

const totalCount = computed(() => 7)
</script>

<style scoped>
.agent-notification-panel {
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

.agent-levels-config :deep(.el-card) {
  @apply bg-gray-900 border-gray-700;
}

.agent-levels-config :deep(.el-card__header) {
  @apply bg-gray-800 border-gray-700;
}

.levels-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.level-card {
  @apply bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-green-500 transition-colors;
}

.level-header {
  @apply flex items-center gap-2 mb-3;
}

.level-icon {
  @apply text-2xl;
}

.level-name {
  @apply text-white font-semibold;
}

.level-details {
  @apply space-y-2;
}

.level-item {
  @apply flex justify-between text-sm;
}

.level-item .label {
  @apply text-gray-400;
}

.level-item .value {
  @apply text-white font-medium;
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
