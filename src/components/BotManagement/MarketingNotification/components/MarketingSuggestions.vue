<template>
  <div class="marketing-suggestions mt-6">
    <el-card>
      <template #header>
        <span class="text-gray-900 font-semibold">💡 营销策略建议</span>
      </template>
      <div class="suggestions-list">
        <div class="suggestion-item">
          <div class="suggestion-icon">🎯</div>
          <div class="suggestion-content">
            <h4 class="suggestion-title">精准投放</h4>
            <p class="suggestion-desc">基于用户行为数据，向高价值用户推送个性化内容</p>
          </div>
          <el-button size="small" type="primary">应用</el-button>
        </div>
        
        <div class="suggestion-item">
          <div class="suggestion-icon">⏰</div>
          <div class="suggestion-content">
            <h4 class="suggestion-title">最佳时机</h4>
            <p class="suggestion-desc">在用户活跃度最高的时间段（晚上8-10点）发送营销消息</p>
          </div>
          <el-button size="small" type="primary">设置</el-button>
        </div>
        
        <div class="suggestion-item">
          <div class="suggestion-icon">🔄</div>
          <div class="suggestion-content">
            <h4 class="suggestion-title">A/B测试</h4>
            <p class="suggestion-desc">对不同的消息内容和推送策略进行对比测试</p>
          </div>
          <el-button size="small" type="primary">开始</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 静态组件，无需参数
</script>

<style scoped>
.marketing-suggestions :deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

.marketing-suggestions :deep(.el-card__header) {
  @apply bg-gray-800 border-gray-700;
}

.suggestions-list {
  @apply space-y-4;
}

.suggestion-item {
  @apply flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700;
}

.suggestion-icon {
  @apply text-3xl;
}

.suggestion-content {
  @apply flex-1;
}

.suggestion-title {
  @apply text-gray-900 font-semibold mb-1;
}

.suggestion-desc {
  @apply text-gray-400 text-sm;
}
</style>
