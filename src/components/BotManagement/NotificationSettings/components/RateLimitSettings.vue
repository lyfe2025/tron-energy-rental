<template>
  <!-- 频率限制设置 -->
  <el-card class="mb-6">
    <template #header>
      <div class="card-header">
        <span class="text-gray-900">🚦 频率限制设置</span>
      </div>
    </template>
    
    <el-form :model="settings" label-width="160px">
      
      <el-form-item label="API限制">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">每秒消息数</div>
              <el-input-number 
                v-model="settings.messagesPerSecond"
                :min="1"
                :max="30"
                class="w-full"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">每分钟消息数</div>
              <el-input-number 
                v-model="settings.messagesPerMinute"
                :min="1"
                :max="1800"
                class="w-full"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">批量发送间隔</div>
              <el-input-number 
                v-model="settings.batchDelay"
                :min="100"
                :max="10000"
                :step="100"
                class="w-full"
              />
              <div class="text-xs text-gray-600 mt-1">毫秒</div>
            </div>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item label="用户限制">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">用户每小时接收限制</div>
              <el-input-number 
                v-model="settings.userHourlyLimit"
                :min="1"
                :max="100"
                class="w-full"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">用户每天接收限制</div>
              <el-input-number 
                v-model="settings.userDailyLimit"
                :min="1"
                :max="500"
                class="w-full"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">重复消息间隔</div>
              <el-input-number 
                v-model="settings.duplicateMessageInterval"
                :min="5"
                :max="1440"
                class="w-full"
              />
              <div class="text-xs text-gray-600 mt-1">分钟</div>
            </div>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item label="重试设置">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">最大重试次数</div>
              <el-input-number 
                v-model="settings.maxRetries"
                :min="0"
                :max="10"
                class="w-full"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">重试间隔</div>
              <el-input-number 
                v-model="settings.retryDelay"
                :min="1000"
                :max="60000"
                :step="1000"
                class="w-full"
              />
              <div class="text-xs text-gray-600 mt-1">毫秒</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">失败处理</div>
              <el-select v-model="settings.failureAction" class="w-full">
                <el-option label="忽略" value="ignore" />
                <el-option label="延迟重试" value="retry" />
                <el-option label="记录错误" value="log" />
                <el-option label="通知管理员" value="notify" />
              </el-select>
            </div>
          </el-col>
        </el-row>
      </el-form-item>

    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { RateLimitSettings } from '../types/settings.types';

interface Props {
  settings: RateLimitSettings
}

defineProps<Props>()
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200;
}

:deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.card-header {
  @apply flex items-center justify-between;
}

:deep(.el-form-item__label) {
  @apply text-gray-700;
}

:deep(.el-input-number .el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
}

:deep(.el-select .el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
}

.setting-item {
  @apply space-y-2;
}

.setting-item .label {
  @apply text-sm text-gray-700 font-medium;
}
</style>
