<template>
  <div class="md:w-1/3 md:min-w-[400px]">
    <!-- Telegram机器人窗口 -->
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
      <div class="p-4 space-y-3 max-h-96 overflow-y-auto">
        <div class="flex gap-2">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs">🤖</span>
          </div>
          <div class="flex-1">
            <div class="bg-gray-100 rounded-lg p-3 max-w-xs font-mono text-sm">
        <div class="text-green-600">{{ getDisplayText('title', '🔥 笔数套餐 🔥（无时间限制）') }}</div>
        <div class="text-gray-600">{{ getDisplayText('subtitle', '（24小时不使用，则扣一笔占费）') }}</div>
        <br>
        <div v-for="rule in usageRules" :key="rule" class="text-red-600">
          🔺 {{ rule }}
        </div>
        <br>
        <div class="text-yellow-600">{{ getDisplayText('usage_title', '💡 笔数开/关按钮，可查询账单，开/关笔数') }}</div>
        <br>
        <div class="grid grid-cols-2 gap-2 mb-4">
          <div 
            v-for="pkg in packages" 
            :key="pkg.name"
            class="bg-green-100 p-2 text-center rounded"
          >
            <div class="font-bold">{{ pkg.transaction_count }}笔</div>
            <div class="text-sm">{{ pkg.price }} TRX</div>
          </div>
        </div>
        <br>
        <div class="text-gray-600">{{ getDisplayText('address_prompt', '请输入能量接收地址：') }}</div>
        <br>
              <div v-for="note in notes" :key="note" class="text-red-600">
                ⚠️ {{ note }}
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
  </div>
</template>

<script setup lang="ts">
interface Package {
  name: string
  transaction_count: number
  price: number
}

interface DisplayTexts {
  title?: string
  subtitle?: string
  usage_title?: string
  address_prompt?: string
}

interface TelegramPreviewProps {
  packages: Package[]
  usageRules: string[]
  notes: string[]
  displayTexts?: DisplayTexts
}

const props = defineProps<TelegramPreviewProps>()

// 获取显示文本，如果没有配置则使用默认值
const getDisplayText = (key: string, defaultValue: string): string => {
  return props.displayTexts?.[key as keyof DisplayTexts] || defaultValue
}
</script>
