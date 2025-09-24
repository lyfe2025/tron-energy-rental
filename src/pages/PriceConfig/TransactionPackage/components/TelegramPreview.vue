<template>
  <div class="md:w-1/3">
    <!-- Telegram风格预览 -->
    <div class="bg-white rounded-lg border shadow-sm max-w-sm sticky top-4 min-h-[600px]">
      <!-- 机器人头部 -->
      <div class="bg-blue-500 text-white px-4 py-3 rounded-t-lg">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <span class="text-xs">🤖</span>
          </div>
          <div>
            <div class="text-sm font-medium">TRON能量租赁机器人</div>
            <div class="text-xs text-blue-100">在线</div>
          </div>
        </div>
      </div>
      
      <!-- 消息内容 -->
      <div class="p-4 space-y-3">
        <!-- 机器人消息 -->
        <div class="flex gap-2">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs">🤖</span>
          </div>
          <div class="flex-1">
            <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
              <!-- 图片显示（如果启用） -->
              <div v-if="imageEnabled && imageUrl" class="mb-3">
                <img 
                  :src="imageUrl" 
                  :alt="imageAlt || '笔数套餐配置图片'" 
                  class="w-full rounded-lg border"
                  @error="handleImageError"
                />
                <div v-if="imageAlt" class="text-xs text-gray-500 mt-1 text-center">
                  {{ imageAlt }}
                </div>
              </div>
              
              <!-- 主消息内容 -->
              <div class="text-xs whitespace-pre-line">
                {{ formatMainMessage }}
              </div>
            </div>
            
            <!-- 内嵌键盘（显示在消息下方） -->
            <div class="mt-2 max-w-xs">
              <div class="space-y-1">
                <!-- 使用网格布局显示按钮，匹配配置界面的布局 -->
                <div class="grid grid-cols-3 gap-1">
                  <template v-for="button in regularButtons" :key="button.id">
                    <button
                      @click="simulateButtonClick(button)"
                      class="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      {{ button.count }}笔
                    </button>
                  </template>
                </div>
                
                <!-- 特殊按钮（全宽显示） -->
                <div v-for="button in props.specialButtons" :key="`special-${button.id}`">
                  <button
                    @click="simulateButtonClick(button)"
                    class="w-full bg-blue-50 border border-blue-200 text-blue-800 px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    {{ button.count }}笔
                  </button>
                </div>
              </div>
            </div>
            
            <div class="text-xs text-gray-400 mt-1">{{ currentTime }}</div>
          </div>
        </div>
        
        <!-- 模拟用户选择后的回复 -->
        <div v-if="showReply" class="flex gap-2 animate-fade-in">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs">🤖</span>
          </div>
          <div class="flex-1">
            <div class="bg-gray-100 rounded-lg p-2 max-w-xs">
              <div class="text-xs">{{ replyMessage }}</div>
            </div>
            <div class="text-xs text-gray-400 mt-1">{{ currentTime }}</div>
            <div class="text-xs text-green-600 mt-1 italic">
              📌 机器人等待用户输入地址...
            </div>
          </div>
        </div>

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

        <!-- 最终订单确认回复（包含订单配置信息） -->
        <div v-if="showOrderReply" class="flex gap-2 mt-3 animate-fade-in-order">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs">🤖</span>
          </div>
          <div class="flex-1">
            <div class="bg-gray-100 rounded-lg p-3 max-w-xs">
              <!-- 使用模板渲染完整订单确认信息 -->
              <div class="text-xs whitespace-pre-line" v-html="formatOrderConfirmationHTML()">
              </div>
              
              <!-- 复制状态显示 -->
              <div v-if="copyStatus" class="text-xs text-center mt-2 transition-opacity duration-300">
                <span :class="{
                  'text-green-600': copyStatus.includes('✅'),
                  'text-red-600': copyStatus.includes('❌')
                }">
                  {{ copyStatus }}
                </span>
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">{{ currentTime }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Button } from '../composables/usePackageConfig'

