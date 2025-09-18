<template>
  <div v-if="realTimeAccountData.realTimeData.value" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    
    <!-- 左上：账户余额概览 -->
    <div class="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 bg-blue-100 rounded-md">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900">账户余额</h3>
            <p class="text-xs text-gray-600">链上实时数据</p>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-xs font-medium text-green-600">实时</span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 gap-2">
        <!-- TRX余额 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-orange-50 rounded-full">
                <svg class="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-600">TRX 余额</p>
                <p class="text-xs text-gray-500">TRON 主币</p>
              </div>
            </div>
            <p class="text-sm font-bold text-orange-600">{{ realTimeAccountData.formatTrx(realTimeAccountData.realTimeData.value.balance || 0) }}</p>
          </div>
        </div>

        <!-- USDT余额 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-green-50 rounded-full">
                <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-600">USDT 余额</p>
                <p class="text-xs text-gray-500">TRC20 代币</p>
              </div>
            </div>
            <p class="text-sm font-bold text-green-600">{{ (realTimeAccountData.realTimeData.value.usdtBalance || 0).toFixed(6) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 右上：质押状态概览 -->
    <div class="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 bg-amber-100 rounded-md">
            <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900">质押状态</h3>
            <p class="text-xs text-gray-600">链上实时数据</p>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-xs font-medium text-green-600">实时</span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 gap-2">
        <!-- 解锁中 TRX -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-yellow-50 rounded-full">
                <svg class="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-600">解锁中 TRX</p>
                <p class="text-xs text-gray-500">正在解质押</p>
              </div>
            </div>
            <p class="text-sm font-bold text-yellow-600">{{ realTimeAccountData.formatStakeTrx(realTimeAccountData.realTimeData.value.stakeStatus?.unlockingTrx || 0) }}</p>
          </div>
        </div>

        <!-- 待提取 TRX -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-purple-50 rounded-full">
                <svg class="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-600">待提取 TRX</p>
                <p class="text-xs text-gray-500">可立即提取</p>
              </div>
            </div>
            <p class="text-sm font-bold text-purple-600">{{ realTimeAccountData.formatStakeTrx(realTimeAccountData.realTimeData.value.stakeStatus?.withdrawableTrx || 0) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 左下：能量资源分布 -->
    <div class="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 bg-green-100 rounded-md">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900">能量资源</h3>
            <p class="text-xs text-gray-600">链上实时数据</p>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-xs font-medium text-green-600">实时</span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 gap-2">
        <!-- 质押获得能量 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-green-50 rounded-full">
                <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">质押获得</p>
            </div>
            <p class="text-sm font-bold text-green-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.limit || 0) }}</p>
          </div>
        </div>

        <!-- 代理给他人能量 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-indigo-50 rounded-full">
                <svg class="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">代理出去</p>
            </div>
            <p class="text-sm font-bold text-indigo-600">{{ realTimeAccountData.formatEnergy(energyCalculator.calculateDelegatedOutEnergy.value) }}</p>
          </div>
        </div>

        <!-- 代理获得能量 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-teal-50 rounded-full">
                <svg class="w-3 h-3 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m6 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">代理获得</p>
            </div>
            <p class="text-sm font-bold text-teal-600">{{ realTimeAccountData.formatEnergy(energyCalculator.calculateDelegatedInEnergy.value) }}</p>
          </div>
        </div>

        <!-- 已使用能量 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-red-50 rounded-full">
                <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">已使用</p>
            </div>
            <p class="text-sm font-bold text-red-600">{{ realTimeAccountData.formatEnergy(realTimeAccountData.realTimeData.value.energy.used || 0) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 右下：带宽资源分布 -->
    <div class="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="p-1.5 bg-purple-100 rounded-md">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900">带宽资源</h3>
            <p class="text-xs text-gray-600">链上实时数据</p>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <div class="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
          <span class="text-xs font-medium text-purple-600">实时</span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 gap-2">
        <!-- 免费带宽 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-green-50 rounded-full">
                <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">每日免费</p>
            </div>
            <p class="text-sm font-bold text-green-600">{{ realTimeAccountData.formatBandwidth(bandwidthCalculator.calculateFreeBandwidth.value) }}</p>
          </div>
        </div>

        <!-- 质押获得带宽 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-orange-50 rounded-full">
                <svg class="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">质押获得</p>
            </div>
            <p class="text-sm font-bold text-orange-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.limit || 0) }}</p>
          </div>
        </div>

        <!-- 代理给他人带宽 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-pink-50 rounded-full">
                <svg class="w-3 h-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">代理出去</p>
            </div>
            <p class="text-sm font-bold text-pink-600">{{ realTimeAccountData.formatBandwidth(bandwidthCalculator.calculateDelegatedOutBandwidth.value) }}</p>
          </div>
        </div>

        <!-- 代理获得带宽 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-cyan-50 rounded-full">
                <svg class="w-3 h-3 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m6 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">代理获得</p>
            </div>
            <p class="text-sm font-bold text-cyan-600">{{ realTimeAccountData.formatBandwidth(bandwidthCalculator.calculateDelegatedInBandwidth.value) }}</p>
          </div>
        </div>

        <!-- 已使用带宽 -->
        <div class="bg-white rounded-md p-2 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="p-1 bg-red-50 rounded-full">
                <svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p class="text-xs font-medium text-gray-600">已使用</p>
            </div>
            <p class="text-sm font-bold text-red-600">{{ realTimeAccountData.formatBandwidth(realTimeAccountData.realTimeData.value.bandwidth.used || 0) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRealTimeAccountData } from '@/composables/useRealTimeAccountData';
import { onMounted, watch } from 'vue';
import { useBandwidthCalculator } from '../composables/useBandwidthCalculator.js';
import { useEnergyCalculator } from '../composables/useEnergyCalculator.js';

// Props
const props = defineProps<{
  address: string;
  networkId?: string;
}>();

// 使用实时账户数据composable
const realTimeAccountData = useRealTimeAccountData();

// 计算器composables - 使用实时数据
const energyCalculator = useEnergyCalculator(realTimeAccountData.realTimeData);
const bandwidthCalculator = useBandwidthCalculator(realTimeAccountData.realTimeData);

// 获取实时数据
const fetchRealTimeData = async () => {
  if (!props.address) return;
  
  console.log('🔍 [StakeStatsGrid] 开始获取实时数据:', {
    address: props.address,
    networkId: props.networkId
  });

  await realTimeAccountData.fetchRealTimeData(props.address, props.networkId, false);
};

// 监听props变化，重新获取数据
watch([() => props.address, () => props.networkId], () => {
  if (props.address) {
    fetchRealTimeData();
  }
}, { immediate: true });

// 组件挂载时获取数据
onMounted(() => {
  if (props.address) {
    fetchRealTimeData();
  }
});
</script>
