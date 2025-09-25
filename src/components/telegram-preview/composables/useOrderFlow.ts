/**
 * 订单流程 Composable
 * 从TelegramPreview.vue中分离出的订单流程管理逻辑
 */
import { ref } from 'vue'

export function useOrderFlow() {
  // 支付方式状态管理
  const currentPaymentMode = ref<'USDT' | 'TRX'>('USDT')

  /**
   * 切换支付方式
   */
  const switchPaymentMode = () => {
    currentPaymentMode.value = currentPaymentMode.value === 'USDT' ? 'TRX' : 'USDT'
    console.log('切换支付方式到:', currentPaymentMode.value)
  }

  /**
   * 取消订单
   */
  const cancelOrder = () => {
    console.log('取消订单')
    // 可以在这里添加取消订单的逻辑
  }

  /**
   * 重置支付方式
   */
  const resetPaymentMode = () => {
    currentPaymentMode.value = 'USDT'
  }

  return {
    currentPaymentMode,
    switchPaymentMode,
    cancelOrder,
    resetPaymentMode
  }
}
