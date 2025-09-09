<template>
  <div class="lg:w-1/3 lg:min-w-[400px]">
    <div class="bg-gray-100 p-4 rounded-lg sticky top-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">📱 Telegram 显示预览</h3>
      <div class="bg-white p-4 rounded-lg border font-mono text-sm shadow-inner">
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
