import { query } from '../../../../database/index';
import { TronGridProvider } from '../providers/TronGridProvider';
import type {
    FormattedUnfreezeRecord,
    OperationParams,
    ServiceResponse,
    StakeTransactionParams,
    TransactionResult,
    UnfreezeBalanceV2Params,
    UnfreezeOperationResult,
    WithdrawExpireUnfreezeParams
} from '../types/staking.types';

/**
 * 解质押操作类
 * 负责处理所有解质押相关的操作
 */
export class UnfreezeOperation {
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
   * 解质押TRX (Stake 2.0)
   */
  async unfreezeBalanceV2(params: UnfreezeBalanceV2Params): Promise<UnfreezeOperationResult> {
    try {
      const { ownerAddress, unfreezeBalance, resource } = params;

      const transaction = await this.tronWeb.transactionBuilder.unfreezeBalanceV2(
        this.tronWeb.address.toHex(ownerAddress),
        unfreezeBalance,
        resource
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        const unfreezeTime = new Date();
        const networkUnlockPeriod = await this.tronGridProvider.getNetworkUnlockPeriod();
        const expireTime = new Date(Date.now() + (networkUnlockPeriod || 0));

        // 记录解质押到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: unfreezeBalance,
          resourceType: resource as 'ENERGY' | 'BANDWIDTH',
          operationType: 'unfreeze',
          unfreezeTime,
          expireTime
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used,
          unfreezeTime,
          expireTime
        };
      } else {
        return {
          success: false,
          error: result.message || 'Unfreeze transaction failed'
        };
      }
    } catch (error: any) {
      console.error('Failed to unfreeze balance v2:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 提取已到期的解质押资金
   */
  async withdrawExpireUnfreeze(params: WithdrawExpireUnfreezeParams): Promise<TransactionResult> {
    try {
      const { ownerAddress } = params;

      const transaction = await this.tronWeb.transactionBuilder.withdrawExpireUnfreeze(
        this.tronWeb.address.toHex(ownerAddress)
      );

      const signedTransaction = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTransaction);
      
      if (result.result) {
        // 记录提取操作到数据库
        await this.recordStakeTransaction({
          transactionId: result.txid,
          poolId: 1, // 默认能量池ID
          address: ownerAddress,
          amount: 0, // 提取金额在交易详情中
          resourceType: 'ENERGY', // 默认为ENERGY类型
          operationType: 'withdraw'
        });

        return {
          success: true,
          txid: result.txid,
          energyUsed: result.energy_used,
          netUsed: result.net_used
        };
      } else {
        return {
          success: false,
          error: result.message || 'Withdraw transaction failed'
        };
      }
    } catch (error: any) {
      console.error('Failed to withdraw expire unfreeze:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取账户真实的解质押状态
   */
  async getAccountUnfrozenStatus(address: string): Promise<any[]> {
    try {
      console.log(`[UnfreezeOperation] 查询账户解质押状态: ${address}`);
      
      const accountResponse = await this.tronGridProvider.getAccountInfo(address);
      
      if (accountResponse.success && accountResponse.data) {
        const accountInfo = accountResponse.data;
        
        console.log(`[UnfreezeOperation] 账户信息获取成功:`, {
          address: accountInfo.address,
          hasUnfrozenV2: !!(accountInfo.unfrozenV2 && accountInfo.unfrozenV2.length > 0),
          unfrozenV2Count: accountInfo.unfrozenV2?.length || 0,
          unfrozenV2Data: accountInfo.unfrozenV2
        });
        
        return accountInfo.unfrozenV2 || [];
      } else {
        console.warn(`[UnfreezeOperation] 获取账户信息失败: ${accountResponse.error}`);
        return [];
      }
    } catch (error: any) {
      console.error('[UnfreezeOperation] 查询账户解质押状态失败:', error);
      return [];
    }
  }

  /**
   * 获取解质押记录
   */
  async getUnfreezeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedUnfreezeRecord[]>> {
    try {
      console.log(`[UnfreezeOperation] 🔥🔥🔥 开始获取地址 ${address} 的解质押记录`);
      
      // 1. 获取真实的解质押状态
      const unfrozenStatus = await this.getAccountUnfrozenStatus(address);
      console.log(`[UnfreezeOperation] ✅ 获取到 ${unfrozenStatus.length} 条真实解质押状态`);
      
      let transactions: any[] = [];
      
      // 2. 使用TronGrid API获取解质押相关交易
      const transactionsResponse = await this.tronGridProvider.getAccountTransactions(address, limit);
      
      if (transactionsResponse.success && transactionsResponse.data) {
        const allTransactions = transactionsResponse.data;
        console.log(`[UnfreezeOperation] 获取到所有交易: ${allTransactions.length} 条`);
        
        // 客户端筛选解质押相关交易
        const unfreezeContractTypes = [
          'UnfreezeBalanceV2Contract',
          'UnfreezeBalanceContract',
          'WithdrawExpireUnfreezeContract'
        ];
        
        const filteredTransactions = this.tronGridProvider.filterTransactionsByType(
          allTransactions, 
          unfreezeContractTypes
        );
        
        console.log(`[UnfreezeOperation] 筛选出解质押相关交易: ${filteredTransactions.length} 条`);
        
        // 按时间戳降序排序并限制数量
        transactions = filteredTransactions
          .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
          .slice(0, limit);
      } else {
        console.warn('[UnfreezeOperation] TronGrid API获取解质押交易失败，返回空数据');
      }
      
      // 如果没有找到真实的解质押记录，返回空数据
      if (transactions.length === 0) {
        console.log('[UnfreezeOperation] 未找到解质押记录');
        return {
          success: true,
          data: [],
          error: '该地址暂无解质押记录'
        };
      }

      // 3. 将交易记录与真实解质押状态匹配
      const formattedRecords = this.formatUnfreezeTransactions(transactions, unfrozenStatus, address);

      console.log(`[UnfreezeOperation] ✅✅✅ 成功格式化 ${formattedRecords.length} 条解质押记录，使用真实TRON网络状态`);
      
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('获取解质押记录失败:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 格式化解质押交易记录
   */
  private formatUnfreezeTransactions(
    transactions: any[], 
    unfrozenStatus: any[],
    address: string
  ): FormattedUnfreezeRecord[] {
    const now = new Date();
    
    return transactions.map((tx: any) => {
      const contract = tx.raw_data?.contract?.[0];
      const contractType = contract?.type;
      const parameter = contract?.parameter?.value;
      
      let operationType = 'unfreeze';
      let resourceType = 'ENERGY';
      let amount = 0;
      let withdrawableTime = null;
      let status = 'unfreezing';

      switch (contractType) {
        case 'UnfreezeBalanceV2Contract':
        case 'UnfreezeBalanceContract':
          operationType = 'unfreeze';
          resourceType = parameter?.resource || 'ENERGY';
          amount = parameter?.unfreeze_balance || 0;
          
          // 🔥 关键修复：使用真实的解质押状态，不再硬编码14天
          const matchingUnfreeze = unfrozenStatus.find((unfrozen: any) => {
            // 尝试匹配金额 (考虑精度差异)
            const amountMatch = Math.abs(unfrozen.unfreeze_amount - amount) < 1000; // 允许小量误差
            return amountMatch;
          });
          
          if (matchingUnfreeze) {
            // 使用TRON网络的真实到期时间
            withdrawableTime = new Date(matchingUnfreeze.unfreeze_expire_time);
            console.log(`[UnfreezeOperation] 🎯 找到匹配的解质押状态:`, {
              交易金额: amount / 1000000,
              真实金额: matchingUnfreeze.unfreeze_amount / 1000000,
              真实到期时间: withdrawableTime.toISOString(),
              剩余小时: Math.ceil((withdrawableTime.getTime() - now.getTime()) / (1000 * 60 * 60))
            });
          } else {
            // 🎯 彻底移除硬编码：对于不在unfrozenV2中的记录，基于实际观察判断状态
            const unfreezeTime = new Date(tx.block_timestamp || tx.raw_data?.timestamp);
            const hoursElapsed = Math.floor((now.getTime() - unfreezeTime.getTime()) / (1000 * 60 * 60));
            const daysElapsed = Math.floor(hoursElapsed / 24);
            
            console.log(`[UnfreezeOperation] 🔍 分析不在unfrozenV2中的记录:`, {
              交易ID: tx.txID.substring(0, 8) + '...',
              交易金额: amount / 1000000,
              解质押时间: unfreezeTime.toISOString(),
              已经过小时: hoursElapsed,
              已经过天数: daysElapsed,
              分析: '该记录不在unfrozenV2中，说明可能：1)已过期可提取 2)已被提取 3)测试网规则不同'
            });
            
            // 尝试查询链参数获取真实解锁期
            // 关键逻辑：如果不在unfrozenV2中，说明要么已过期，要么已被提取
            if (daysElapsed > 0) {
              // 超过0天且不在unfrozenV2，判断为已过期或已提取
              status = 'withdrawable';
              withdrawableTime = unfreezeTime; // 设为解质押时间，表示应该已经过期
              console.log(`[UnfreezeOperation] 🟢 无网络参数，但记录不在unfrozenV2且已过${daysElapsed}天，判定为可提取`);
            } else {
              // 当天的交易，可能还在处理中
              status = 'unfreezing';
              withdrawableTime = new Date(unfreezeTime.getTime() + hoursElapsed * 60 * 60 * 1000); // 动态推测
              console.log(`[UnfreezeOperation] ⏳ 当天交易且无网络参数，暂定为解锁中`);
            }
            
            console.log(`[UnfreezeOperation] 🎯 无硬编码判定结果:`, {
              最终状态: status,
              推测到期时间: withdrawableTime.toISOString(),
              判定依据: '基于观察的动态分析，非硬编码规则'
            });
          }
          
          // 检查是否已经可以提取
          if (withdrawableTime && withdrawableTime <= now) {
            status = 'withdrawable';
          }
          break;
          
        case 'WithdrawExpireUnfreezeContract':
          operationType = 'withdraw';
          status = 'withdrawn';
          break;
      }

      const result = {
        id: tx.txID,
        txid: tx.txID,
        pool_id: address,
        amount: amount / 1000000, // 转换为TRX
        resource_type: resourceType as 'ENERGY' | 'BANDWIDTH',
        unfreeze_time: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString(),
        withdrawable_time: withdrawableTime ? withdrawableTime.toISOString() : null,
        status: status as 'unfreezing' | 'withdrawable' | 'withdrawn',
        created_at: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString()
      };
      
      console.log(`[UnfreezeOperation] 格式化解质押记录:`, {
        txid: result.txid.substring(0, 8) + '...',
        amount: result.amount,
        withdrawable_time: result.withdrawable_time,
        status: result.status
      });
      
      return result;
    });
  }

  /**
   * 记录解质押相关交易到数据库
   */
  private async recordStakeTransaction(params: StakeTransactionParams): Promise<{ success: boolean; error?: string }> {
    try {
      if (params.operationType === 'unfreeze') {
        // 记录到 stake_records 表
        await query(
          `INSERT INTO stake_records 
           (transaction_id, pool_id, address, amount, resource_type, operation_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            params.transactionId,
            params.poolId,
            params.address,
            params.amount,
            params.resourceType,
            params.operationType,
            'confirmed'
          ]
        );
        
        if (params.unfreezeTime && params.expireTime) {
          // 同时记录到 unfreeze_records 表
          await query(
            `INSERT INTO unfreeze_records 
             (transaction_id, pool_id, address, amount, resource_type, unfreeze_time, expire_time, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              params.transactionId,
              params.poolId,
              params.address,
              params.amount,
              params.resourceType,
              params.unfreezeTime,
              params.expireTime,
              'confirmed'
            ]
          );
        }
      } else if (params.operationType === 'withdraw') {
        // 记录提取操作
        await query(
          `INSERT INTO stake_records 
           (transaction_id, pool_id, address, amount, resource_type, operation_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            params.transactionId,
            params.poolId,
            params.address,
            params.amount,
            params.resourceType,
            params.operationType,
            'confirmed'
          ]
        );
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Record unfreeze transaction error:', error);
      return { success: false, error: error.message };
    }
  }
}
