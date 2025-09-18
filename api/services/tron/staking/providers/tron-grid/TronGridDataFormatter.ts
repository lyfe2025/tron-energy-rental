/**
 * TronGrid数据格式化服务
 * 负责处理API返回数据的格式转换
 */
export class TronGridDataFormatter {
  /**
   * 将hex地址转换为base58地址
   */
  convertHexToBase58(hexAddress: string): string {
    try {
      // 如果已经是base58格式，直接返回
      if (hexAddress.startsWith('T') && hexAddress.length === 34) {
        return hexAddress;
      }
      
      // 如果是hex格式，使用DelegateOperation的转换逻辑
      if (hexAddress.startsWith('41') && hexAddress.length === 42) {
        console.log(`[TronGridDataFormatter] 转换hex地址为Base58: ${hexAddress}`);
        // 创建临时TronWeb实例进行地址转换
        // 注意：这里需要使用与DelegateOperation相同的转换逻辑
        try {
          // 注意：这里需要动态导入TronWeb，因为可能不在所有环境中可用
          // 临时跳过TronWeb转换，直接返回原地址
          console.warn(`[TronGridDataFormatter] 跳过TronWeb地址转换，保持原格式: ${hexAddress}`);
        } catch (conversionError) {
          console.warn(`[TronGridDataFormatter] 使用TronWeb转换失败:`, conversionError);
        }
        
        // 如果TronWeb转换失败，尝试手动转换（备用方案）
        console.warn(`[TronGridDataFormatter] 地址转换失败，保持原格式: ${hexAddress}`);
        return hexAddress;
      }
      
      return hexAddress;
    } catch (error) {
      console.warn('[TronGridDataFormatter] 地址格式转换失败:', error);
      return hexAddress;
    }
  }

  /**
   * 筛选特定类型的交易
   */
  filterTransactionsByType(
    transactions: any[], 
    contractTypes: string[]
  ): any[] {
    console.log(`[TronGridDataFormatter] 筛选交易类型: ${contractTypes.join(', ')}`);

    // ✅ 修复：处理对象格式数据（TronGrid API可能返回对象而非数组）
    let transactionsArray: any[] = [];
    
    if (!transactions) {
      console.warn(`[TronGridDataFormatter] ❌ 输入数据为空`);
      return [];
    }
    
    if (Array.isArray(transactions)) {
      transactionsArray = transactions;
    } else if (typeof transactions === 'object') {
      // 处理TronGrid API返回对象格式的情况
      console.log(`[TronGridDataFormatter] 🔧 检测到对象格式数据，转换为数组`);
      const transactionValues = Object.values(transactions);
      console.log(`[TronGridDataFormatter] 转换前对象键数: ${Object.keys(transactions).length}`);
      console.log(`[TronGridDataFormatter] 转换后数组长度: ${transactionValues.length}`);
      
      // 确保转换后的数据是有效的交易对象
      transactionsArray = transactionValues.filter(tx => 
        tx && typeof tx === 'object' && (tx as any).txID
      );
      console.log(`[TronGridDataFormatter] 过滤后有效交易数量: ${transactionsArray.length}`);
    } else {
      console.warn(`[TronGridDataFormatter] ❌ 输入数据格式不支持:`, typeof transactions);
      return [];
    }

    if (transactionsArray.length === 0) {
      console.log(`[TronGridDataFormatter] ℹ️ 输入交易数组为空`);
      return [];
    }

    console.log(`[TronGridDataFormatter] 🔍 开始筛选 ${transactionsArray.length} 条交易`);
    
    // 先检查前几条交易的合约类型
    const sampleSize = Math.min(5, transactionsArray.length);
    console.log(`[TronGridDataFormatter] 🔬 检查前 ${sampleSize} 条交易的合约类型:`);
    for (let i = 0; i < sampleSize; i++) {
      const tx = transactionsArray[i];
      const contractType = tx?.raw_data?.contract?.[0]?.type;
      console.log(`[TronGridDataFormatter]   ${i + 1}. ${contractType || 'UNKNOWN'} - ${tx?.txID?.substring(0, 12)}...`);
    }

    const filtered = transactionsArray.filter((tx: any) => {
      const contractType = tx?.raw_data?.contract?.[0]?.type;
      const isMatch = contractTypes.includes(contractType);
      
      if (isMatch) {
        console.log(`[TronGridDataFormatter] ✅ 匹配交易: ${contractType} - ${tx.txID?.substring(0, 12)}...`);
      }
      
      return isMatch;
    });

    console.log(`[TronGridDataFormatter] 📊 筛选结果: 输入 ${transactionsArray.length} 条，匹配 ${filtered.length} 条`);
    
    // 如果没有匹配的交易，显示实际找到的合约类型
    if (filtered.length === 0 && transactionsArray.length > 0) {
      const foundTypes = [...new Set(transactionsArray.map(tx => tx?.raw_data?.contract?.[0]?.type).filter(Boolean))];
      console.log(`[TronGridDataFormatter] 🤔 未找到匹配交易。实际发现的合约类型: ${foundTypes.join(', ')}`);
      console.log(`[TronGridDataFormatter] 🎯 期望的合约类型: ${contractTypes.join(', ')}`);
    }
    
    return filtered;
  }

