<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">📝 显示文本配置</h3>
    <div class="space-y-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
        <input
          v-model="displayTexts.title"
          type="text"
          placeholder="🟢USDT自动兑换TRX🔴"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">副标题模板</label>
        <input
          v-model="displayTexts.subtitle_template"
          type="text"
          placeholder="（转U自动回TRX，{min_amount}U起换）"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-500 mt-1">支持变量：{min_amount} 最小兑换金额</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">汇率标题</label>
          <input
            v-model="displayTexts.rate_title"
            type="text"
            placeholder="📊 当前汇率"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">地址标签</label>
          <input
            v-model="displayTexts.address_label"
            type="text"
            placeholder="📍 兑换地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">汇率描述</label>
        <textarea
          v-model="displayTexts.rate_description"
          rows="2"
          placeholder="汇率每分钟自动更新"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  displayTexts: any
}

defineProps<Props>()
</script>
