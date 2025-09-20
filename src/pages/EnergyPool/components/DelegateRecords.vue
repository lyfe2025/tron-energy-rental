<template>
  <div class="delegate-records-container">
    <!-- 如果没有指定方向，显示标签页切换 -->
    <div v-if="!delegateDirection" class="mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="代理记录类型">
          <button
            @click="activeTab = 'out'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'out'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            代理给他人记录
          </button>
          <button
            @click="activeTab = 'in'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'in'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            他人代理给自己记录
          </button>
          <button
            @click="activeTab = 'all'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            所有记录
          </button>
        </nav>
      </div>
    </div>

    <!-- 根据方向或标签页渲染对应组件 -->
    <div class="delegate-records-content">
      <!-- 代理给他人记录 -->
      <DelegateOutRecords
        v-if="shouldShowOutRecords"
        :pool-id="poolId"
        :network-id="networkId"
        :account-id="accountId"
      />

      <!-- 他人代理给自己记录 -->
      <DelegateInRecords
        v-else-if="shouldShowInRecords"
        :pool-id="poolId"
        :network-id="networkId"
        :account-id="accountId"
      />

      <!-- 所有记录（原来的逻辑） -->
      <AllDelegateRecords
        v-else-if="shouldShowAllRecords"
        :pool-id="poolId"
        :network-id="networkId"
        :account-id="accountId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { AllDelegateRecords, DelegateInRecords, DelegateOutRecords } from './DelegateRecords/components';
import type { DelegateDirection } from './DelegateRecords/types/delegate-records.types';

// Props
const props = defineProps<{
  poolId: string      // 实际上是网络ID
  networkId: string   // 网络ID
  accountId: string   // 能量池账户ID
  delegateDirection?: DelegateDirection  // 代理方向：out=代理给他人，in=他人代理给自己
}>()

// 当前激活的标签页（仅在没有指定方向时使用）
const activeTab = ref<'out' | 'in' | 'all'>('out')

// 计算是否应该显示对应的记录组件
const shouldShowOutRecords = computed(() => {
  return props.delegateDirection === 'out' || (!props.delegateDirection && activeTab.value === 'out')
})

const shouldShowInRecords = computed(() => {
  return props.delegateDirection === 'in' || (!props.delegateDirection && activeTab.value === 'in')
})

const shouldShowAllRecords = computed(() => {
  return !props.delegateDirection && activeTab.value === 'all'
})
</script>

<style scoped>
.delegate-records-container {
  @apply w-full;
}

.delegate-records-content {
  @apply w-full;
}
</style>