<template>
  <div class="notification-type-selector mb-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">选择通知类型</h3>
    <el-radio-group 
      :model-value="selectedType" 
      @update:model-value="$emit('update:type', $event)"
      size="large" 
      class="type-selector"
    >
      <el-radio-button value="maintenance_notice">
        🔧 系统维护通知
      </el-radio-button>
      <el-radio-button value="important_announcement">
        📢 重要公告
      </el-radio-button>
      <el-radio-button value="security_alert">
        ⚠️ 安全警告
      </el-radio-button>
      <el-radio-button value="holiday_greeting">
        🎉 节假日祝福
      </el-radio-button>
    </el-radio-group>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectedType: string
}

interface Emits {
  (e: 'update:type', value: string): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.type-selector :deep(.el-radio-button__inner) {
  @apply bg-gray-800 border-gray-600 text-gray-300;
}

.type-selector :deep(.el-radio-button__input:checked + .el-radio-button__inner) {
  @apply bg-green-600 border-green-600 text-gray-900;
}
</style>
