<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">笔数套餐模式</h2>
        <p class="text-gray-600 text-sm mt-1">长期套餐价格配置</p>
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

    <div v-if="config" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">24小时不使用扣费</label>
          <div class="flex items-center space-x-2">
            <input
              v-model.number="config.config.daily_fee"
              type="number"
              step="0.1"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span class="text-gray-500">TRX</span>
          </div>
        </div>

        <div class="form-group flex items-center">
          <input
            v-model="config.config.transferable"
            type="checkbox"
            id="transferable"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="transferable" class="ml-2 text-sm text-gray-700">
            支持转移笔数
          </label>
        </div>

        <div class="form-group flex items-center">
          <input
            v-model="config.config.proxy_purchase"
            type="checkbox"
            id="proxy_purchase"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="proxy_purchase" class="ml-2 text-sm text-gray-700">
            支持代购
          </label>
        </div>
      </div>

      <!-- 套餐列表 -->
      <div class="packages-section">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-medium text-gray-900">套餐配置</h3>
          <button
            @click="addPackage"
            class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            添加套餐
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(pkg, index) in config.config.packages"
            :key="index"
            class="package-item p-4 border border-gray-200 rounded-md"
          >
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">套餐名称</label>
                <input
                  v-model="pkg.name"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">笔数</label>
                <input
                  v-model.number="pkg.transaction_count"
                  type="number"
                  min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">价格 (TRX)</label>
                <input
                  v-model.number="pkg.price"
                  type="number"
                  step="0.1"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div class="flex items-end">
                <button
                  @click="removePackage(index)"
                  class="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
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
  props.onToggle('transaction_package')
}

const handleSave = () => {
  props.onSave('transaction_package')
}

const addPackage = () => {
  if (props.config?.config.packages) {
    props.config.config.packages.push({
      name: '新套餐',
      transaction_count: 100,
      price: 250,
      currency: 'TRX'
    })
  }
}

const removePackage = (index: number) => {
  if (props.config?.config.packages) {
    props.config.config.packages.splice(index, 1)
  }
}
</script>

<style scoped>
.config-card {
  @apply border border-gray-200;
}

.form-group label {
  @apply text-sm font-medium text-gray-700;
}

.package-item {
  @apply bg-gray-50;
}
</style>
