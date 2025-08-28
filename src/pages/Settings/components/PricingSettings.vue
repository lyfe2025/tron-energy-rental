<template>
  <div class="space-y-6">
    <!-- 基础定价 -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">基础定价</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            能量基础价格 (TRX/能量)
          </label>
          <div class="relative">
            <input
              v-model.number="localSettings.energyBasePrice"
              type="number"
              step="0.001"
              min="0.001"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span class="absolute right-3 top-2 text-gray-500">TRX</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">每单位能量的基础价格</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            带宽基础价格 (TRX/字节)
          </label>
          <div class="relative">
            <input
              v-model.number="localSettings.bandwidthBasePrice"
              type="number"
              step="0.001"
              min="0.001"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span class="absolute right-3 top-2 text-gray-500">TRX</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">每字节带宽的基础价格</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            紧急费用倍数
          </label>
          <input
            v-model.number="localSettings.emergencyFeeMultiplier"
            type="number"
            step="0.1"
            min="1.0"
            max="5.0"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p class="text-xs text-gray-500 mt-1">紧急订单的费用倍数 (1.0-5.0)</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            最小订单金额 (TRX)
          </label>
          <input
            v-model.number="localSettings.minimumOrderAmount"
            type="number"
            min="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            最大订单金额 (TRX)
          </label>
          <input
            v-model.number="localSettings.maximumOrderAmount"
            type="number"
            min="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>



    <!-- 价格预览 -->
    <div class="p-4 bg-blue-50 rounded-lg">
      <h4 class="font-medium text-gray-900 mb-2">价格预览</h4>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span class="text-gray-600">1000能量:</span>
          <span class="font-medium ml-1">{{ (1000 * localSettings.energyBasePrice).toFixed(3) }} TRX</span>
        </div>
        <div>
          <span class="text-gray-600">10MB带宽:</span>
          <span class="font-medium ml-1">{{ (10485760 * localSettings.bandwidthBasePrice).toFixed(3) }} TRX</span>
        </div>
        <div>
          <span class="text-gray-600">紧急订单:</span>
          <span class="font-medium ml-1">+{{ ((localSettings.emergencyFeeMultiplier - 1) * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end pt-6 border-t border-gray-200">
      <button
        @click="$emit('save')"
        :disabled="isSaving"
        class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg v-if="isSaving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        {{ isSaving ? '保存中...' : '保存定价设置' }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { PricingSettings } from '../types/settings.types'

interface Props {
  settings: PricingSettings
  isSaving: boolean
}

interface Emits {
  (e: 'update:settings', settings: PricingSettings): void
  (e: 'save'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地设置副本
const localSettings = computed({
  get: () => props.settings,
  set: (value) => emit('update:settings', value)
})





// 监听设置变化
watch(
  () => props.settings,
  (newSettings) => {
    console.log('Pricing settings changed:', newSettings)
  },
  { deep: true }
)
</script>