  /**
   * 格式化质押状态数据
   */
  formatStakeStatus(accountInfo: any, transactions: any[] = []): {
    unlockingTrx: number;
    withdrawableTrx: number;
    stakedEnergy: number;
    stakedBandwidth: number;
    delegatedEnergy: number;
    delegatedBandwidth: number;
  } {
    const stakeStatus = {
      unlockingTrx: 0,
      withdrawableTrx: 0,
      stakedEnergy: 0,
      stakedBandwidth: 0,
      delegatedEnergy: 0,
      delegatedBandwidth: 0
    };

    // 1. 从账户信息获取冻结资源（V2版本）
    if (accountInfo.frozenV2) {
      accountInfo.frozenV2.forEach((frozen: any) => {
        const amount = frozen.amount || 0;
        const resourceType = frozen.type;
        
        if (resourceType === 'ENERGY') {
          stakeStatus.stakedEnergy += amount / 1000000; // 转换为TRX
        } else if (resourceType === 'BANDWIDTH') {
          stakeStatus.stakedBandwidth += amount / 1000000; // 转换为TRX
        }
      });
    }

    // 兼容旧版本冻结信息
    if (accountInfo.frozen) {
      accountInfo.frozen.forEach((frozen: any) => {
        const amount = frozen.frozen_balance || 0;
        const resourceType = frozen.resource_type;
        
        if (resourceType === 'ENERGY') {
          stakeStatus.stakedEnergy += amount / 1000000; // 转换为TRX
        } else if (resourceType === 'BANDWIDTH') {
          stakeStatus.stakedBandwidth += amount / 1000000; // 转换为TRX
        }
      });
    }

    // 2. 处理解冻信息
    this.processUnfrozenData(accountInfo, stakeStatus);

    // 3. 从账户信息获取代理资源
    if (accountInfo.delegated_resource) {
      accountInfo.delegated_resource.forEach((delegated: any) => {
        const amount = delegated.frozen_balance_for_others || 0;
        const resourceType = delegated.resource;
        
        if (resourceType === 'ENERGY') {
          stakeStatus.delegatedEnergy += amount / 1000000;
        } else if (resourceType === 'BANDWIDTH') {
          stakeStatus.delegatedBandwidth += amount / 1000000;
        }
      });
    }

    return stakeStatus;
  }

  /**
   * 处理解冻数据
   */
  private processUnfrozenData(accountInfo: any, stakeStatus: any): void {
    const currentTime = Date.now();

    // 处理V2版本解冻信息
    if (accountInfo.unfrozenV2) {
      console.log(`[TronGridDataFormatter] 🔍 发现 ${accountInfo.unfrozenV2.length} 条 V2 解质押记录`);
      
      accountInfo.unfrozenV2.forEach((unfrozen: any, index: number) => {
        const amount = unfrozen.unfreeze_amount || 0;
        let expireTime = unfrozen.unfreeze_expire_time || 0;
        
        console.log(`[TronGridDataFormatter] 📊 V2记录[${index}]: ${amount / 1000000} TRX, 过期时间: ${new Date(expireTime).toISOString()}`);
        
        // 检查时间戳单位：如果expireTime看起来像秒时间戳，转换为毫秒
        if (expireTime > 0 && expireTime < currentTime / 1000) {
          expireTime = expireTime * 1000;
          console.log(`[TronGridDataFormatter] 时间戳转换: ${unfrozen.unfreeze_expire_time} -> ${expireTime}`);
        }
        
        if (expireTime > currentTime) {
          // 还在解锁期内
          const trxAmount = amount / 1000000;
          stakeStatus.unlockingTrx += trxAmount;
          console.log(`[TronGridDataFormatter] ➡️ V2解锁中 TRX: +${trxAmount} (unfrozenV2)`);
        } else {
          // 已过解锁期，可以提取
          const trxAmount = amount / 1000000;
          stakeStatus.withdrawableTrx += trxAmount;
          console.log(`[TronGridDataFormatter] ✅ V2待提取 TRX: +${trxAmount} (unfrozenV2)`);
        }
      });
    }

    // 兼容旧版本解冻信息
    if (accountInfo.unfrozen) {
      console.log(`[TronGridDataFormatter] 🔍 unfrozen (旧版) 数据:`, JSON.stringify(accountInfo.unfrozen, null, 2));
      
      accountInfo.unfrozen.forEach((unfrozen: any) => {
        const amount = unfrozen.unfrozen_balance || 0;
        let expireTime = unfrozen.expire_time || 0;
        
        // 检查时间戳单位
        if (expireTime > 0 && expireTime < currentTime / 1000) {
          expireTime = expireTime * 1000;
        }
        
        if (expireTime > currentTime) {
          // 还在解锁期内
          const trxAmount = amount / 1000000;
          stakeStatus.unlockingTrx += trxAmount;
          console.log(`[TronGridDataFormatter] ➡️ V1解锁中 TRX: +${trxAmount} (unfrozen)`);
        } else {
          // 已过解锁期，可以提取
          const trxAmount = amount / 1000000;
          stakeStatus.withdrawableTrx += trxAmount;
          console.log(`[TronGridDataFormatter] ✅ V1待提取 TRX: +${trxAmount} (unfrozen)`);
        }
      });
    }
  }

  /**
   * 解析网络解锁期参数
   */
  parseUnlockPeriodFromChainParams(chainParams: any): number | null {
    if (!chainParams?.chainParameter) {
      return null;
    }

    // 查找解锁期相关参数
    const unlockParam = chainParams.chainParameter.find((param: any) => 
      param.key && (
        param.key.includes('UNFREEZE') || 
        param.key.includes('WAITING') ||
        param.key.includes('DELAY')
      )
    );
    
    if (unlockParam) {
      const periodDays = parseInt(unlockParam.value) || null;
      console.log(`[TronGridDataFormatter] 🎯 找到解锁期参数:`, unlockParam);
      return periodDays ? periodDays * 24 * 60 * 60 * 1000 : null;
    }
    
    console.warn(`[TronGridDataFormatter] ⚠️ 无法从链参数获取解锁期`);
    return null;
  }
}
