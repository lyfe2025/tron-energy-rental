<template>
  <!-- 机器人订单确认回复 -->
  <div class="flex gap-2 mt-3 animate-fade-in-order">
    <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
      <span class="text-white text-xs">🤖</span>
    </div>
    <div class="flex-1">
      <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
        <div class="text-xs whitespace-pre-line" v-html="formattedOrderConfirmation"></div>
      </div>
      
      <!-- 支付方式切换按钮 -->
      <div class="mt-2 max-w-xs">
        <div class="flex gap-1">
          <!-- 支付方式切换按钮 -->
          <button
            @click="switchPaymentMode"
            class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 py-1.5 rounded text-xs font-medium hover:bg-yellow-100 transition-colors"
          >
            {{ currentPaymentMode === 'USDT' ? '切换到TRX支付' : '切换到USDT支付' }}
          </button>
          
          <!-- 取消订单按钮 -->
          <button
            @click="cancelOrder"
            class="bg-red-50 border border-red-200 text-red-800 px-2 py-1.5 rounded text-xs font-medium hover:bg-red-100 transition-colors"
          >
            取消订单
          </button>
        </div>
      </div>
      
      <div class="text-xs text-gray-400 mt-1">{{ currentTime }}</div>
    </div>
  </div>

  <!-- 复制状态提示 -->
  <div v-if="copyStatus" class="mt-2 text-center">
    <span class="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
      {{ copyStatus }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  formattedOrderConfirmation: string
  currentPaymentMode: 'USDT' | 'TRX'
  currentTime: string
  copyStatus: string
  switchPaymentMode: () => void
  cancelOrder: () => void
}

defineProps<Props>()
</script>

<style scoped>
/* 订单确认的动画 */
@keyframes fade-in-order {
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

.animate-fade-in-order {
  animation: fade-in-order 2.5s ease-out 1.8s both;
}
</style>
