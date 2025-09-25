<template>
  <!-- 模拟用户输入地址 -->
  <div v-if="showReply" class="flex gap-2 mt-3 animate-fade-in-delayed">
    <div class="w-6"></div>
    <div class="flex-1 flex justify-end">
      <div class="bg-blue-500 text-white rounded-lg p-2 max-w-xs">
        <div class="text-xs">{{ userInputAddress }}</div>
      </div>
    </div>
  </div>

  <!-- 处理中提示 -->
  <div v-if="showReply && userInputAddress && !showOrderReply" class="flex gap-2 mt-2">
    <div class="w-6"></div>
    <div class="flex-1">
      <div class="text-xs text-orange-600 italic">
        ⚡ 系统正在根据用户地址生成个性化订单...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  showReply: boolean
  showOrderReply: boolean
  userInputAddress?: string
}

defineProps<Props>()
</script>

<style scoped>
@keyframes fade-in-delayed {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  60% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-delayed {
  animation: fade-in-delayed 2s ease-out;
}

/* 让用户消息从右侧滑入 */
.animate-fade-in-delayed .bg-blue-500 {
  animation: slide-in-right 0.4s ease-out 1.5s both;
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
