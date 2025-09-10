<template>
  <div class="marketing-analytics mt-6">
    <el-card>
      <template #header>
        <span class="text-gray-900">📊 营销效果分析</span>
      </template>
      <div class="analytics-grid">
        <div class="analytics-item">
          <div class="analytics-header">
            <span class="analytics-icon">📈</span>
            <span class="analytics-title">转化率</span>
          </div>
          <div class="analytics-value">15.8%</div>
          <div class="analytics-change positive">+2.3%</div>
        </div>
        
        <div class="analytics-item">
          <div class="analytics-header">
            <span class="analytics-icon">👥</span>
            <span class="analytics-title">召回成功</span>
          </div>
          <div class="analytics-value">342</div>
          <div class="analytics-change positive">+56</div>
        </div>
        
        <div class="analytics-item">
          <div class="analytics-header">
            <span class="analytics-icon">⭐</span>
            <span class="analytics-title">满意度</span>
          </div>
          <div class="analytics-value">4.6/5</div>
          <div class="analytics-change positive">+0.2</div>
        </div>
        
        <div class="analytics-item">
          <div class="analytics-header">
            <span class="analytics-icon">🎁</span>
            <span class="analytics-title">生日活跃</span>
          </div>
          <div class="analytics-value">89%</div>
          <div class="analytics-change positive">+5%</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 静态组件，无需参数
</script>

<style scoped>
.marketing-analytics :deep(.el-card) {
  @apply bg-white border-gray-200;
}

.marketing-analytics :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.analytics-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.analytics-item {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200 text-center;
}

.analytics-header {
  @apply flex items-center justify-center gap-2 mb-2;
}

.analytics-icon {
  @apply text-xl;
}

.analytics-title {
  @apply text-gray-300 text-sm;
}

.analytics-value {
  @apply text-2xl font-bold text-gray-900 mb-1;
}

.analytics-change {
  @apply text-sm font-medium;
}

.analytics-change.positive {
  @apply text-green-400;
}

.analytics-change.negative {
  @apply text-red-400;
}
</style>
