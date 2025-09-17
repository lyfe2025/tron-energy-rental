<!--
  代理资源类型选择组件
-->
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-3">代理资源类型</label>
    <div class="grid grid-cols-2 gap-3">
      <button
        type="button"
        @click="$emit('update:resourceType', 'ENERGY')"
        :class="[
          'p-4 border rounded-lg text-center transition-all duration-200',
          resourceType === 'ENERGY'
            ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        ]"
      >
        <div class="flex items-center justify-center mb-2">
          <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div class="font-medium mb-1">代理能量</div>
        <div class="text-xs text-gray-500 mb-1">用于智能合约调用</div>
        <div class="text-xs text-green-600" v-if="loadingResources">
          <span class="animate-pulse">获取中...</span>
        </div>
        <div class="text-xs text-green-600" v-else>
          可代理: {{ availableEnergy.toLocaleString() }}
        </div>
      </button>
      <button
        type="button"
        @click="$emit('update:resourceType', 'BANDWIDTH')"
        :class="[
          'p-4 border rounded-lg text-center transition-all duration-200',
          resourceType === 'BANDWIDTH'
            ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        ]"
      >
        <div class="flex items-center justify-center mb-2">
          <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div class="font-medium mb-1">代理带宽</div>
        <div class="text-xs text-gray-500 mb-1">用于普通转账</div>
        <div class="text-xs text-green-600" v-if="loadingResources">
          <span class="animate-pulse">获取中...</span>
        </div>
        <div class="text-xs text-green-600" v-else>
          可代理: {{ availableBandwidth.toLocaleString() }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  resourceType: 'ENERGY' | 'BANDWIDTH'
  availableEnergy: number
  availableBandwidth: number
  loadingResources: boolean
}

interface Emits {
  'update:resourceType': [value: 'ENERGY' | 'BANDWIDTH']
}

defineProps<Props>()
defineEmits<Emits>()
</script>
