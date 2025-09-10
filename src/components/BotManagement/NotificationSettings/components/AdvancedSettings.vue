<template>
  <!-- 高级设置 -->
  <el-card class="mb-6">
    <template #header>
      <div class="card-header">
        <span class="text-gray-900">⚙️ 高级设置</span>
      </div>
    </template>
    
    <el-form :model="settings" label-width="160px">
      
      <el-form-item label="Webhook设置">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-input 
              v-model="settings.webhookUrl"
              placeholder="输入Webhook URL"
            />
          </el-col>
          <el-col :span="8">
            <el-input 
              v-model="settings.webhookSecret"
              placeholder="Webhook密钥"
              type="password"
              show-password
            />
          </el-col>
          <el-col :span="4">
            <el-button @click="$emit('test-webhook')" :loading="testing">测试</el-button>
          </el-col>
        </el-row>
        <div class="text-sm text-gray-600 mt-1">
          通知发送状态将通过Webhook回调
        </div>
      </el-form-item>

      <el-form-item label="数据保留">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">日志保留天数</div>
              <el-input-number 
                v-model="settings.logRetentionDays"
                :min="1"
                :max="365"
                class="w-full"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">统计数据保留天数</div>
              <el-input-number 
                v-model="settings.analyticsRetentionDays"
                :min="30"
                :max="1095"
                class="w-full"
              />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="setting-item">
              <div class="label">失败消息保留天数</div>
              <el-input-number 
                v-model="settings.failedMessageRetentionDays"
                :min="7"
                :max="90"
                class="w-full"
              />
            </div>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item label="通知优先级">
        <el-table :data="priorityConfig" style="width: 100%">
          <el-table-column prop="type" label="通知类型" width="200" />
          <el-table-column label="优先级" width="150">
            <template #default="scope">
              <el-select v-model="scope.row.priority" size="small">
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="队列权重" width="150">
            <template #default="scope">
              <el-input-number 
                v-model="scope.row.weight"
                :min="1"
                :max="10"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="最大延迟" width="150">
            <template #default="scope">
              <el-input-number 
                v-model="scope.row.maxDelay"
                :min="0"
                :max="24"
                size="small"
              />
              <span class="text-xs text-gray-600 ml-1">小时</span>
            </template>
          </el-table-column>
        </el-table>
      </el-form-item>

      <el-form-item label="故障转移">
        <el-row>
          <el-col :span="8">
            <el-switch 
              v-model="settings.enableFailover"
              active-text="启用故障转移"
              inactive-text="禁用故障转移"
            />
          </el-col>
          <el-col :span="16">
            <el-input 
              v-model="settings.fallbackBotToken"
              placeholder="备用机器人Token"
              :disabled="!settings.enableFailover"
            />
          </el-col>
        </el-row>
        <div class="text-sm text-gray-600 mt-1">
          主机器人不可用时自动切换到备用机器人
        </div>
      </el-form-item>

    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { AdvancedSettings, PriorityConfigItem } from '../types/settings.types'

interface Props {
  settings: AdvancedSettings
  priorityConfig: PriorityConfigItem[]
  testing?: boolean
}

interface Emits {
  (e: 'test-webhook'): void
}

withDefaults(defineProps<Props>(), {
  testing: false
})

defineEmits<Emits>()
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

:deep(.el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
}

:deep(.el-input-number .el-input__inner) {
  @apply bg-gray-50 border-gray-600 text-gray-900;
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

.setting-item {
  @apply space-y-2;
}

.setting-item .label {
  @apply text-sm text-gray-700 font-medium;
}

:deep(.el-table) {
  @apply bg-white;
}

:deep(.el-table th) {
  @apply bg-gray-50 border-gray-200 text-gray-700;
}

:deep(.el-table td) {
  @apply bg-white border-gray-200;
}

:deep(.el-table tr:hover > td) {
  @apply bg-gray-50;
}
</style>
