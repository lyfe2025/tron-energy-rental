/**
 * 带宽计算 Composable
 * 提供各种带宽相关的计算功能
 */
import { computed, type ComputedRef } from 'vue';
import type { Ref } from 'vue';

export function useBandwidthCalculator(realTimeData: Ref<any>) {
  /**
   * 计算免费带宽可用量
   */
  const calculateFreeBandwidth = computed((): number => {
    const bandwidthData = realTimeData.value?.bandwidth;
    if (!bandwidthData) return 0;
    
    // TRON免费带宽通常是600，但使用API返回的数据更准确
    // 免费带宽可用 = 600 - freeUsed
    const freeLimit = 600; // TRON网络免费带宽额度
    const freeUsed = bandwidthData.freeUsed || 0;
    return Math.max(0, freeLimit - freeUsed);
  });

  /**
   * 计算代理出去的带宽
   */
  const calculateDelegatedOutBandwidth = computed((): number => {
    const delegatedOut = realTimeData.value?.bandwidth?.delegatedOut || 0;
    return Math.floor((delegatedOut / 1000000) * 1000);
  });

  /**
   * 计算代理获得的带宽
   */
  const calculateDelegatedInBandwidth = computed((): number => {
    const delegatedIn = realTimeData.value?.bandwidth?.delegatedIn || 0;
    return Math.floor((delegatedIn / 1000000) * 1000);
  });

  return {
    calculateFreeBandwidth,
    calculateDelegatedOutBandwidth,
    calculateDelegatedInBandwidth
  };
}
