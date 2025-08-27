<template>
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">价格计算器</h3>
        <p class="text-sm text-gray-500">快速计算不同场景下的价格</p>
      </div>
      <button
        @click="resetCalculator"
        class="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        重置
      </button>
    </div>

    <div class="space-y-6">
      <!-- 计算参数 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 资源类型 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">资源类型</label>
          <select
            v-model="calculatorInput.type"
            @change="calculatePrice"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="energy">能量</option>
            <option value="bandwidth">带宽</option>
          </select>
        </div>

        <!-- 数量 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            数量 ({{ calculatorInput.type === 'energy' ? '能量单位' : '字节' }})
          </label>
          <input
            v-model.number="calculatorInput.amount"
            @input="calculatePrice"
            type="number"
            min="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入数量"
          />
        </div>

        <!-- 用户等级 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">用户等级</label>
          <select
            v-model="calculatorInput.userLevel"
            @change="calculatePrice"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="regular">普通用户</option>
            <option value="premium">高级用户</option>
            <option value="vip">VIP用户</option>
          </select>
        </div>

        <!-- 定价模板 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">定价模板（可选）</label>
          <select
            v-model="calculatorInput.templateId"
            @change="calculatePrice"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">自动选择</option>
            <option
              v-for="template in availableTemplates"
              :key="template.id"
              :value="template.id"
            >
              {{ template.name }} ({{ formatCurrency(template.basePrice, template.currency) }})
            </option>
          </select>
        </div>
      </div>

      <!-- 紧急处理 -->
      <div class="flex items-center">
        <input
          v-model="calculatorInput.isEmergency"
          @change="calculatePrice"
          type="checkbox"
          id="emergency"
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label for="emergency" class="ml-2 block text-sm text-gray-900">
          紧急处理（可能产生额外费用）
        </label>
      </div>

      <!-- 计算结果 -->
      <div v-if="priceResult" class="border-t border-gray-200 pt-6">
        <h4 class="text-lg font-medium text-gray-900 mb-4">计算结果</h4>
        
        <div class="bg-gray-50 rounded-lg p-4 space-y-3">
          <!-- 基础信息 -->
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">基础数量:</span>
            <span class="font-medium">{{ formatNumber(priceResult.baseAmount) }}</span>
          </div>
          
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">基础单价:</span>
            <span class="font-medium">{{ formatCurrency(priceResult.basePrice, priceResult.currency) }}</span>
          </div>
          
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">小计:</span>
            <span class="font-medium">{{ formatCurrency(priceResult.subtotal, priceResult.currency) }}</span>
          </div>

          <!-- 折扣 -->
          <div v-if="priceResult.discounts.length > 0" class="space-y-2">
            <div class="text-sm font-medium text-green-600">折扣优惠:</div>
            <div
              v-for="discount in priceResult.discounts"
              :key="discount.id"
              class="flex justify-between text-sm text-green-600 pl-4"
            >
              <span>{{ discount.name }}:</span>
              <span>-{{ formatCurrency(discount.amount, priceResult.currency) }}</span>
            </div>
          </div>

          <!-- 附加费用 -->
          <div v-if="priceResult.fees.length > 0" class="space-y-2">
            <div class="text-sm font-medium text-red-600">附加费用:</div>
            <div
              v-for="fee in priceResult.fees"
              :key="fee.id"
              class="flex justify-between text-sm text-red-600 pl-4"
            >
              <span>{{ fee.name }}:</span>
              <span>+{{ formatCurrency(fee.amount, priceResult.currency) }}</span>
            </div>
          </div>

          <!-- 总价 -->
          <div class="border-t border-gray-300 pt-3">
            <div class="flex justify-between text-lg font-bold text-gray-900">
              <span>总价:</span>
              <span class="text-indigo-600">{{ formatCurrency(priceResult.total, priceResult.currency) }}</span>
            </div>
          </div>
        </div>

        <!-- 价格说明 -->
        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
          <h5 class="text-sm font-medium text-blue-900 mb-1">价格说明</h5>
          <ul class="text-sm text-blue-700 space-y-1">
            <li>• 价格可能因市场波动而实时调整</li>
            <li>• 实际订单价格以下单时为准</li>
            <li>• VIP用户享受专属优惠政策</li>
            <li v-if="calculatorInput.isEmergency">• 紧急处理订单将产生额外费用</li>
          </ul>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-3 mt-4">
          <button
            @click="saveCalculation"
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            保存计算
          </button>
          <button
            @click="createOrder"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            立即下单
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
    PriceCalculation,
    PriceCalculatorInput,
    PriceTemplate
} from '../types/pricing.types'

interface Props {
  templates: PriceTemplate[]
  calculatePrice: (input: PriceCalculatorInput) => PriceCalculation
  formatCurrency: (value: number, currency: string) => string
  formatNumber: (value: number) => string
}

interface Emits {
  (e: 'saveCalculation', calculation: PriceCalculation): void
  (e: 'createOrder', input: PriceCalculatorInput): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算器输入
const calculatorInput = ref<PriceCalculatorInput>({
  type: 'energy',
  amount: 1000,
  userLevel: 'regular',
  isEmergency: false,
  templateId: ''
})

// 计算结果
const priceResult = ref<PriceCalculation | null>(null)

// 可用模板
const availableTemplates = computed(() => {
  return props.templates.filter(t => 
    t.status === 'active' && 
    (t.type === calculatorInput.value.type || t.type === 'mixed')
  )
})

// 方法
const calculatePrice = () => {
  if (calculatorInput.value.amount > 0) {
    priceResult.value = props.calculatePrice(calculatorInput.value)
  } else {
    priceResult.value = null
  }
}

const resetCalculator = () => {
  calculatorInput.value = {
    type: 'energy',
    amount: 1000,
    userLevel: 'regular',
    isEmergency: false,
    templateId: ''
  }
  priceResult.value = null
}

const saveCalculation = () => {
  if (priceResult.value) {
    emit('saveCalculation', priceResult.value)
  }
}

const createOrder = () => {
  emit('createOrder', calculatorInput.value)
}

// 监听输入变化
watch(
  () => calculatorInput.value,
  () => {
    calculatePrice()
  },
  { deep: true, immediate: true }
)
</script>
