<template>
  <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📝 显示文本配置</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">主标题</label>
        <input
          :value="displayTexts?.title || ''"
          @input="updateDisplayText('title', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="🔥 笔数套餐 🔥（无时间限制）"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">副标题</label>
        <input
          :value="displayTexts?.subtitle || ''"
          @input="updateDisplayText('subtitle', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="（24小时不使用，则扣一笔占费）"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">使用说明标题</label>
        <input
          :value="displayTexts?.usage_title || ''"
          @input="updateDisplayText('usage_title', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="💡 笔数开/关按钮，可查询账单，开/关笔数"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">地址输入提示</label>
        <input
          :value="displayTexts?.address_prompt || ''"
          @input="updateDisplayText('address_prompt', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="请输入能量接收地址："
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DisplayTexts {
  title?: string
  subtitle?: string
  usage_title?: string
  address_prompt?: string
}

interface DisplayTextConfigProps {
  displayTexts?: DisplayTexts
}

defineProps<DisplayTextConfigProps>()

const emit = defineEmits<{
  'update:display-text': [field: string, value: string]
}>()

const updateDisplayText = (field: string, value: string) => {
  emit('update:display-text', field, value)
}
</script>

<style scoped>
.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
