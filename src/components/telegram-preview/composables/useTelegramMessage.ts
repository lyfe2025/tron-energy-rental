/**
 * Telegram消息 Composable
 * 从TelegramPreview.vue中分离出的消息管理逻辑
 */
import { computed, onMounted, ref, watch } from 'vue'
import type { MessageProps, OrderConfirmationProps } from '../utils/messageFormatter'
import { MessageFormatter } from '../utils/messageFormatter'
import { TemplateRenderer } from '../utils/templateRenderer'
import { useClipboard } from './useClipboard'
import { useOrderFlow } from './useOrderFlow'

export function useTelegramMessage(props: MessageProps & OrderConfirmationProps) {
  // 复制和订单流程功能
  const { copyStatus, copyPaymentAddress, copyAmount } = useClipboard()
  const { currentPaymentMode, switchPaymentMode, cancelOrder } = useOrderFlow()
  
  // 状态管理
  const showReply = ref(false)
  const showOrderReply = ref(false)
  const userInputAddress = ref('T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb')
  const currentTime = ref('')

  // 计算属性
  const messageContent = computed(() => {
    return MessageFormatter.formatMainMessage(props)
  })

  const formattedOrderConfirmation = computed(() => {
    if (!props.orderConfirmationTemplate && !props.orderConfirmationTemplateTrx) {
      return '未配置订单确认模板'
    }
    
    return TemplateRenderer.formatOrderConfirmationHTML({
      currentUnitPrice: props.currentUnitPrice,
      currentTotalAmount: props.currentTotalAmount,
      currentTransactionCount: props.currentTransactionCount,
      paymentAddress: props.paymentAddress,
      orderExpireMinutes: props.orderExpireMinutes,
      orderConfirmationTemplate: props.orderConfirmationTemplate,
      orderConfirmationTemplateTrx: props.orderConfirmationTemplateTrx,
      userInputAddress: userInputAddress.value
    }, currentPaymentMode.value)
  })

  // 方法
  const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const simulateButtonClick = (button: any) => {
    console.log(`模拟点击按钮: ${button.count}笔`)
    
    // 显示用户输入地址（延迟显示以模拟真实交互）
    setTimeout(() => {
      showReply.value = true
    }, 800)
    
    // 显示订单确认（进一步延迟）
    setTimeout(() => {
      showOrderReply.value = true
    }, 2200)
  }

  // 全局函数：用于处理可点击元素的复制功能
  const setupGlobalFunctions = () => {
    // 复制支付地址的全局函数
    (window as any).copyTransactionPackageAddress = (address: string) => {
      copyPaymentAddress(address)
    }
    
    // 复制金额的全局函数
    (window as any).copyTransactionPackageAmount = (amount: string) => {
      copyAmount(amount)
    }
  }

  // 监听器
  watch([currentPaymentMode], () => {
    console.log('支付方式已切换到:', currentPaymentMode.value)
  })

  // 生命周期
  onMounted(() => {
    updateTime()
    setupGlobalFunctions()
    
    // 每分钟更新时间
    const timer = setInterval(updateTime, 60000)
    
    // 清理定时器
    return () => clearInterval(timer)
  })

  return {
    // 状态
    showReply,
    showOrderReply,
    userInputAddress,
    currentTime,
    currentPaymentMode,
    copyStatus,
    
    // 计算属性
    messageContent,
    formattedOrderConfirmation,
    
    // 方法
    simulateButtonClick,
    switchPaymentMode,
    cancelOrder,
    updateTime
  }
}
