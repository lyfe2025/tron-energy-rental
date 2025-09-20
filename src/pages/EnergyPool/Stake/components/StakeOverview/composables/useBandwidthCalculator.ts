/**
 * 带宽计算 Composable
 * 提供各种带宽相关的计算功能
 */
import type { Ref } from 'vue';
import { computed } from 'vue';

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
   * 计算代理给他人的带宽
   * ✅ 修正：直接使用后端返回的delegation.bandwidthOut值（已通过TRON网络动态公式计算）
   */
  const calculateDelegatedOutBandwidth = computed((): number => {
    // ✅ 优先使用后端计算好的delegation数据（正确的TRON网络动态计算结果）
    const delegationOut = realTimeData.value?.delegation?.bandwidthOut;
    console.log('🔍 [useBandwidthCalculator] delegation数据:', {
      'delegation.bandwidthOut': delegationOut,
      'delegation对象': realTimeData.value?.delegation
    });
    
    if (delegationOut !== undefined && delegationOut !== null) {
      // ✅ 按TRON官方规则：大数值除以1000000显示简化版本
      const simplifiedValue = Math.floor(delegationOut / 1000000);
      console.log('🔍 [useBandwidthCalculator] 计算结果:', {
        '原始值': delegationOut,
        '简化值': simplifiedValue,
        '计算公式': `Math.floor(${delegationOut} / 1000000) = ${simplifiedValue}`
      });
      return simplifiedValue;
    }
    
    // 回退：如果delegation数据不可用，直接处理原始数据
    const delegatedOut = realTimeData.value?.bandwidth?.delegatedOut || 0;
    console.log('🚨 [useBandwidthCalculator] 使用回退逻辑:', {
      '原始bandwidth.delegatedOut': delegatedOut,
      '计算结果': Math.floor(delegatedOut / 1000000)
    });
    return Math.floor(delegatedOut / 1000000); // ✅ 修正：直接除以1000000
  });

  /**
   * 计算他人代理给自己的带宽
   * ✅ 修正：直接使用后端返回的delegation.bandwidthIn值（已通过TRON网络动态公式计算）
   */
  const calculateDelegatedInBandwidth = computed((): number => {
    // 优先使用后端计算好的delegation数据（正确的TRON网络动态计算结果）
    const delegationIn = realTimeData.value?.delegation?.bandwidthIn;
    if (delegationIn !== undefined && delegationIn !== null) {
      return delegationIn;
    }
    
    // 回退：如果delegation数据不可用，直接处理原始数据
    const delegatedIn = realTimeData.value?.bandwidth?.delegatedIn || 0;
    return Math.floor(delegatedIn / 1000000); // ✅ 修正：直接除以1000000
  });

  return {
    calculateFreeBandwidth,
    calculateDelegatedOutBandwidth,
    calculateDelegatedInBandwidth
  };
}
