// import { query } from '../../../../database/index'; // 已移除数据库写入功能
import { TronGridProvider } from '../providers/TronGridProvider';
import type {
    DelegateOperationResult,
    DelegateResourceParams,
    FormattedStakeRecord,
    OperationParams,
    ServiceResponse,
    StakeTransactionParams,
    UndelegateResourceParams
} from '../types/staking.types';

/**
 * 代理操作类
 * 负责处理所有代理相关的操作
 */
export class DelegateOperation {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;

  constructor(params: OperationParams) {
    this.tronWeb = params.tronWeb;
    this.tronGridProvider = new TronGridProvider(params.networkConfig);
  }

  /**
   * 设置网络配置
   */
  setNetworkConfig(config: any): void {
    this.tronGridProvider.setNetworkConfig(config);
  }

  /**
   * 代理资源给其他地址
   */
  async delegateResource(params: DelegateResourceParams): Promise<DelegateOperationResult> {
    try {
      const { ownerAddress, receiverAddress, balance, resource, lock, lockPeriod } = params;

      console.log('🔍 [DelegateOperation] 开始构建delegateResource交易:', {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        lock,
        lockPeriod,
        '地址格式': 'HEX format required (per TRON documentation)',
        '金额格式': 'int64 number format required'
      });

      // 🔧 根据TRON官方文档的一致性原则，使用十六进制地址和数字金额
      const transaction = await this.tronWeb.transactionBuilder.delegateResource(
        this.tronWeb.address.toHex(ownerAddress),     // owner_address (string) - 十六进制地址格式
        this.tronWeb.address.toHex(receiverAddress),  // receiver_address (string) - 十六进制地址格式
        balance,                                      // balance (int64) - 金额，单位为SUN，数字格式
        resource,                                     // resource (string) - ENERGY 或 BANDWIDTH
        lock,                                        // lock (boolean) - 是否锁定
        lockPeriod || 3                              // lock_period (int) - 锁定期，数字格式
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 代理成功（不再存储到数据库，所有数据从TRON网络实时获取）

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used,
          receiverAddress,
          lockPeriod: lockPeriod || 3
        };
      } else {
        return {
          success: false,
          error: result.message || 'Delegate transaction failed'
        };
      }
    } catch (error: any) {
      console.error('Failed to delegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 取消代理资源
   */
  async undelegateResource(params: UndelegateResourceParams): Promise<DelegateOperationResult> {
    try {
      const { ownerAddress, receiverAddress, balance, resource } = params;

      console.log('🔍 [DelegateOperation] 开始构建undelegateResource交易:', {
        ownerAddress,
        receiverAddress,
        balance,
        resource,
        '地址格式': 'HEX format required (per TRON documentation)',
        '金额格式': 'int64 number format required'
      });

      // 🔧 根据TRON官方文档的一致性原则，使用十六进制地址和数字金额
      const transaction = await this.tronWeb.transactionBuilder.undelegateResource(
        this.tronWeb.address.toHex(ownerAddress),     // owner_address (string) - 十六进制地址格式
        this.tronWeb.address.toHex(receiverAddress),  // receiver_address (string) - 十六进制地址格式
        balance,                                      // balance (int64) - 金额，单位为SUN，数字格式
        resource                                     // resource (string) - ENERGY 或 BANDWIDTH
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 取消代理成功（不再存储到数据库，所有数据从TRON网络实时获取）

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used,
          receiverAddress
        };
      } else {
        return {
          success: false,
          error: result.message || 'Undelegate transaction failed'
        };
      }
    } catch (error: any) {
      console.error('Failed to undelegate resource:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取代理交易记录
   */
  async getDelegateTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    try {
      console.log(`[DelegateOperation] 尝试获取地址 ${address} 的代理交易记录`);
      
      let transactions: any[] = [];
      
      // 使用TronGrid API获取代理相关交易
      const transactionsResponse = await this.tronGridProvider.getAccountTransactions(address, limit);
      
      if (transactionsResponse.success && transactionsResponse.data) {
        const allTransactions = transactionsResponse.data;
        console.log(`[DelegateOperation] 获取到所有交易: ${allTransactions.length} 条`);
        
        // 客户端筛选代理相关交易
        const delegateContractTypes = [
          'DelegateResourceContract',
          'UnDelegateResourceContract'
        ];
        
        const filteredTransactions = this.tronGridProvider.filterTransactionsByType(
          allTransactions, 
          delegateContractTypes
        );
        
        console.log(`[DelegateOperation] 筛选出代理相关交易: ${filteredTransactions.length} 条`);
        
        // 按时间戳降序排序并限制数量
        transactions = filteredTransactions
          .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
          .slice(0, limit);
      } else {
        console.warn('[DelegateOperation] TronGrid API获取代理交易失败');
      }

      // 如果没有找到真实的代理记录，返回空数据
      if (transactions.length === 0) {
        console.log('[DelegateOperation] 未找到代理记录');
        return {
          success: true,
          data: [],
          error: '该地址暂无代理记录'
        };
      }

      // 转换为标准格式
      const formattedRecords = this.formatDelegateTransactions(transactions, address);

      console.log(`[DelegateOperation] 成功格式化 ${formattedRecords.length} 条代理交易记录`);

      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('获取代理交易记录失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 格式化代理交易记录
   */
  private formatDelegateTransactions(transactions: any[], address: string): FormattedStakeRecord[] {
    return transactions.map((tx: any) => {
      const contract = tx.raw_data?.contract?.[0];
      const contractType = contract?.type;
      const parameter = contract?.parameter?.value;
      
      // 确定操作类型
      let operationType = 'unknown';
      let resourceType = 'ENERGY';
      let amount = 0;
      let toAddress = '';

      switch (contractType) {
        case 'DelegateResourceContract':
          operationType = 'delegate';
          resourceType = parameter?.resource || 'ENERGY';
          amount = parameter?.balance || 0;
          toAddress = parameter?.receiver_address || '';
          break;
        case 'UnDelegateResourceContract':
          operationType = 'undelegate';
          resourceType = parameter?.resource || 'ENERGY';
          amount = parameter?.balance || 0;
          toAddress = parameter?.receiver_address || '';
          break;
      }

      return {
        id: tx.txID,
        transaction_id: tx.txID,
        pool_id: address,
        address: address,
        amount: amount / 1000000, // 转换为TRX
        resource_type: resourceType as 'ENERGY' | 'BANDWIDTH',
        operation_type: operationType as 'freeze' | 'unfreeze' | 'delegate' | 'undelegate' | 'withdraw',
        status: tx.ret?.[0]?.contractRet === 'SUCCESS' ? 'success' : 'failed',
        created_at: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString(),
        block_number: tx.blockNumber,
        to_address: toAddress,
        fee: tx.ret?.[0]?.fee || 0
      } as FormattedStakeRecord;
    });
  }

  /**
   * 获取账户的代理资源概览
   */
  async getDelegationOverview(address: string): Promise<ServiceResponse<any>> {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      
      // TRON单位转换常量：1 TRX = 1,000,000 sun
      const SUN_TO_TRX = 1000000;
      
      // 获取代理给其他账户的资源
      const delegatedEnergy = parseInt(account.delegated_frozenV2_balance_for_energy) || 0;
      const delegatedBandwidth = parseInt(account.delegated_frozenV2_balance_for_bandwidth) || 0;
      
      // 获取从其他账户接收到的代理资源
      const receivedEnergy = parseInt(account.acquired_delegated_frozenV2_balance_for_energy) || 0;
      const receivedBandwidth = parseInt(account.acquired_delegated_frozenV2_balance_for_bandwidth) || 0;

      console.log(`[DelegateOperation] 获取代理概览 - 地址: ${address}`);
      console.log(`[DelegateOperation] 代理给他人 - 能量: ${delegatedEnergy}, 带宽: ${delegatedBandwidth}`);
      console.log(`[DelegateOperation] 接收代理 - 能量: ${receivedEnergy}, 带宽: ${receivedBandwidth}`);

      return {
        success: true,
        data: {
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
          // 净代理（接收 - 代理出去）
          netDelegation: {
            energy: receivedEnergy - delegatedEnergy,
            bandwidth: receivedBandwidth - delegatedBandwidth,
            totalTrx: ((receivedEnergy + receivedBandwidth) - (delegatedEnergy + delegatedBandwidth)) / SUN_TO_TRX
          }
        }
      };
    } catch (error: any) {
      console.error('Failed to get delegation overview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查可代理的资源
   */
  async getAvailableForDelegation(address: string): Promise<ServiceResponse<any>> {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      
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

      console.log(`[DelegateOperation] 可代理资源 - 地址: ${address}`);
      console.log(`[DelegateOperation] 质押能量: ${stakedEnergy}, 已代理: ${delegatedEnergy}, 可代理: ${availableEnergy}`);
      console.log(`[DelegateOperation] 质押带宽: ${stakedBandwidth}, 已代理: ${delegatedBandwidth}, 可代理: ${availableBandwidth}`);

      return {
        success: true,
        data: {
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
        }
      };
    } catch (error: any) {
      console.error('Failed to get available for delegation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * @deprecated 已移除数据库存储逻辑，所有代理数据从TRON网络实时获取
   * 保留此方法以避免类型错误，但不执行任何操作
   */
  private async recordDelegateTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    console.log('[DelegateOperation] 🔍 recordDelegateTransaction 已废弃 - 所有数据从TRON网络实时获取');
    return { success: true };
  }
}
