<template>
  <div class="space-y-6">
    <!-- 图片配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">🖼️ 图片配置</h3>
      
      <div class="space-y-4">
        <!-- 启用图片开关 -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-gray-700">启用图片显示</label>
            <p class="text-xs text-gray-500">在Telegram消息中显示图片</p>
          </div>
          <button
            @click="toggleImageEnabled"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              config.enable_image ? 'bg-blue-600' : 'bg-gray-200'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                config.enable_image ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>

        <!-- 图片上传 -->
        <div v-if="config.enable_image">
          <label class="block text-sm font-medium text-gray-700 mb-2">上传图片</label>
          <ImageUpload
            v-model="config.image_url"
            :image-alt="config.image_alt"
            config-type="trx_exchange"
            @upload-success="handleImageUploadSuccess"
            @upload-error="handleImageUploadError"
          />
        </div>

        <!-- 图片描述 -->
        <div v-if="config.enable_image && config.image_url">
          <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">图片描述（可选）</label>
          <input
            type="text"
            v-model="config.image_alt"
            placeholder="图片的替代文本描述"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">用于图片加载失败时的替代显示</p>
        </div>
      </div>
    </div>

    <!-- 基础配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">⚙️ 基础配置</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">兑换地址</label>
          <input
            v-model="config.config.exchange_address"
            type="text"
            placeholder="请输入TRX兑换地址"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">最小兑换金额</label>
          <div class="flex items-center space-x-2">
            <input
              v-model.number="config.config.min_amount"
              type="number"
              step="0.1"
              min="0.1"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span class="text-gray-500">USDT</span>
          </div>
        </div>

      </div>
    </div>

    <!-- 汇率配置 -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">💱 汇率配置</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">USDT转TRX汇率</label>
          <input
            v-model.number="config.config.usdt_to_trx_rate"
            type="number"
            step="0.000001"
            min="0"
            placeholder="1 USDT = ? TRX"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">TRX转USDT汇率</label>
          <input
            v-model.number="config.config.trx_to_usdt_rate"
            type="number"
            step="0.000001"
            min="0"
            placeholder="1 TRX = ? USDT"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageUpload from '../../../../components/ImageUpload.vue';

interface Props {
  config: any
  toggleImageEnabled: () => void
  handleImageUploadSuccess: (data: { url: string; filename: string }) => void
  handleImageUploadError: (error: string) => void
}

defineProps<Props>()
</script>

<style scoped>
.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
