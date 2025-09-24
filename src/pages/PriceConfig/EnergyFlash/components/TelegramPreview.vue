<template>
  <!-- Telegram风格预览 -->
  <div class="bg-white rounded-lg border shadow-sm max-w-sm sticky top-4">
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
            <div v-if="config.enable_image && config.image_url" class="mb-3">
              <img 
                :src="config.image_url" 
                :alt="config.image_alt || '能量闪租配置图片'" 
                class="w-full rounded-lg border"
                @error="handleImageError"
              />
              <div v-if="config.image_alt" class="text-xs text-gray-500 mt-1 text-center">
                {{ config.image_alt }}
              </div>
            </div>
            
            <!-- 主消息内容 -->
            <div v-if="props.mainMessageTemplate" class="text-xs whitespace-pre-line" v-html="formatMainMessageHTML">
            </div>
            
            <!-- 没有配置模板时的提示 -->
            <div v-else class="text-xs text-gray-500 text-center py-4">
              请配置主消息模板以预览内容
            </div>
            
            <!-- 复制状态显示 -->
            <div v-if="copyStatus" class="text-xs text-center mt-2 transition-opacity duration-300">
              <span :class="{
                'text-green-600': copyStatus.includes('✅'),
                'text-red-600': copyStatus.includes('❌'),
                'text-yellow-600': copyStatus.includes('⚠️')
              }">
                {{ copyStatus }}
              </span>
            </div>
          </div>
          
          <!-- 消息发送时间 -->
          <div class="text-xs text-gray-400 mt-1">
            刚刚
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { EnergyFlashConfig } from '../types/energy-flash.types'

interface Props {
  config: EnergyFlashConfig
  mainMessageTemplate?: string
  singlePrice?: number
  expiryHours?: number
  maxTransactions?: number
  paymentAddress?: string
}

const props = defineProps<Props>()

// 使用composables

// 复制状态管理
const copyStatus = ref('')

// 图片错误处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
}



// 格式化主消息模板为HTML，支付地址可点击
const formatMainMessageHTML = computed(() => {
  if (!props.mainMessageTemplate) {
    return '⚡闪租能量（需要时）' // 默认标题
  }
  
  // 注意：mainMessageTemplate已经是格式化过的内容（包含计算后的价格等），
  // 我们只需要处理支付地址的点击功能
  const textContent = props.mainMessageTemplate
  
  const paymentAddress = props.paymentAddress || props.config.config.payment_address || 'TExample...'
  
  // 将支付地址替换为可点击的HTML元素
  const clickableAddress = `<span class="font-mono text-blue-600 break-all cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors border-b border-dashed border-blue-300" onclick="window.copyEnergyFlashAddress('${paymentAddress}')" title="点击复制地址: ${paymentAddress}">${paymentAddress}</span>`
  
  return textContent.replace(new RegExp(paymentAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), clickableAddress)
})

// 设置全局复制函数，供HTML中的onclick使用
onMounted(() => {
  (window as any).copyEnergyFlashAddress = async (address: string) => {
    if (!address || address === 'TExample...') {
      copyStatus.value = '⚠️ 没有地址可复制'
      setTimeout(() => {
        copyStatus.value = ''
      }, 2000)
      return
    }
    
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
})

// 清理全局函数
onUnmounted(() => {
  delete (window as any).copyEnergyFlashAddress
})
</script>
