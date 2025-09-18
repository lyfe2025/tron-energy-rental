/**
 * 能量计算 Composable
 * 提供各种能量相关的计算功能
 */
import { computed } from 'vue';
import type { Ref } from 'vue';

export function useEnergyCalculator(realTimeData: Ref<any>) {
  /**
   * 计算代理出去的能量
   */
  const calculateDelegatedOutEnergy = computed((): number => {
    const delegatedOut = realTimeData.value?.energy?.delegatedOut || 0;
    return Math.floor((delegatedOut / 1000000) * 76.2);
  });

  /**
   * 计算代理获得的能量
   */
  const calculateDelegatedInEnergy = computed((): number => {
    const delegatedIn = realTimeData.value?.energy?.delegatedIn || 0;
    return Math.floor((delegatedIn / 1000000) * 76.2);
  });

  /**
   * 获取能量统计信息
   */
  const energyStats = computed(() => {
    const energy = realTimeData.value?.energy;
    if (!energy) return null;

    return {
      total: energy.total || 0,
      available: energy.available || 0,
      limit: energy.limit || 0,
      used: energy.used || 0,
      delegatedOut: calculateDelegatedOutEnergy.value,
      delegatedIn: calculateDelegatedInEnergy.value
    };
  });

  return {
    calculateDelegatedOutEnergy,
    calculateDelegatedInEnergy,
    energyStats
  };
}
