import type {
  ChainParametersResponse,
  NetworkConfig,
  ServiceResponse,
  TronGridAccountResponse,
  TronGridConfig
} from '../types/staking.types';
import { NetworkProvider } from './NetworkProvider';

/**
 * TronGrid API提供者
 * 负责与TronGrid API的所有通信
 */
export class TronGridProvider {
  private networkProvider: NetworkProvider;

  constructor(networkConfig?: NetworkConfig) {
    this.networkProvider = new NetworkProvider(networkConfig);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: NetworkConfig): void {
    this.networkProvider.setNetworkConfig(config);
  }

  /**
   * 获取TronGrid配置
   */
  private getTronGridConfig(): TronGridConfig {
    return this.networkProvider.getTronGridConfig();
  }

  /**
   * 通用的API请求方法
   */
  private async makeRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const { baseUrl, headers } = this.getTronGridConfig();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    console.log(`[TronGridProvider] 发起API请求: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    console.log(`[TronGridProvider] API响应状态: ${response.status} ${response.statusText}`);
    return response;
  }

  /**
   * 获取账户的所有交易记录
   */
  async getAccountTransactions(
    address: string, 
    limit: number = 20, 
    orderBy: string = 'block_timestamp,desc'
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`[TronGridProvider] 获取账户交易记录: ${address}`);

      const url = `/v1/accounts/${address}/transactions?limit=${Math.min(limit * 10, 200)}&order_by=${orderBy}`;
      const response = await this.makeRequest(url);

      if (response.ok) {
        const data = await response.json();
        const transactions = data.data || [];

        console.log(`[TronGridProvider] 成功获取 ${transactions.length} 条交易记录`);

        return {
          success: true,
          data: transactions
        };
      } else {
        const error = `TronGrid API请求失败: ${response.status} ${response.statusText}`;
        console.warn(`[TronGridProvider] ${error}`);
        return {
          success: false,
          error,
          data: []
        };
      }
    } catch (error: any) {
      console.error('[TronGridProvider] 获取账户交易记录失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 获取账户详细信息
   */
  async getAccountInfo(address: string): Promise<ServiceResponse<TronGridAccountResponse>> {
    try {
      console.log(`[TronGridProvider] 获取账户信息: ${address}`);

      const response = await this.makeRequest('/wallet/getaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          visible: true
        })
      });

      if (response.ok) {
        const accountInfo = await response.json();
        console.log(`[TronGridProvider] 成功获取账户信息`);

        return {
          success: true,
          data: accountInfo
        };
      } else {
        const error = `获取账户信息失败: ${response.status} ${response.statusText}`;
        console.warn(`[TronGridProvider] ${error}`);
        return {
          success: false,
          error
        };
      }
    } catch (error: any) {
      console.error('[TronGridProvider] 获取账户信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取TRON网络链参数
   */
  async getChainParameters(): Promise<ServiceResponse<ChainParametersResponse>> {
    try {
      console.log(`[TronGridProvider] 🔍 查询TRON网络链参数...`);

      const response = await this.makeRequest('/wallet/getchainparameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const chainParams = await response.json();
        console.log(`[TronGridProvider] ✅ 获取到链参数`);

        return {
          success: true,
          data: chainParams
        };
      } else {
        const error = `获取链参数失败: ${response.status} ${response.statusText}`;
        console.warn(`[TronGridProvider] ${error}`);
        return {
          success: false,
          error
        };
      }
    } catch (error: any) {
      console.error('[TronGridProvider] 查询链参数失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 搜索代理给指定地址的交易
   */
  async searchDelegateTransactionsByReceiver(
    receiverAddress: string,
    limit: number = 20
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`[TronGridProvider] 搜索代理给 ${receiverAddress} 的交易`);

      // 由于TRON Grid API的限制，我们使用一种变通的方法：
      // 1. 先通过通用搜索获取最近的代理交易
      // 2. 然后过滤出接收方为指定地址的交易
      
      // 搜索最近的代理合约交易
      const contractTypes = ['DelegateResourceContract', 'UnDelegateResourceContract'];
      const searchPromises = contractTypes.map(contractType => 
        this.searchTransactionsByContract(contractType, Math.ceil(limit / contractTypes.length * 2))
      );

      const searchResults = await Promise.all(searchPromises);
      
      // 合并所有搜索结果
      const allTransactions: any[] = [];
      for (const result of searchResults) {
        if (result.success && result.data) {
          allTransactions.push(...result.data);
        }
      }

      console.log(`[TronGridProvider] 搜索到总计 ${allTransactions.length} 条代理交易`);

      // 过滤出接收方为指定地址的交易
      const filteredTransactions = allTransactions.filter((tx: any) => {
        const contract = tx.raw_data?.contract?.[0];
        const parameter = contract?.parameter?.value;
        
        if (parameter?.receiver_address) {
          // 将hex地址转换为base58格式进行比较
          try {
            const receiverAddressBase58 = this.convertHexToBase58(parameter.receiver_address);
            return receiverAddressBase58.toLowerCase() === receiverAddress.toLowerCase();
          } catch (error) {
            console.warn('[TronGridProvider] 地址转换失败:', error);
            return false;
          }
        }
        
        return false;
      });

      // 按时间戳排序并限制数量
      const sortedTransactions = filteredTransactions
        .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
        .slice(0, limit);

      console.log(`[TronGridProvider] 过滤后得到 ${sortedTransactions.length} 条目标交易`);

      return {
        success: true,
        data: sortedTransactions
      };
    } catch (error: any) {
      console.error('[TronGridProvider] 搜索接收方交易失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 根据合约类型搜索交易
   */
  private async searchTransactionsByContract(
    contractType: string,
    limit: number = 50
  ): Promise<ServiceResponse<any[]>> {
    try {
      // 使用TronGrid的合约事件搜索API
      const url = `/v1/transactions?contract_type=${contractType}&limit=${limit}&order_by=block_timestamp,desc`;
      const response = await this.makeRequest(url);

      if (response.ok) {
        const data = await response.json();
        const transactions = data.data || [];

        console.log(`[TronGridProvider] 找到 ${transactions.length} 条 ${contractType} 交易`);

        return {
          success: true,
          data: transactions
        };
      } else {
        const error = `搜索 ${contractType} 交易失败: ${response.status} ${response.statusText}`;
        console.warn(`[TronGridProvider] ${error}`);
        return {
          success: false,
          error,
          data: []
        };
      }
    } catch (error: any) {
      console.error(`[TronGridProvider] 搜索 ${contractType} 交易失败:`, error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 将hex地址转换为base58地址
   */
  private convertHexToBase58(hexAddress: string): string {
    try {
      // 如果已经是base58格式，直接返回
      if (hexAddress.startsWith('T') && hexAddress.length === 34) {
        return hexAddress;
      }
      
      // 如果是hex格式，使用DelegateOperation的转换逻辑
      if (hexAddress.startsWith('41') && hexAddress.length === 42) {
        console.log(`[TronGridProvider] 转换hex地址为Base58: ${hexAddress}`);
        // 创建临时TronWeb实例进行地址转换
        // 注意：这里需要使用与DelegateOperation相同的转换逻辑
        try {
          // 使用标准的TRON地址转换方法
          const TronWeb = require('tronweb');
          const base58Address = TronWeb.address.fromHex(hexAddress);
          if (base58Address && base58Address.startsWith('T')) {
            console.log(`[TronGridProvider] 转换成功: ${hexAddress} -> ${base58Address}`);
            return base58Address;
          }
        } catch (conversionError) {
          console.warn(`[TronGridProvider] 使用TronWeb转换失败:`, conversionError);
        }
        
        // 如果TronWeb转换失败，尝试手动转换（备用方案）
        console.warn(`[TronGridProvider] 地址转换失败，保持原格式: ${hexAddress}`);
        return hexAddress;
      }
      
      return hexAddress;
    } catch (error) {
      console.warn('[TronGridProvider] 地址格式转换失败:', error);
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
    console.log(`[TronGridProvider] 筛选交易类型: ${contractTypes.join(', ')}`);

    const filtered = transactions.filter((tx: any) => {
      const contractType = tx.raw_data?.contract?.[0]?.type;
      const isMatch = contractTypes.includes(contractType);
      
      if (isMatch) {
        console.log(`[TronGridProvider] ✅ 匹配交易: ${contractType} - ${tx.txID?.substring(0, 12)}...`);
      }
      
      return isMatch;
    });

    console.log(`[TronGridProvider] 筛选出 ${filtered.length} 条匹配交易`);
    return filtered;
  }

  /**
   * 获取账户质押状态 - 包含解锁中和待提取的TRX
   */
  async getAccountStakeStatus(address: string): Promise<ServiceResponse<{
    unlockingTrx: number;
    withdrawableTrx: number;
    stakedEnergy: number;
    stakedBandwidth: number;
    delegatedEnergy: number;
    delegatedBandwidth: number;
  }>> {
    try {
      console.log(`[TronGridProvider] 🔍 获取账户质押状态: ${address}`);

      // 并行获取账户信息和交易记录
      const [accountInfoResponse, transactionsResponse] = await Promise.all([
        this.getAccountInfo(address),
        this.getAccountTransactions(address, 50)
      ]);

      if (!accountInfoResponse.success || !accountInfoResponse.data) {
        return {
          success: false,
          error: '获取账户信息失败',
          data: {
            unlockingTrx: 0,
            withdrawableTrx: 0,
            stakedEnergy: 0,
            stakedBandwidth: 0,
            delegatedEnergy: 0,
            delegatedBandwidth: 0
          }
        };
      }

      const accountInfo = accountInfoResponse.data;
      
      console.log(`[TronGridProvider] 🔍 开始分析账户质押状态 - 地址: ${address}`);
      
      // 计算质押状态数据
      const stakeStatus = {
        unlockingTrx: 0,
        withdrawableTrx: 0,
        stakedEnergy: 0,
        stakedBandwidth: 0,
        delegatedEnergy: 0,
        delegatedBandwidth: 0
      };

      // 1. 从账户信息获取冻结资源（V2版本）
      if ((accountInfo as any).frozenV2) {
        (accountInfo as any).frozenV2.forEach((frozen: any) => {
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
      if ((accountInfo as any).frozen) {
        (accountInfo as any).frozen.forEach((frozen: any) => {
          const amount = frozen.frozen_balance || 0;
          const resourceType = frozen.resource_type;
          
          if (resourceType === 'ENERGY') {
            stakeStatus.stakedEnergy += amount / 1000000; // 转换为TRX
          } else if (resourceType === 'BANDWIDTH') {
            stakeStatus.stakedBandwidth += amount / 1000000; // 转换为TRX
          }
        });
      }

      // 2. 从账户信息获取待提取资源（V2版本）
      if ((accountInfo as any).unfrozenV2) {
        const currentTime = Date.now();
        console.log(`[TronGridProvider] 🔍 发现 ${(accountInfo as any).unfrozenV2.length} 条 V2 解质押记录`);
        
        (accountInfo as any).unfrozenV2.forEach((unfrozen: any, index: number) => {
          const amount = unfrozen.unfreeze_amount || 0;  // 修复：应该是 unfreeze_amount 而不是 amount
          let expireTime = unfrozen.unfreeze_expire_time || 0;
          
          console.log(`[TronGridProvider] 📊 V2记录[${index}]: ${amount / 1000000} TRX, 过期时间: ${new Date(expireTime).toISOString()}`);
          
          // 检查时间戳单位：如果expireTime看起来像秒时间戳（小于当前毫秒时间戳的1/1000），转换为毫秒
          if (expireTime > 0 && expireTime < currentTime / 1000) {
            expireTime = expireTime * 1000;
            console.log(`[TronGridProvider] 时间戳转换: ${unfrozen.unfreeze_expire_time} -> ${expireTime}`);
          }
          
          if (expireTime > currentTime) {
            // 还在解锁期内
            const trxAmount = amount / 1000000;
            stakeStatus.unlockingTrx += trxAmount;
            console.log(`[TronGridProvider] ➡️ V2解锁中 TRX: +${trxAmount} (unfrozenV2)`);
          } else {
            // 已过解锁期，可以提取
            const trxAmount = amount / 1000000;
            stakeStatus.withdrawableTrx += trxAmount;
            console.log(`[TronGridProvider] ✅ V2待提取 TRX: +${trxAmount} (unfrozenV2)`);
          }
        });
      }

      // 兼容旧版本解冻信息
      if ((accountInfo as any).unfrozen) {
        const currentTime = Date.now();
        console.log(`[TronGridProvider] 🔍 unfrozen (旧版) 数据:`, JSON.stringify((accountInfo as any).unfrozen, null, 2));
        
        (accountInfo as any).unfrozen.forEach((unfrozen: any) => {
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
            console.log(`[TronGridProvider] ➡️ V1解锁中 TRX: +${trxAmount} (unfrozen)`);
          } else {
            // 已过解锁期，可以提取
            const trxAmount = amount / 1000000;
            stakeStatus.withdrawableTrx += trxAmount;
            console.log(`[TronGridProvider] ✅ V1待提取 TRX: +${trxAmount} (unfrozen)`);
          }
        });
      }

      // 3. 从账户信息获取代理资源
      if ((accountInfo as any).delegated_resource) {
        (accountInfo as any).delegated_resource.forEach((delegated: any) => {
          const amount = delegated.frozen_balance_for_others || 0;
          const resourceType = delegated.resource;
          
          if (resourceType === 'ENERGY') {
            stakeStatus.delegatedEnergy += amount / 1000000;
          } else if (resourceType === 'BANDWIDTH') {
            stakeStatus.delegatedBandwidth += amount / 1000000;
          }
        });
      }

      // 4. 如果账户信息中没有足够的数据，从交易记录中补充分析
      // 但如果账户信息中已经有unfrozenV2数据，就不需要再从交易记录分析了（避免重复计算）
      const hasAccountUnfrozenData = !!(accountInfo as any).unfrozenV2 || !!(accountInfo as any).unfrozen;
      console.log(`[TronGridProvider] 🔍 是否有账户解质押数据: ${hasAccountUnfrozenData}`);
      
      if (!hasAccountUnfrozenData && transactionsResponse.success && transactionsResponse.data) {
        const transactions = transactionsResponse.data;
        
        for (const tx of transactions) {
          if (!tx.raw_data?.contract?.[0]) continue;
          
          const contract = tx.raw_data.contract[0];
          const contractType = contract.type;
          const parameter = contract.parameter?.value;
          
          if (!parameter) continue;

          // 处理解冻交易，计算解锁中的TRX
          if (contractType === 'UnfreezeBalanceV2Contract') {
            const unfreezeAmount = parameter.unfreeze_balance || 0;
            const resourceType = parameter.resource;
            const txTime = tx.block_timestamp || 0;
            
            // TRON V2 解冻需要14天等待期
            const waitingPeriod = 14 * 24 * 60 * 60 * 1000; // 14天
            const unlockTime = txTime + waitingPeriod;
            const currentTime = Date.now();
            
            if (unlockTime > currentTime) {
              // 仍在等待期内
              const amount = unfreezeAmount / 1000000;
              stakeStatus.unlockingTrx += amount;
              console.log(`[TronGridProvider] ➡️ 交易记录解锁中 TRX: +${amount} (transaction)`);
            } else {
              // 等待期已过，可提取
              const amount = unfreezeAmount / 1000000;
              stakeStatus.withdrawableTrx += amount;
              console.log(`[TronGridProvider] ✅ 交易记录待提取 TRX: +${amount} (transaction)`);
            }
          }
        }
      }

      console.log(`[TronGridProvider] ✅ 质押状态计算完成:`, stakeStatus);

      return {
        success: true,
        data: stakeStatus
      };
    } catch (error: any) {
      console.error('[TronGridProvider] 获取账户质押状态失败:', error);
      return {
        success: false,
        error: error.message,
        data: {
          unlockingTrx: 0,
          withdrawableTrx: 0,
          stakedEnergy: 0,
          stakedBandwidth: 0,
          delegatedEnergy: 0,
          delegatedBandwidth: 0
        }
      };
    }
  }

  /**
   * 获取网络解锁期参数
   */
  async getNetworkUnlockPeriod(): Promise<number | null> {
    try {
      const chainParamsResponse = await this.getChainParameters();
      
      if (!chainParamsResponse.success || !chainParamsResponse.data) {
        return null;
      }

      const chainParams = chainParamsResponse.data;
      
      // 查找解锁期相关参数
      const unlockParam = chainParams.chainParameter?.find((param: any) => 
        param.key && (
          param.key.includes('UNFREEZE') || 
          param.key.includes('WAITING') ||
          param.key.includes('DELAY')
        )
      );
      
      if (unlockParam) {
        const periodDays = parseInt(unlockParam.value) || null;
        console.log(`[TronGridProvider] 🎯 找到解锁期参数:`, unlockParam);
        return periodDays ? periodDays * 24 * 60 * 60 * 1000 : null;
      }
      
      console.warn(`[TronGridProvider] ⚠️ 无法从链参数获取解锁期`);
      return null;
      
    } catch (error: any) {
      console.error('[TronGridProvider] 查询网络解锁期失败:', error);
      return null;
    }
  }

  /**
   * 写入调试日志到文件
   */
  writeDebugLog(content: string): void {
    try {
      const { appendFileSync } = require('fs');
      const timestamp = new Date().toISOString();
      appendFileSync('/tmp/tron-debug.log', `[${timestamp}] ${content}\n`);
    } catch (error) {
      console.warn('[TronGridProvider] 写入调试日志失败:', error);
    }
  }

  /**
   * 获取网络信息
   */
  getNetworkInfo(): {
    name: string;
    id: string;
    isTestNet: boolean;
    isValid: boolean;
  } {
    return {
      name: this.networkProvider.getNetworkName(),
      id: this.networkProvider.getNetworkId(),
      isTestNet: this.networkProvider.isTestNet(),
      isValid: this.networkProvider.isConfigValid()
    };
  }
}
