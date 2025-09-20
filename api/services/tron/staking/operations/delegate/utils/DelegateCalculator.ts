/**
 * 委托计算工具类
 * 负责处理委托相关的计算和地址转换
 */
export class DelegateCalculator {
  private tronWeb: any;

  constructor(tronWeb: any) {
    this.tronWeb = tronWeb;
  }

  /**
   * 智能地址格式转换
   * 将各种格式的地址转换为Base58格式（T开头）
   */
  convertToBase58Address(address: string): string {
    if (!address) {
      console.log(`[DelegateCalculator] ⚠️ 空地址，返回空字符串`);
      return '';
    }
    
    console.log(`[DelegateCalculator] 🔄 开始转换地址: ${address}`);
    
    try {
      // 如果已经是Base58格式（T开头），直接返回
      if (address.startsWith('T') && address.length === 34) {
        console.log(`[DelegateCalculator] ✅ 已是Base58格式: ${address}`);
        return address;
      }
      
      // 如果是十六进制格式（41开头），转换为Base58
      if (address.startsWith('41') && address.length === 42) {
        const converted = this.tronWeb.address.fromHex(address);
        console.log(`[DelegateCalculator] ✅ 从41开头十六进制转换: ${address} -> ${converted}`);
        return converted;
      }
      
      // 尝试作为十六进制地址转换
      const base58Address = this.tronWeb.address.fromHex(address);
      if (base58Address && base58Address.startsWith('T')) {
        console.log(`[DelegateCalculator] ✅ 十六进制转换成功: ${address} -> ${base58Address}`);
        return base58Address;
      }
      
      // 如果转换失败，记录警告并返回原始地址
      console.warn(`[DelegateCalculator] ❌ 无法转换地址格式: ${address} (长度: ${address.length}, 前缀: ${address.substring(0, 4)})`);
      return address;
      
    } catch (error) {
      console.warn(`[DelegateCalculator] ❌ 地址转换失败: ${address}, 错误:`, error);
      return address;
    }
  }

  /**
   * 计算委托概览数据
   */
  calculateDelegationOverview(account: any): any {
    // TRON单位转换常量：1 TRX = 1,000,000 sun
    const SUN_TO_TRX = 1000000;
    
    // 获取代理给其他账户的资源
    const delegatedEnergy = parseInt(account.delegated_frozenV2_balance_for_energy) || 0;
    const delegatedBandwidth = parseInt(account.delegated_frozenV2_balance_for_bandwidth) || 0;
    
    // 获取从其他账户接收到的代理资源
    const receivedEnergy = parseInt(account.acquired_delegated_frozenV2_balance_for_energy) || 0;
    const receivedBandwidth = parseInt(account.acquired_delegated_frozenV2_balance_for_bandwidth) || 0;

    return {
      // 代理给他人
      delegatedToOthers: {
        energy: delegatedEnergy,
        bandwidth: delegatedBandwidth,
        totalTrx: (delegatedEnergy + delegatedBandwidth) / SUN_TO_TRX
      },
      // 接收到的代理
      receivedFromOthers: {
        energy: receivedEnergy,
        bandwidth: receivedBandwidth,
        totalTrx: (receivedEnergy + receivedBandwidth) / SUN_TO_TRX
      },
      // 净代理（接收 - 代理给他人）
      netDelegation: {
        energy: receivedEnergy - delegatedEnergy,
        bandwidth: receivedBandwidth - delegatedBandwidth,
        totalTrx: ((receivedEnergy + receivedBandwidth) - (delegatedEnergy + delegatedBandwidth)) / SUN_TO_TRX
      }
    };
  }

  /**
   * 计算可代理的资源
   */
  calculateAvailableForDelegation(account: any): any {
    // TRON单位转换常量：1 TRX = 1,000,000 sun
    const SUN_TO_TRX = 1000000;
    
    // 获取质押的资源
    const frozenV2 = account.frozenV2 || [];
    const stakedEnergy = frozenV2
      .filter((f: any) => f.type === 'ENERGY')
      .reduce((sum: number, f: any) => sum + (parseInt(f.amount) || 0), 0);
    const stakedBandwidth = frozenV2
      .filter((f: any) => f.type === 'BANDWIDTH')
      .reduce((sum: number, f: any) => sum + (parseInt(f.amount) || 0), 0);
    
    // 获取已代理的资源
    const delegatedEnergy = parseInt(account.delegated_frozenV2_balance_for_energy) || 0;
    const delegatedBandwidth = parseInt(account.delegated_frozenV2_balance_for_bandwidth) || 0;
    
    // 计算可代理的资源（质押的 - 已代理的）
    const availableEnergy = Math.max(0, stakedEnergy - delegatedEnergy);
    const availableBandwidth = Math.max(0, stakedBandwidth - delegatedBandwidth);

    return {
      available: {
        energy: availableEnergy,
        bandwidth: availableBandwidth,
        totalTrx: (availableEnergy + availableBandwidth) / SUN_TO_TRX
      },
      staked: {
        energy: stakedEnergy,
        bandwidth: stakedBandwidth,
        totalTrx: (stakedEnergy + stakedBandwidth) / SUN_TO_TRX
      },
      delegated: {
        energy: delegatedEnergy,
        bandwidth: delegatedBandwidth,
        totalTrx: (delegatedEnergy + delegatedBandwidth) / SUN_TO_TRX
      }
    };
  }

  /**
   * 获取交易发起者和接收者地址
   */
  extractTransactionAddresses(parameter: any): { ownerAddress: string; receiverAddress: string } {
    console.log(`[DelegateCalculator] 🔍 extractTransactionAddresses - parameter:`, JSON.stringify(parameter));
    console.log(`[DelegateCalculator] 📍 owner_address: ${parameter?.owner_address}, receiver_address: ${parameter?.receiver_address}`);
    
    const ownerAddress = this.convertToBase58Address(parameter?.owner_address || '');
    const receiverAddress = this.convertToBase58Address(parameter?.receiver_address || '');
    
    console.log(`[DelegateCalculator] 🏠 转换结果: ownerAddress=${ownerAddress}, receiverAddress=${receiverAddress}`);
    
    return {
      ownerAddress,
      receiverAddress
    };
  }

  /**
   * 计算交易金额（转换为TRX）
   */
  calculateTransactionAmount(parameter: any): number {
    const amount = parameter?.balance || 0;
    return amount / 1000000; // 转换为TRX
  }
}
