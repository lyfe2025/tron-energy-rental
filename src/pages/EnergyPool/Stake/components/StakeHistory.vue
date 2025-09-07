<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8 px-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="$emit('changeTab', tab.key)"
          :class="[
            'py-4 px-1 border-b-2 font-medium text-sm',
            activeTab === tab.key
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <div class="p-6">
      <!-- 质押记录 -->
      <div v-if="activeTab === 'stake' && selectedAccount">
        <StakeRecords :pool-id="selectedAccount.id" :network-id="currentNetworkId" />
      </div>

      <!-- 委托记录 -->
      <div v-if="activeTab === 'delegate' && selectedAccount">
        <DelegateRecords :pool-id="selectedAccount.id" :network-id="currentNetworkId" />
      </div>

      <!-- 解质押记录 -->
      <div v-if="activeTab === 'unfreeze' && selectedAccount">
        <UnfreezeRecords :pool-id="selectedAccount.id" :network-id="currentNetworkId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI';
import DelegateRecords from '../../components/DelegateRecords.vue';
import StakeRecords from '../../components/StakeRecords.vue';
import UnfreezeRecords from '../../components/UnfreezeRecords.vue';

// Props
defineProps<{
  activeTab: string
  selectedAccount?: EnergyPoolAccount | null
  currentNetworkId: string
  tabs: Array<{ key: string; label: string }>
}>()

// Events
defineEmits<{
  changeTab: [tabKey: string]
}>()
</script>
