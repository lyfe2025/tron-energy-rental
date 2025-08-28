<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-gray-900 mb-4">价格管理概览</h3>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 价格策略统计 -->
      <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-blue-600">价格策略</p>
            <p class="text-2xl font-bold text-blue-900">{{ strategiesCount }}</p>
            <p class="text-sm text-blue-700">
              活跃: {{ activeStrategiesCount }}
            </p>
          </div>
          <div class="text-blue-400">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 定价模式统计 -->
      <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-green-600">定价模式</p>
            <p class="text-2xl font-bold text-green-900">{{ pricingModesCount }}</p>
            <p class="text-sm text-green-700">
              启用: {{ activePricingModesCount }}
            </p>
          </div>
          <div class="text-green-400">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 价格模板统计 -->
      <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-purple-600">价格模板</p>
            <p class="text-2xl font-bold text-purple-900">{{ templatesCount }}</p>
            <p class="text-sm text-purple-700">
              活跃: {{ activeTemplatesCount }}
            </p>
          </div>
          <div class="text-purple-400">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 价格历史统计 -->
      <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-orange-600">价格记录</p>
            <p class="text-2xl font-bold text-orange-900">{{ priceHistoryCount }}</p>
            <p class="text-sm text-orange-700">
              今日: {{ todayPriceHistoryCount }}
            </p>
          </div>
          <div class="text-orange-400">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PricingStrategy, PricingMode, PriceTemplate, PriceHistory } from '../types/pricing.types'

interface Props {
  strategies: PricingStrategy[]
  pricingModes: PricingMode[]
  templates: PriceTemplate[]
  priceHistory: PriceHistory[]
}

const props = defineProps<Props>()

// 计算统计数据
  const strategiesCount = computed(() => Array.isArray(props.strategies) ? props.strategies.length : 0)
const activeStrategiesCount = computed(() => {
  return Array.isArray(props.strategies) ? props.strategies.filter(s => s.status === 'active').length : 0
})

const pricingModesCount = computed(() => Array.isArray(props.pricingModes) ? props.pricingModes.length : 0)
const activePricingModesCount = computed(() => {
  return Array.isArray(props.pricingModes) ? props.pricingModes.filter(m => m.isEnabled).length : 0
})

const templatesCount = computed(() => Array.isArray(props.templates) ? props.templates.length : 0)
const activeTemplatesCount = computed(() => {
  return Array.isArray(props.templates) ? props.templates.filter(t => t.status === 'active').length : 0
})

const priceHistoryCount = computed(() => Array.isArray(props.priceHistory) ? props.priceHistory.length : 0)
const todayPriceHistoryCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return Array.isArray(props.priceHistory) ? props.priceHistory.filter(h => 
    h.createdAt.startsWith(today)
  ).length : 0
})
</script>
