<template>
  <div class="config-card bg-white rounded-lg shadow-md p-6">
    <div class="card-header flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">TRX闪兑模式</h2>
        <p class="text-gray-600 text-sm mt-1">USDT自动兑换TRX服务配置</p>
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

    <div v-if="config" class="space-y-6">
      <!-- 基础配置 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <div class="form-group">
          <label class="block text-sm font-medium text-gray-700 mb-2">汇率更新间隔</label>
          <div class="flex items-center space-x-2">
            <input
              v-model.number="config.config.rate_update_interval"
              type="number"
              min="1"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span class="text-gray-500">分钟</span>
          </div>
        </div>
      </div>

      <!-- 汇率配置 -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-4">实时汇率配置</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">USDT → TRX 汇率</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">1 USDT =</span>
              <input
                v-model.number="config.config.usdt_to_trx_rate"
                type="number"
                step="0.0001"
                min="0"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-500">TRX</span>
            </div>
          </div>

          <div class="form-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">TRX → USDT 汇率</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">100 TRX =</span>
              <input
                v-model.number="config.config.trx_to_usdt_rate"
                type="number"
                step="0.0001"
                min="0"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-500">USDT</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能配置 -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-4">功能配置</h3>
        <div class="flex items-center">
          <input
            v-model="config.config.is_auto_exchange"
            type="checkbox"
            id="auto_exchange"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="auto_exchange" class="ml-2 text-sm text-gray-700">
            启用自动兑换（转U自动回TRX）
          </label>
        </div>
      </div>

      <!-- 注意事项配置 -->
      <div class="bg-yellow-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-4">注意事项配置</h3>
        <div class="space-y-3">
          <div
            v-for="(note, index) in config.config.notes"
            :key="index"
            class="flex items-center space-x-2"
          >
            <input
              v-model="config.config.notes[index]"
              type="text"
              placeholder="请输入注意事项"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="removeNote(index)"
              class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              删除
            </button>
          </div>
          <button
            @click="addNote"
            class="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            添加注意事项
          </button>
        </div>
      </div>

      <!-- 预览效果 -->
      <div class="bg-gray-100 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Telegram 显示预览</h3>
        <div class="bg-white p-4 rounded-lg border font-mono text-sm">
          <div class="text-green-600">🟢USDT自动兑换TRX🔴</div>
          <div class="text-gray-600">（转U自动回TRX，{{ config.config.min_amount }}U起换）</div>
          <br>
          <div class="text-blue-600">📈实时汇率</div>
          <div>1 USDT = {{ config.config.usdt_to_trx_rate }} TRX</div>
          <div>100 TRX = {{ config.config.trx_to_usdt_rate }} USDT</div>
          <div class="text-gray-600">（上面是U换T，下面是T换U）</div>
          <br>
          <div class="text-orange-600">🔄自动兑换地址:</div>
          <div class="text-blue-600">{{ config.config.exchange_address }} (点击地址自动复制)</div>
          <br>
          <div v-for="note in config.config.notes" :key="note" class="text-red-600">
            {{ note }}
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
  props.onToggle('trx_exchange')
}

const handleSave = () => {
  props.onSave('trx_exchange')
}

const addNote = () => {
  if (props.config?.config.notes) {
    props.config.config.notes.push('')
  }
}

const removeNote = (index: number) => {
  if (props.config?.config.notes) {
    props.config.config.notes.splice(index, 1)
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
</style>
