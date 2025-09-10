<template>
  <el-collapse-item title="🔧 维护通知" name="maintenance">
    <div class="notification-group">
      
      <!-- 系统维护通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">系统维护通知</span>
            <p class="item-description">计划维护前提前通知所有用户</p>
            <div class="manual-trigger-badge">🔧 管理员手动触发</div>
          </div>
          <el-switch 
            v-model="config.maintenance_notice.enabled" 
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.maintenance_notice.enabled">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="提前通知时间">
                <el-input-number 
                  v-model="config.maintenance_notice.advance_hours"
                  :min="1" :max="72" :step="1"
                  controls-position="right"
                  class="w-full"
                />
                <span class="ml-2 text-gray-400">小时</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="通知级别">
                <el-select v-model="maintenanceNoticeLevel" placeholder="选择级别" class="w-full">
                  <el-option label="📅 普通维护" value="normal" />
                  <el-option label="⚠️ 重要维护" value="important" />
                  <el-option label="🚨 紧急维护" value="urgent" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="通知阶段">
            <el-checkbox-group v-model="maintenanceStages">
              <el-checkbox label="advance_24h">提前24小时</el-checkbox>
              <el-checkbox label="advance_1h">提前1小时</el-checkbox>
              <el-checkbox label="start_notification">维护开始</el-checkbox>
              <el-checkbox label="completion_notification">维护完成</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-alert
            title="维护通知说明"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              系统维护通知需要管理员在维护前手动发送，支持分阶段通知
            </template>
          </el-alert>
        </div>
      </div>

      <el-divider />

      <!-- 维护开始通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">维护开始通知</span>
            <p class="item-description">维护开始时立即通知用户</p>
            <div class="manual-trigger-badge">🔧 管理员手动触发</div>
          </div>
          <el-switch 
            v-model="config.maintenance_start.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.maintenance_start.enabled">
          <el-alert
            title="维护开始提醒"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              通知用户系统进入维护状态，预计恢复时间等信息
            </template>
          </el-alert>
        </div>
      </div>

      <el-divider />

      <!-- 维护完成通知 -->
      <div class="notification-item">
        <div class="item-header">
          <div class="item-info">
            <span class="item-title">维护完成通知</span>
            <p class="item-description">维护结束后通知用户系统恢复</p>
            <div class="manual-trigger-badge">🔧 管理员手动触发</div>
          </div>
          <el-switch 
            v-model="config.maintenance_complete.enabled"
            active-color="#00ff88"
            @change="$emit('save')"
          />
        </div>
        <div class="item-content" v-if="config.maintenance_complete.enabled">
          <el-form-item label="包含更新内容">
            <el-switch 
              v-model="maintenanceIncludeUpdates" 
              active-color="#00ff88"
            />
            <div class="mt-2 text-sm text-gray-400">
              在完成通知中说明本次维护的更新内容
            </div>
          </el-form-item>
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
const maintenanceNoticeLevel = ref('important')
const maintenanceIncludeUpdates = ref(true)

// 通知阶段配置
const maintenanceStages = ref(['advance_24h', 'start_notification', 'completion_notification'])
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

:deep(.el-alert) {
  @apply bg-gray-800 border-gray-600;
}

:deep(.el-alert__title),
:deep(.el-alert__description) {
  @apply text-gray-300;
}
</style>
