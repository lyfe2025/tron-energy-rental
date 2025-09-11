<template>
  <!-- 基础配置 -->
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="text-lg font-medium text-gray-900 mb-4">⚙️ 基础配置</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">单笔价格</label>
        <div class="flex items-center space-x-2">
          <input
            v-model.number="config.config.single_price"
            type="number"
            step="0.1"
            min="0.1"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-gray-500">TRX</span>
        </div>
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">最大购买数量</label>
        <input
          v-model.number="config.config.max_transactions"
          type="number"
          min="1"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">租赁时长</label>
        <div class="flex items-center space-x-2">
          <input
            v-model.number="config.config.expiry_hours"
            type="number"
            min="1"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-gray-500">小时</span>
        </div>
      </div>

      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-2">支付地址</label>
        <input
          v-model="config.config.payment_address"
          type="text"
          placeholder="请输入TRON支付地址"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- 特殊选项 -->
    <div class="mt-4">
      <div class="flex items-center justify-between">
        <div>
          <label class="text-sm font-medium text-gray-700">无USDT双倍能量</label>
          <p class="text-xs text-gray-500">当用户账户无USDT时提供双倍能量</p>
        </div>
        <button
          @click="toggleDoubleEnergy"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            config.config.double_energy_for_no_usdt ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              config.config.double_energy_for_no_usdt ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyFlashConfig } from '../types/energy-flash.types';

interface Props {
  config: EnergyFlashConfig
}

const props = defineProps<Props>()

/**
 * 双倍能量开关
 */
const toggleDoubleEnergy = () => {
  props.config.config.double_energy_for_no_usdt = !props.config.config.double_energy_for_no_usdt
}
</script>

<style scoped>
.form-group label {
  @apply text-sm font-medium text-gray-700;
}
</style>
