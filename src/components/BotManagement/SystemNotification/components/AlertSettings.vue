<template>
  <el-collapse-item title="🚨 异常通知" name="alerts">
    <div class="notification-group">
      
      <!-- 系统异常通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">系统异常通知</span>
            <p class="item-description">关键服务故障时自动通知管理员</p>
            <div class="auto-trigger-badge">🤖 自动触发</div>
          </div>
          <el-switch 
            v-model="config.system_alert.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.system_alert.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="仅通知管理员">
                <el-switch 
                  v-model="config.system_alert.admin_only" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="异常级别">
                <el-select v-model="systemAlertLevel" placeholder="选择级别" class="w-full">
                  <el-option label="⚠️ 警告" value="warning" />
                  <el-option label="🚨 严重" value="critical" />
                  <el-option label="💥 致命" value="fatal" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="监控范围">
            <el-checkbox-group v-model="systemAlertScopes">
              <el-checkbox label="api_server">API服务</el-checkbox>
              <el-checkbox label="database">数据库</el-checkbox>
              <el-checkbox label="redis">Redis缓存</el-checkbox>
              <el-checkbox label="telegram_bot">机器人服务</el-checkbox>
              <el-checkbox label="payment_gateway">支付网关</el-checkbox>
              <el-checkbox label="blockchain_node">区块链节点</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </div>
      </div>

      <el-divider />

      <!-- 安全警告通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">安全警告通知</span>
            <p class="item-description">异常登录、大额交易等安全事件</p>
            <div class="auto-trigger-badge">🤖 自动触发</div>
          </div>
          <el-switch 
            v-model="config.security_warning.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.security_warning.enabled">
          <el-form-item label="安全事件类型">
            <el-checkbox-group v-model="securityEventTypes">
              <el-checkbox label="unusual_login">异常登录</el-checkbox>
              <el-checkbox label="large_transaction">大额交易</el-checkbox>
              <el-checkbox label="multiple_failed_attempts">多次失败尝试</el-checkbox>
              <el-checkbox label="suspicious_activity">可疑活动</el-checkbox>
              <el-checkbox label="account_compromise">账户风险</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="大额交易阈值">
                <el-input-number 
                  v-model="largeTransactionThreshold"
                  :min="100" :max="10000" :step="100"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">TRX</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="通知用户本人">
                <el-switch 
                  v-model="securityNotifyUser" 
                  active-color="#00ff88"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>

    </div>
  </el-collapse-item>
</template>

<script setup lang="ts">
import type { SystemNotificationConfig } from '@/types/notification';
import { ref } from 'vue';

interface Props {
  config: SystemNotificationConfig
}

interface Emits {
  (e: 'save'): void
}

defineProps<Props>()
defineEmits<Emits>()

// 配置选项
const systemAlertLevel = ref('critical')
const largeTransactionThreshold = ref(1000)
const securityNotifyUser = ref(true)

// 监控范围和事件类型配置
const systemAlertScopes = ref(['api_server', 'database', 'telegram_bot', 'payment_gateway'])
const securityEventTypes = ref(['unusual_login', 'large_transaction', 'suspicious_activity'])
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

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

:deep(.el-select .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
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
</style>
