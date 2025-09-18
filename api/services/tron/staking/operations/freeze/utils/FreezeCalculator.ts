/**
 * 质押计算工具类
 * 负责处理质押相关的计算和地址转换
 */
export class FreezeCalculator {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  /**
   * 智能地址格式转换 - 统一转换为Base58格式（T开头）
   */
  convertToBase58Address(address: string): string {
    if (!address) return '';
    
    try {
      // 如果已经是Base58格式（T开头），直接返回
      if (address.startsWith('T') && address.length === 34) {
        return address;
      }
      
      // 如果是十六进制格式（41开头），转换为Base58
      if (address.startsWith('41') && address.length === 42) {
        return this.tronWeb.address.fromHex(address);
      }
      
      // 尝试作为十六进制地址转换
      const base58Address = this.tronWeb.address.fromHex(address);
      if (base58Address && base58Address.startsWith('T')) {
        return base58Address;
      }
      
      // 如果转换失败，记录警告并返回原始地址
      console.warn('[FreezeCalculator] 地址转换失败:', address);
      return address;
      
    } catch (error) {
      console.warn('[FreezeCalculator] 地址转换异常:', error);
      return address;
    }
  }

  /**
   * 计算质押统计数据
   */
  calculateStakeStats(account: any, resources: any): any {
    // TRON单位转换常量：1 TRX = 1,000,000 sun
    const SUN_TO_TRX = 1000000;
    
    // 获取质押信息（frozenV2字段包含质押2.0数据）
    const frozenV2 = account.frozenV2 || [];
    
    // 分别计算能量和带宽的质押TRX
    let totalStakedEnergyTrx = 0;
    let totalStakedBandwidthTrx = 0;
    
    frozenV2.forEach((f: any) => {
      const amount = parseInt(f.amount) || 0;
      if (f.type === 'ENERGY') {
        totalStakedEnergyTrx += amount;
      } else if (f.type === 'BANDWIDTH') {
        totalStakedBandwidthTrx += amount;
      } else if (!f.type && amount > 0) {
        // 如果没有type字段但有amount，通常是带宽质押（旧版本质押）
        totalStakedBandwidthTrx += amount;
      } else if (f.type === 'TRON_POWER' && amount > 0) {
        // TRON_POWER质押通常对应带宽
        totalStakedBandwidthTrx += amount;
      }
    });
    
    // 计算总质押TRX（能量+带宽）
    const totalStakedTrx = (totalStakedEnergyTrx + totalStakedBandwidthTrx) / SUN_TO_TRX;
    
    // 获取委托信息（委托给其他账户的资源）
    const delegatedResources = parseInt(account.delegated_frozenV2_balance_for_energy) || 0;
    const delegatedBandwidth = parseInt(account.delegated_frozenV2_balance_for_bandwidth) || 0;
    
    // 获取接收到的委托资源（从其他账户委托给自己的资源）
    const receivedEnergyDelegation = parseInt(account.acquired_delegated_frozenV2_balance_for_energy) || 0;
    const receivedBandwidthDelegation = parseInt(account.acquired_delegated_frozenV2_balance_for_bandwidth) || 0;
    
    return {
      totalStakedEnergyTrx,
      totalStakedBandwidthTrx,
      totalStakedTrx,
      delegatedResources,
      delegatedBandwidth,
      receivedEnergyDelegation,
      receivedBandwidthDelegation,
      SUN_TO_TRX
    };
  }

  /**
   * 计算解质押统计数据
   */
  calculateUnfreezeStats(account: any): any {
    const SUN_TO_TRX = 1000000;
    
    // 获取待解质押信息（unfrozenV2字段包含解质押数据）
    const unfrozenV2 = account.unfrozenV2 || [];
    const currentTime = Date.now(); // 使用毫秒时间戳进行比较
    
    const pendingUnfreeze = unfrozenV2
      .filter((u: any) => {
        const expireTime = parseInt(u.unfreeze_expire_time);
        return expireTime > currentTime;
      })
      .reduce((sum: number, u: any) => sum + (parseInt(u.unfreeze_amount) || 0), 0);
    
    // 获取可提取金额（已过期的解质押金额）
    const withdrawableAmount = unfrozenV2
      .filter((u: any) => {
        const expireTime = parseInt(u.unfreeze_expire_time);
        return expireTime <= currentTime;
      })
      .reduce((sum: number, u: any) => sum + (parseInt(u.unfreeze_amount) || 0), 0);

    return {
      pendingUnfreeze,
      withdrawableAmount,
      SUN_TO_TRX
    };
  }