interface Props {
  // 主消息模板
  mainMessageTemplate?: string
  dailyFee: number
  replyMessage: string
  showReply: boolean
  showOrderReply: boolean
  currentTime: string
  regularButtons: Button[]
  specialButton: Button | undefined
  specialButtons: Button[]
  simulateButtonClick: (button: Button) => void
  imageEnabled: boolean
  imageUrl: string
  imageAlt: string
  usageRules: string[]
  notes: string[]
  lineBreaks?: any
  generateLineBreaks?: (count: number) => string
  // 订单配置字段
  currentUnitPrice?: number
  currentTotalAmount?: number
  currentTransactionCount?: number
  paymentAddress?: string
  orderExpireMinutes?: number
  orderConfirmationTemplate?: string
  userInputAddress?: string
}

const props = defineProps<Props>()

// 默认换行配置
const lineBreaks = computed(() => {
  return props.lineBreaks || {
    after_title: 0,
    after_subtitle: 0,
    after_packages: 0,
    before_usage_rules: 0,
    before_notes: 0
  }
})

// 生成换行字符串
const generateLineBreaks = (count: number): string => {
  return props.generateLineBreaks ? props.generateLineBreaks(count) : (count > 0 ? '\n'.repeat(count) : '')
}


// 格式化主消息模板
const formatMainMessage = computed(() => {
  if (!props.mainMessageTemplate) {
    // 如果没有主消息模板，使用默认的老式构建方式
    return buildDefaultMessage()
  }
  
  const template = props.mainMessageTemplate
  
  return template
    .replace(/{dailyFee}/g, props.dailyFee.toString())
})

// 构建默认消息（兼容旧版本）
const buildDefaultMessage = () => {
  let message = '🔥 笔数套餐 🔥（无时间限制）'
  
  // 添加副标题
  message += '\n（24小时不使用，则扣' + props.dailyFee + '笔占用费）'
  
  // 使用规则
  if (props.usageRules && props.usageRules.length > 0) {
    message += '\n使用说明：'
    props.usageRules.forEach(rule => {
      if (rule && rule.trim()) {
        message += '\n• ' + rule
      }
    })
  }
  
  // 注意事项
  if (props.notes && props.notes.length > 0) {
    message += '\n注意事项：'
    props.notes.forEach(note => {
      if (note && note.trim()) {
        message += '\n• ' + note
      }
    })
  }
  
  return message
}



