<template>
  <!-- 用户群体设置 -->
  <el-card class="mb-6">
    <template #header>
      <div class="card-header">
        <span class="text-gray-900">👥 用户群体设置</span>
      </div>
    </template>
    
    <el-form :model="settings" label-width="160px">
      
      <el-form-item label="默认接收群体">
        <el-checkbox-group v-model="settings.defaultAudience">
          <el-checkbox label="allUsers">所有用户</el-checkbox>
          <el-checkbox label="activeUsers">活跃用户</el-checkbox>
          <el-checkbox label="agents">代理用户</el-checkbox>
          <el-checkbox label="vipUsers">VIP用户</el-checkbox>
          <el-checkbox label="newUsers">新用户</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="排除群体">
        <el-checkbox-group v-model="settings.excludeGroups">
          <el-checkbox label="inactiveUsers">非活跃用户</el-checkbox>
          <el-checkbox label="blockedUsers">已屏蔽用户</el-checkbox>
          <el-checkbox label="optOutUsers">取消订阅用户</el-checkbox>
          <el-checkbox label="testUsers">测试用户</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="智能推送">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-switch 
              v-model="settings.smartDelivery"
              active-text="启用"
              inactive-text="禁用"
            />
            <div class="text-sm text-gray-600 mt-1">
              根据用户活跃时间智能推送
            </div>
          </el-col>
          <el-col :span="8">
            <el-switch 
              v-model="settings.personalizedContent"
              active-text="启用"
              inactive-text="禁用"
            />
            <div class="text-sm text-gray-600 mt-1">
              根据用户偏好个性化内容
            </div>
          </el-col>
          <el-col :span="8">
            <el-switch 
              v-model="settings.adaptiveScheduling"
              active-text="启用"
              inactive-text="禁用"
            />
            <div class="text-sm text-gray-600 mt-1">
              自适应发送时间调整
            </div>
          </el-col>
        </el-row>
      </el-form-item>

    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { AudienceSettings } from '../types/settings.types';

interface Props {
  settings: AudienceSettings
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

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  @apply bg-green-600 border-green-600;
}

:deep(.el-switch__core) {
  @apply bg-gray-600;
}

:deep(.el-switch.is-checked .el-switch__core) {
  @apply bg-green-600;
}
</style>
