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

    <!-- 折扣规则 -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">折扣规则</h3>
        <button
          @click="addDiscountRule"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          添加规则
        </button>
      </div>
      
      <div v-if="localSettings.discountRules.length === 0" class="text-center py-8 text-gray-500">
        暂无折扣规则，点击"添加规则"创建新的折扣规则
      </div>

      <div
        v-for="(rule, index) in localSettings.discountRules"
        :key="rule.id"
        class="bg-gray-50 rounded-lg p-4 space-y-4"
      >
        <div class="flex items-center justify-between">
          <h4 class="font-medium text-gray-900">规则 {{ index + 1 }}</h4>
          <div class="flex items-center space-x-2">
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                v-model="rule.enabled"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <button
              @click="removeDiscountRule(index)"
              class="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              删除
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              规则名称
            </label>
            <input
              v-model="rule.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              类型
            </label>
            <select
              v-model="rule.type"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="volume">按数量</option>
              <option value="time">按时间</option>
              <option value="user_level">按用户等级</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              阈值
            </label>
            <input
              v-model.number="rule.threshold"
              type="number"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              折扣 (%)
            </label>
            <input
              v-model.number="rule.discount"
              type="number"
              min="0"
              max="50"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
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


  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { DiscountRule, PricingSettings } from '../types/settings.types'

interface Props {
  settings: PricingSettings
  isSaving: boolean
}

interface Emits {
  (e: 'update:settings', settings: PricingSettings): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地设置副本
const localSettings = computed({
  get: () => props.settings,
  set: (value) => emit('update:settings', value)
})



// 折扣规则管理
const addDiscountRule = () => {
  const newRule: DiscountRule = {
    id: Date.now().toString(),
    name: `规则${localSettings.value.discountRules.length + 1}`,
    type: 'volume',
    threshold: 1000,
    discount: 5,
    enabled: true
  }
  localSettings.value.discountRules.push(newRule)
}

const removeDiscountRule = (index: number) => {
  localSettings.value.discountRules.splice(index, 1)
}

// 监听设置变化
watch(
  () => props.settings,
  (newSettings) => {
    emit('update:settings', newSettings)
  },
  { deep: true }
)
</script>
