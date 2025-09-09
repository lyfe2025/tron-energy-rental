<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">⚙️ 基础配置</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">24小时不使用扣费</label>
        <div class="flex items-center space-x-2">
          <input
            :value="config.daily_fee"
            @input="$emit('update:daily_fee', parseFloat(($event.target as HTMLInputElement).value))"
            type="number"
            step="0.1"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-gray-500">TRX</span>
        </div>
      </div>

      <div class="form-group flex items-center space-y-2">
        <div class="flex items-center p-2 bg-blue-50 rounded-md mr-4">
          <input
            :checked="config.transferable"
            @change="$emit('update:transferable', ($event.target as HTMLInputElement).checked)"
            type="checkbox"
            id="transferable"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="transferable" class="ml-2 text-sm text-gray-700">
            🔄 支持转移笔数
          </label>
        </div>

        <div class="flex items-center p-2 bg-green-50 rounded-md">
          <input
            :checked="config.proxy_purchase"
            @change="$emit('update:proxy_purchase', ($event.target as HTMLInputElement).checked)"
            type="checkbox"
            id="proxy_purchase"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="proxy_purchase" class="ml-2 text-sm text-gray-700">
            🛒 支持代购
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BasicConfigProps {
  config: {
    daily_fee: number
    transferable: boolean
    proxy_purchase: boolean
  }
}

defineProps<BasicConfigProps>()

defineEmits<{
  'update:daily_fee': [value: number]
  'update:transferable': [value: boolean]
  'update:proxy_purchase': [value: boolean]
}>()
</script>

<style scoped>
.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
