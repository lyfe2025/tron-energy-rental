import { query } from '../../../../database/index';
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
 * 委托操作类
 * 负责处理所有委托相关的操作
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
   * 委托资源给其他地址
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
        // 记录委托到数据库
        await this.recordDelegateTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: balance,
          resourceType: resource,
          operationType: 'delegate',
          fromAddress: ownerAddress,
          toAddress: receiverAddress,
          lockPeriod: lockPeriod || 3
        });

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
   * 取消委托资源
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
        // 记录取消委托到数据库
        await this.recordDelegateTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: balance,
          resourceType: resource,
          operationType: 'undelegate',
          fromAddress: ownerAddress,
          toAddress: receiverAddress
        });

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
   * 获取委托交易记录
   */
  async getDelegateTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedStakeRecord[]>> {
    try {
      console.log(`[DelegateOperation] 尝试获取地址 ${address} 的委托交易记录`);
      
      let transactions: any[] = [];
      
      // 使用TronGrid API获取委托相关交易
      const transactionsResponse = await this.tronGridProvider.getAccountTransactions(address, limit);
      
      if (transactionsResponse.success && transactionsResponse.data) {
        const allTransactions = transactionsResponse.data;
        console.log(`[DelegateOperation] 获取到所有交易: ${allTransactions.length} 条`);
        
        // 客户端筛选委托相关交易
        const delegateContractTypes = [
          'DelegateResourceContract',
          'UnDelegateResourceContract'
        ];
        
        const filteredTransactions = this.tronGridProvider.filterTransactionsByType(
          allTransactions, 
          delegateContractTypes
        );
        
        console.log(`[DelegateOperation] 筛选出委托相关交易: ${filteredTransactions.length} 条`);
        
        // 按时间戳降序排序并限制数量
        transactions = filteredTransactions
          .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
          .slice(0, limit);
      } else {
        console.warn('[DelegateOperation] TronGrid API获取委托交易失败');
      }

      // 如果没有找到真实的委托记录，返回空数据
      if (transactions.length === 0) {
        console.log('[DelegateOperation] 未找到委托记录');
        return {
          success: true,
          data: [],
          error: '该地址暂无委托记录'
        };
      }

      // 转换为标准格式
      const formattedRecords = this.formatDelegateTransactions(transactions, address);

      console.log(`[DelegateOperation] 成功格式化 ${formattedRecords.length} 条委托交易记录`);

      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('获取委托交易记录失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 格式化委托交易记录
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
   * 获取账户的委托资源概览
   */
  async getDelegationOverview(address: string): Promise<ServiceResponse<any>> {
    try {
      const account = await this.tronWeb.trx.getAccount(address);
      
      // TRON单位转换常量：1 TRX = 1,000,000 sun
      const SUN_TO_TRX = 1000000;
      
      // 获取委托给其他账户的资源
      const delegatedEnergy = parseInt(account.delegated_frozenV2_balance_for_energy) || 0;
      const delegatedBandwidth = parseInt(account.delegated_frozenV2_balance_for_bandwidth) || 0;
      
      // 获取从其他账户接收到的委托资源
      const receivedEnergy = parseInt(account.acquired_delegated_frozenV2_balance_for_energy) || 0;
      const receivedBandwidth = parseInt(account.acquired_delegated_frozenV2_balance_for_bandwidth) || 0;

      console.log(`[DelegateOperation] 获取委托概览 - 地址: ${address}`);
      console.log(`[DelegateOperation] 委托给他人 - 能量: ${delegatedEnergy}, 带宽: ${delegatedBandwidth}`);
      console.log(`[DelegateOperation] 接收委托 - 能量: ${receivedEnergy}, 带宽: ${receivedBandwidth}`);

      return {
        success: true,
        data: {
          // 委托给他人
          delegatedToOthers: {
            energy: delegatedEnergy,
            bandwidth: delegatedBandwidth,
            totalTrx: (delegatedEnergy + delegatedBandwidth) / SUN_TO_TRX
          },
          // 接收到的委托
          receivedFromOthers: {
            energy: receivedEnergy,
            bandwidth: receivedBandwidth,
            totalTrx: (receivedEnergy + receivedBandwidth) / SUN_TO_TRX
          },
          // 净委托（接收 - 委托出去）
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
   * 检查可委托的资源
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
      
      // 获取已委托的资源
      const delegatedEnergy = parseInt(account.delegated_frozenV2_balance_for_energy) || 0;
      const delegatedBandwidth = parseInt(account.delegated_frozenV2_balance_for_bandwidth) || 0;
      
      // 计算可委托的资源（质押的 - 已委托的）
      const availableEnergy = Math.max(0, stakedEnergy - delegatedEnergy);
      const availableBandwidth = Math.max(0, stakedBandwidth - delegatedBandwidth);

      console.log(`[DelegateOperation] 可委托资源 - 地址: ${address}`);
      console.log(`[DelegateOperation] 质押能量: ${stakedEnergy}, 已委托: ${delegatedEnergy}, 可委托: ${availableEnergy}`);
      console.log(`[DelegateOperation] 质押带宽: ${stakedBandwidth}, 已委托: ${delegatedBandwidth}, 可委托: ${availableBandwidth}`);

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
   * 记录委托相关交易到数据库
   */
  private async recordDelegateTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (params.operationType === 'delegate' || params.operationType === 'undelegate') {
        // 记录到 delegate_records 表
        await query(
          `INSERT INTO delegate_records 
           (transaction_id, pool_id, from_address, to_address, amount, resource_type, lock_period, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            params.transactionId,
            params.poolId,
            params.fromAddress || params.address,
            params.toAddress || params.address,
            params.amount,
            params.resourceType,
            params.lockPeriod || 3,
            'confirmed'
          ]
        );
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Record delegate transaction error:', error);
      return { success: false, error: error.message };
    }
  }
}