// 计算过期时间
const calculateExpireTime = () => {
  if (!props.orderExpireMinutes) return '未设置'
  
  const now = new Date()
  const expireTime = new Date(now.getTime() + props.orderExpireMinutes * 60 * 1000)
  return expireTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 复制状态管理
const copyStatus = ref('')

// 复制支付地址
const copyPaymentAddress = async () => {
  const address = props.paymentAddress || 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678'
  
  try {
    await navigator.clipboard.writeText(address)
    copyStatus.value = '✅ 地址已复制！'
    console.log('支付地址已复制到剪贴板:', address)
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案
    try {
      const textArea = document.createElement('textarea')
      textArea.value = address
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      copyStatus.value = '✅ 地址已复制！'
      console.log('支付地址已复制到剪贴板（降级方案）:', address)
    } catch (fallbackErr) {
      console.error('降级复制方案也失败:', fallbackErr)
      copyStatus.value = '❌ 复制失败'
    }
  }
  
  // 2秒后清除状态提示
  setTimeout(() => {
    copyStatus.value = ''
  }, 2000)
}

// 格式化订单确认模板，替换所有占位符
const formatOrderConfirmation = () => {
  const defaultTemplate = `✅ 订单确认

📋 已为您生成基于地址 {userAddress} 的个性化订单

每笔单价：{unitPrice} USDT
收款金额：{totalAmount} USDT (点击复制)
使用笔数：{transactionCount} 笔转账

能量接收地址：
{userAddress}
↑ 这是用户刚才输入的地址

支付地址：
{paymentAddress}
(点击地址自动复制)

‼️请务必核对金额尾数，金额不对则无法确认
‼️请务必核对金额尾数，金额不对则无法确认
‼️请务必核对金额尾数，金额不对则无法确认

订单将于 {expireTime} 过期，请尽快支付！`

  const template = props.orderConfirmationTemplate || defaultTemplate
  const expireTime = calculateExpireTime()
  
  return template
    .replace(/{unitPrice}/g, (props.currentUnitPrice || 1.1509).toString())
    .replace(/{totalAmount}/g, (props.currentTotalAmount || 11.509).toFixed(4))
    .replace(/{transactionCount}/g, (props.currentTransactionCount || 10).toString())
    .replace(/{userAddress}/g, props.userInputAddress || '用户输入的地址')
    .replace(/{paymentAddress}/g, props.paymentAddress || 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678')
    .replace(/{expireTime}/g, expireTime)
}

// 格式化订单确认模板为HTML，支付地址和金额可点击
const formatOrderConfirmationHTML = () => {
  const textContent = formatOrderConfirmation()
  const paymentAddress = props.paymentAddress || 'TWdcgk9NEsV1nt5yPrNfSYktbA12345678'
  const totalAmount = (props.currentTotalAmount || 11.509).toFixed(4)
  
  // 将支付地址替换为可点击的HTML元素
  const clickableAddress = `<span class="font-mono text-blue-600 break-all cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors border-b border-dashed border-blue-300" onclick="window.copyTransactionPackageAddress('${paymentAddress}')" title="点击复制地址: ${paymentAddress}">${paymentAddress}</span>`
  
  // 将总金额替换为可点击的HTML元素  
  const clickableAmount = `<span class="font-mono text-orange-600 cursor-pointer hover:bg-orange-50 px-1 py-0.5 rounded transition-colors border-b border-dashed border-orange-300" onclick="window.copyTransactionPackageAmount('${totalAmount}')" title="点击复制金额: ${totalAmount}">${totalAmount}</span>`
  
  // 使用正则表达式进行全局替换，确保精确匹配
  let result = textContent.replace(new RegExp(escapeRegExp(paymentAddress), 'g'), clickableAddress)
  result = result.replace(new RegExp(escapeRegExp(totalAmount), 'g'), clickableAmount)
  
  return result
}

// 转义正则表达式特殊字符
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 图片加载错误处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
}

// 设置全局复制函数，供HTML中的onclick使用
onMounted(() => {
  // 复制支付地址函数
  (window as any).copyTransactionPackageAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      copyStatus.value = '✅ 地址已复制！'
      console.log('支付地址已复制到剪贴板:', address)
    } catch (err) {
      console.error('复制失败:', err)
      // 降级方案
      try {
        const textArea = document.createElement('textarea')
        textArea.value = address
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        copyStatus.value = '✅ 地址已复制！'
        console.log('支付地址已复制到剪贴板（降级方案）:', address)
      } catch (fallbackErr) {
        console.error('降级复制方案也失败:', fallbackErr)
        copyStatus.value = '❌ 复制失败'
      }
    }
    
    // 2秒后清除状态提示
    setTimeout(() => {
      copyStatus.value = ''
    }, 2000)
  }
  
  // 复制金额函数
  (window as any).copyTransactionPackageAmount = async (amount: string) => {
    try {
      await navigator.clipboard.writeText(amount)
      copyStatus.value = '✅ 金额已复制！'
      console.log('收款金额已复制到剪贴板:', amount)
    } catch (err) {
      console.error('复制失败:', err)
      // 降级方案
      try {
        const textArea = document.createElement('textarea')
        textArea.value = amount
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        copyStatus.value = '✅ 金额已复制！'
        console.log('收款金额已复制到剪贴板（降级方案）:', amount)
      } catch (fallbackErr) {
        console.error('降级复制方案也失败:', fallbackErr)
        copyStatus.value = '❌ 复制失败'
      }
    }
    
    // 2秒后清除状态提示
    setTimeout(() => {
      copyStatus.value = ''
    }, 2000)
  }
})

// 清理全局函数
onUnmounted(() => {
  delete (window as any).copyTransactionPackageAddress
  delete (window as any).copyTransactionPackageAmount
})
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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

@keyframes fade-in-order {
  0% {
    opacity: 0;
    transform: translateY(15px) scale(0.95);
  }
  70% {
    opacity: 0;
    transform: translateY(15px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-fade-in-delayed {
  animation: fade-in-delayed 2s ease-out;
}

.animate-fade-in-order {
  animation: fade-in-order 3s ease-out;
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
