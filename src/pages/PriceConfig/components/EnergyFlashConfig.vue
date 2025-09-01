<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">能量闪租模式</h2>
        <p class="text-gray-600 text-sm mt-1">单笔能量闪租价格配置</p>
      </div>
      <div class="flex items-center space-x-3">
        <span class="text-sm text-gray-500">启用状态</span>
        <button
          @click="handleToggle"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config?.is_active ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config?.is_active ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>

    <div v-if="config" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">单笔价格</label>
        <div class="flex items-center space-x-2">
          <input
            v-model.number="config.config.single_price"
            type="number"
            step="0.1"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-gray-500">TRX</span>
        </div>
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">最大购买笔数</label>
        <input
          v-model.number="config.config.max_transactions"
          type="number"
          min="1"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">时效限制（小时）</label>
        <input
          v-model.number="config.config.expiry_hours"
          type="number"
          min="1"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">收款地址</label>
        <input
          v-model="config.config.payment_address"
          type="text"
          placeholder="请输入收款地址"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group flex items-center">
        <input
          v-model="config.config.double_energy_for_no_usdt"
          type="checkbox"
          id="double_energy"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label for="double_energy" class="ml-2 text-sm text-gray-700">
          向无U地址转账需双倍能量
        </label>
      </div>
    </div>

    <div class="mt-4 flex justify-end">
      <button
        @click="handleSave"
        :disabled="saving"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConfigCardProps } from '../types';

/**
 * 组件接口定义 - 保持与原组件完全一致
 */
const props = defineProps<ConfigCardProps>()

const handleToggle = () => {
  props.onToggle('energy_flash')
}

const handleSave = () => {
  props.onSave('energy_flash')
}
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}

.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
