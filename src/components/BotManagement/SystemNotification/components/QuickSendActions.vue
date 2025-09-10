<template>
  <div class="quick-send-section mt-6">
    <el-card>
      <template #header>
        <span class="text-gray-900">🚀 快速发送系统通知</span>
      </template>
      <div class="quick-send-grid">
        <el-button 
          type="warning" 
          size="large"
          @click="$emit('send-maintenance')"
          class="quick-send-btn"
        >
          🔧 发送维护通知
        </el-button>
        
        <el-button 
          type="danger" 
          size="large"
          @click="$emit('send-alert')"
          class="quick-send-btn"
        >
          🚨 发送紧急通知
        </el-button>
        
        <el-button 
          type="success" 
          size="large"
          @click="$emit('send-announcement')"
          class="quick-send-btn"
        >
          📢 发送重要公告
        </el-button>
        
        <el-button 
          type="info" 
          size="large"
          @click="$emit('send-report')"
          class="quick-send-btn"
        >
          📊 发送统计报告
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
interface Emits {
  (e: 'send-maintenance'): void
  (e: 'send-alert'): void
  (e: 'send-announcement'): void
  (e: 'send-report'): void
}

defineEmits<Emits>()
</script>

<style scoped>
.quick-send-section :deep(.el-card) {
  @apply bg-white border-gray-200;
}

.quick-send-section :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.quick-send-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.quick-send-btn {
  @apply w-full h-16 text-lg font-semibold;
}
</style>
