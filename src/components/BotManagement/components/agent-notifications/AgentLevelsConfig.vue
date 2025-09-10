<template>
  <div class="agent-levels-config">
    <el-card>
      <template #header>
        <span class="text-gray-900 font-semibold">🏆 代理等级设置</span>
      </template>
      <div class="levels-grid">
        <div v-for="level in agentLevels" :key="level.name" class="level-card">
          <div class="level-header">
            <span class="level-icon">{{ level.icon }}</span>
            <span class="level-name">{{ level.name }}</span>
          </div>
          <div class="level-details">
            <div class="level-item">
              <span class="label">佣金率:</span>
              <span class="value">{{ level.commission }}%</span>
            </div>
            <div class="level-item">
              <span class="label">条件:</span>
              <span class="value">{{ level.requirement }}</span>
            </div>
            <div class="level-item">
              <span class="label">权益:</span>
              <span class="value">{{ level.benefits }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 代理等级配置
const agentLevels = ref([
  {
    name: '初级代理',
    icon: '🥉',
    commission: 3,
    requirement: '推荐5人',
    benefits: '基础佣金'
  },
  {
    name: '中级代理', 
    icon: '🥈',
    commission: 5,
    requirement: '推荐20人',
    benefits: '优先客服'
  },
  {
    name: '高级代理',
    icon: '🥇',
    commission: 8,
    requirement: '推荐50人',
    benefits: '专属经理'
  },
  {
    name: '钻石代理',
    icon: '💎',
    commission: 12,
    requirement: '推荐100人',
    benefits: '全部权益'
  }
])
</script>

<style scoped>
.agent-levels-config :deep(.el-card) {
  @apply bg-white border-gray-200 shadow-sm;
}

.agent-levels-config :deep(.el-card__header) {
  @apply bg-gray-50 border-gray-200;
}

.levels-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.level-card {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all;
}

.level-header {
  @apply flex items-center gap-2 mb-3;
}

.level-icon {
  @apply text-2xl;
}

.level-name {
  @apply text-gray-900 font-semibold;
}

.level-details {
  @apply space-y-2;
}

.level-item {
  @apply flex justify-between text-sm;
}

.level-item .label {
  @apply text-gray-400;
}

.level-item .value {
  @apply text-gray-900 font-medium;
}
</style>
