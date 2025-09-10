<template>
  <el-card class="form-card mt-4">
    <template #header>
      <span class="text-gray-900">🎯 发送配置</span>
    </template>

    <el-form label-width="120px">
      
      <el-form-item label="目标用户">
        <el-radio-group :model-value="settings.target_users" @update:model-value="updateSettings('target_users', $event)">
          <el-radio label="all">所有用户</el-radio>
          <el-radio label="active_only">仅活跃用户</el-radio>
          <el-radio label="agents_only">仅代理用户</el-radio>
          <el-radio label="vip_only">仅VIP用户</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="发送策略">
        <el-checkbox-group :model-value="settings.send_options" @update:model-value="updateSettings('send_options', $event)">
          <el-checkbox label="send_immediately">立即发送</el-checkbox>
          <el-checkbox label="optimal_time">智能时间发送</el-checkbox>
          <el-checkbox label="pin_message">置顶消息</el-checkbox>
          <el-checkbox label="disable_preview">禁用预览</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item v-if="!settings.send_options?.includes('send_immediately')" label="定时发送">
        <el-date-picker
          :model-value="settings.scheduled_at"
          @update:model-value="updateSettings('scheduled_at', $event)"
          type="datetime"
          placeholder="选择发送时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </el-form-item>

    </el-form>
  </el-card>
</template>

<script setup lang="ts">
interface NotificationSettings {
  target_users: string
  send_options: string[]
  scheduled_at: string | null
}

interface Props {
  settings: NotificationSettings
}

interface Emits {
  (e: 'update:settings', value: NotificationSettings): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateSettings = (key: keyof NotificationSettings, value: any) => {
  emit('update:settings', {
    ...props.settings,
    [key]: value
  })
}
</script>

<style scoped>
.form-card {
  @apply bg-white border-gray-200;
}

.form-card :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.form-card :deep(.el-form-item__label) {
  @apply text-gray-300;
}

.form-card :deep(.el-radio__label) {
  @apply text-gray-300;
}

.form-card :deep(.el-radio__input.is-checked .el-radio__inner) {
  @apply bg-green-600 border-green-600;
}

.form-card :deep(.el-checkbox__label) {
  @apply text-gray-300;
}

.form-card :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}
</style>
