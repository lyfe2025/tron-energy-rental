<template>
  <!-- 全局设置 -->
  <el-card class="mb-6">
    <template #header>
      <div class="card-header">
        <span class="text-gray-900 font-semibold flex items-center gap-2">
          <span class="text-xl">🌐</span>
          全局通知设置
        </span>
      </div>
    </template>
    
    <el-form :model="settings" label-width="160px">
      
      <el-form-item label="通知功能状态">
        <el-row>
          <el-col :span="8">
            <el-switch 
              v-model="settings.enabled"
              active-text="启用"
              inactive-text="禁用"
              @change="$emit('global-toggle', $event)"
            />
            <div class="text-sm text-gray-400 mt-1">
              主控开关，关闭后所有通知将被禁用
            </div>
          </el-col>
          <el-col :span="8">
            <el-switch 
              v-model="settings.testMode"
              active-text="测试模式"
              inactive-text="正常模式"
            />
            <div class="text-sm text-gray-400 mt-1">
              测试模式下只发送给管理员
            </div>
          </el-col>
          <el-col :span="8">
            <el-switch 
              v-model="settings.debugMode"
              active-text="调试模式"
              inactive-text="正常模式"
            />
            <div class="text-sm text-gray-400 mt-1">
              记录详细的发送日志
            </div>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item label="默认语言">
        <el-select v-model="settings.defaultLanguage" class="w-60">
          <el-option label="简体中文" value="zh-CN" />
          <el-option label="繁體中文" value="zh-TW" />
          <el-option label="English" value="en" />
          <el-option label="日本語" value="ja" />
          <el-option label="한국어" value="ko" />
        </el-select>
        <div class="text-sm text-gray-400 mt-1">
          用户未设置语言时的默认语言
        </div>
      </el-form-item>

      <el-form-item label="消息格式">
        <el-radio-group v-model="settings.defaultParseMode">
          <el-radio label="Markdown">Markdown</el-radio>
          <el-radio label="HTML">HTML</el-radio>
          <el-radio label="Text">纯文本</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="发送延迟">
        <el-input-number 
          v-model="settings.sendDelay"
          :min="0"
          :max="5000"
          :step="100"
          class="w-40"
        />
        <span class="ml-2 text-gray-400">毫秒</span>
        <div class="text-sm text-gray-400 mt-1">
          防止触发Telegram API限制
        </div>
      </el-form-item>

    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { GlobalSettings } from '../types/settings.types';

interface Props {
  settings: GlobalSettings
}

interface Emits {
  (e: 'global-toggle', enabled: boolean): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
:deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

:deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.card-header {
  @apply flex items-center justify-between;
}

:deep(.el-form-item__label) {
  @apply text-gray-700 font-medium;
}

:deep(.el-input__inner),
:deep(.el-select .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
}

:deep(.el-input-number .el-input__inner) {
  @apply bg-white border-gray-300 text-gray-900 rounded-lg focus:border-blue-500;
}

:deep(.el-switch__core) {
  @apply bg-gray-300;
}

:deep(.el-switch.is-checked .el-switch__core) {
  @apply bg-blue-600;
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  @apply bg-blue-600 border-blue-600;
}

/* 文字颜色优化 */
.text-gray-400 {
  @apply text-gray-600;
}

/* 按钮样式 */
:deep(.el-button) {
  @apply rounded-lg font-medium transition-all duration-200;
}

:deep(.el-button--primary) {
  @apply bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-sm hover:shadow-md;
}
</style>