  /**
   * 格式化质押统计结果
   */
  formatStakeOverview(stats: any, unfreezeStats: any, resources: any): any {
    const {
      totalStakedEnergyTrx,
      totalStakedBandwidthTrx,
      totalStakedTrx,
      delegatedResources,
      delegatedBandwidth,
      receivedEnergyDelegation,
      receivedBandwidthDelegation,
      SUN_TO_TRX
    } = stats;

    const { pendingUnfreeze, withdrawableAmount } = unfreezeStats;

    // 计算质押获得的资源（自己质押获得的资源）
    const actualEnergyFromStaking = Math.max(0, totalStakedEnergyTrx);
    const actualBandwidthFromStaking = Math.max(0, totalStakedBandwidthTrx);
    
    // ✅ 修正：使用TRON网络动态计算公式计算实际代理带宽
    // 公式：带宽 = (质押SUN / 全网总权重) × 全网总带宽
    const totalNetWeight = resources.TotalNetWeight || 1; // 避免除零错误
    const totalNetLimit = resources.TotalNetLimit || 0;
    
    const delegatedBandwidthValue = totalNetWeight > 0 ? 
      Math.floor((delegatedBandwidth / totalNetWeight) * totalNetLimit) : 0;
    const receivedBandwidthDelegationValue = totalNetWeight > 0 ? 
      Math.floor((receivedBandwidthDelegation / totalNetWeight) * totalNetLimit) : 0;
      
    console.log('🔧 [FreezeCalculator] 代理带宽计算:', {
      '原始delegatedBandwidth_SUN': delegatedBandwidth,
      '计算后delegatedBandwidthValue': delegatedBandwidthValue,
      '计算公式': `(${delegatedBandwidth} / ${totalNetWeight}) * ${totalNetLimit} = ${delegatedBandwidthValue}`
    });

    return {
      // 新的9个统计字段
      totalStakedTrx: totalStakedTrx,
      totalStakedEnergyTrx: totalStakedEnergyTrx / SUN_TO_TRX,
      totalStakedBandwidthTrx: totalStakedBandwidthTrx / SUN_TO_TRX,
      unlockingTrx: pendingUnfreeze / SUN_TO_TRX,
      withdrawableTrx: withdrawableAmount / SUN_TO_TRX,
      stakedEnergy: actualEnergyFromStaking,
      delegatedToOthersEnergy: delegatedResources,
      delegatedToSelfEnergy: receivedEnergyDelegation,
      stakedBandwidth: actualBandwidthFromStaking,
      delegatedToOthersBandwidth: delegatedBandwidthValue, // ✅ 使用计算后的带宽值
      delegatedToSelfBandwidth: receivedBandwidthDelegationValue, // ✅ 使用计算后的带宽值
      
      // 保留原有字段以保持向后兼容性
      totalStaked: totalStakedTrx,
      totalDelegated: (delegatedResources + delegatedBandwidth) / SUN_TO_TRX,
      totalUnfreezing: pendingUnfreeze / SUN_TO_TRX,
      availableToWithdraw: withdrawableAmount / SUN_TO_TRX,
      stakingRewards: 0, // 暂时设为0，后续可以实现真实的奖励计算
      delegationRewards: 0, // 暂时设为0，后续可以实现真实的奖励计算
      // 保留原有字段以保持向后兼容性（能量和带宽不需要转换单位）
      availableEnergy: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0),
      availableBandwidth: (resources.NetLimit || 0) - (resources.NetUsed || 0),
      pendingUnfreeze: pendingUnfreeze / SUN_TO_TRX,
      withdrawableAmount: withdrawableAmount / SUN_TO_TRX
    };
  }
}
