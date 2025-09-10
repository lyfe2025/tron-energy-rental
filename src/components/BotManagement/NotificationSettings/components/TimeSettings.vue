<template>
  <!-- 发送时间设置 -->
  <el-card class="mb-6">
    <template #header>
      <div class="card-header">
        <span class="text-gray-900">⏰ 发送时间设置</span>
      </div>
    </template>
    
    <el-form :model="settings" label-width="160px">
      
      <el-form-item label="允许发送时间">
        <el-switch 
          v-model="settings.enableTimeRestriction"
          active-text="启用时间限制"
          inactive-text="全天发送"
        />
      </el-form-item>

      <el-form-item v-if="settings.enableTimeRestriction" label="发送时间段">
        <el-time-picker
          v-model="settings.allowedTimeRange"
          is-range
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          format="HH:mm"
          value-format="HH:mm"
        />
        <div class="text-sm text-gray-600 mt-1">
          超出此时间段的通知将被延迟发送
        </div>
      </el-form-item>

      <el-form-item label="时区设置">
        <el-select v-model="settings.timezone" class="w-60">
          <el-option label="北京时间 (UTC+8)" value="Asia/Shanghai" />
          <el-option label="东京时间 (UTC+9)" value="Asia/Tokyo" />
          <el-option label="纽约时间 (UTC-5)" value="America/New_York" />
          <el-option label="伦敦时间 (UTC+0)" value="Europe/London" />
          <el-option label="UTC 时间" value="UTC" />
        </el-select>
      </el-form-item>

      <el-form-item label="节假日处理">
        <el-checkbox-group v-model="settings.holidayOptions">
          <el-checkbox label="skipHolidays">跳过节假日</el-checkbox>
          <el-checkbox label="skipWeekends">跳过周末</el-checkbox>
          <el-checkbox label="delayDuringHolidays">节假日延迟发送</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { TimeSettings } from '../types/settings.types';

interface Props {
  settings: TimeSettings
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

:deep(.el-select .el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
}

:deep(.el-switch__core) {
  @apply bg-gray-600;
}

:deep(.el-switch.is-checked .el-switch__core) {
  @apply bg-green-600;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}

:deep(.el-time-picker__editor) {
  @apply bg-gray-50 border-gray-600;
}

:deep(.el-time-picker__editor input) {
  @apply bg-gray-50 text-gray-900;
}
</style>
