<template>
  <div>
    <!-- 当前选中账户信息 -->
    <div v-if="selectedAccount && showAccountSection !== false" class="mb-6">
      <AccountInfoCard 
        :selected-account="selectedAccount"
        :real-time-account-data="realTimeAccountData"
        :format-energy="formatEnergy"
        :format-bandwidth="formatBandwidth"
        @switch-account="$emit('switchAccount')"
        @refresh-data="refreshRealTimeData"
      />
    </div>

    <!-- 网络状态栏 -->
    <div v-if="currentNetwork && showNetworkSection !== false" class="mb-6">
      <NetworkStatusCard 
        :current-network="currentNetwork"
        @toggle-network-switcher="$emit('toggleNetworkSwitcher')"
      />
    </div>

    <!-- 质押概览统计 - 2x2 网格布局 -->
    <div v-if="selectedAccount?.tron_address && showOverviewSection !== false" class="mb-6">
      <StakeStatsGrid 
        :address="selectedAccount.tron_address"
        :network-id="currentNetwork?.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRealTimeAccountData } from '@/composables/useRealTimeAccountData';
import type { EnergyPoolAccount } from '@/services/api/energy-pool/energyPoolExtendedAPI';
import { watch } from 'vue';

import AccountInfoCard from './components/AccountInfoCard.vue';
import NetworkStatusCard from './components/NetworkStatusCard.vue';
import StakeStatsGrid from './components/StakeStatsGrid.vue';

import type { TronNetwork } from '@/types/network';

type NetworkStoreNetwork = TronNetwork;

// Props
const props = defineProps<{
  selectedAccount?: EnergyPoolAccount | null;
  currentNetwork?: NetworkStoreNetwork | null;
  formatTrx: (value: any) => string;
  formatEnergy: (value: any) => string;
  formatBandwidth: (value: any) => string;
  formatAddress: (address: string) => string;
  showAccountSection?: boolean;
  showNetworkSection?: boolean;
  showOverviewSection?: boolean;
}>();

// Events
defineEmits<{
  switchAccount: [];
  toggleNetworkSwitcher: [];
}>();

// 使用实时账户数据composable
const realTimeAccountData = useRealTimeAccountData();

// 刷新实时数据
const refreshRealTimeData = async () => {
  if (props.selectedAccount?.tron_address) {
    console.log('🔄 [StakeOverview] 刷新实时数据（包含质押状态）');
    await realTimeAccountData.fetchRealTimeData(
      props.selectedAccount.tron_address,
      props.currentNetwork?.id,
      true, // showToast
      true  // includeStakeStatus
    );
  }
};

// 单独刷新质押状态
const refreshStakeStatus = async () => {
  if (props.selectedAccount?.tron_address) {
    console.log('🔄 [StakeOverview] 刷新质押状态');
    await realTimeAccountData.fetchStakeStatus(
      props.selectedAccount.tron_address,
      props.currentNetwork?.id
    );
  }
};

// 监听选中账户变化，自动获取实时数据
watch(
  () => props.selectedAccount,
  async (newAccount) => {
    if (newAccount?.tron_address) {
      console.log('🔍 [StakeOverview] 账户变化，获取实时数据:', newAccount.name);
      await realTimeAccountData.fetchRealTimeData(
        newAccount.tron_address,
        props.currentNetwork?.id,
        false // 不显示错误提示，避免干扰用户体验
      );
    } else {
      realTimeAccountData.clearData();
    }
  },
  { immediate: true }
);

// 监听网络变化，重新获取实时数据
watch(
  () => props.currentNetwork?.id,
  async (newNetworkId) => {
    if (newNetworkId && props.selectedAccount?.tron_address) {
      console.log('🔍 [StakeOverview] 网络变化，重新获取实时数据:', newNetworkId);
      await realTimeAccountData.fetchRealTimeData(
        props.selectedAccount.tron_address,
        newNetworkId,
        false
      );
    }
  }
);
</script>
