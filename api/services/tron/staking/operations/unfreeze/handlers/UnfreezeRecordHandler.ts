import { TronGridProvider } from '../../../providers/TronGridProvider';
import type {
    FormattedUnfreezeRecord,
    ServiceResponse
} from '../../../types/staking.types';
import { UnfreezeCalculator } from '../utils/UnfreezeCalculator';

/**
 * 解质押记录处理器
 * 负责处理解质押记录的获取、格式化和状态管理
 */
export class UnfreezeRecordHandler {
  private tronWeb: any;
  private tronGridProvider: TronGridProvider;
  private calculator: UnfreezeCalculator;

  constructor(tronWeb: any, tronGridProvider: TronGridProvider) {
    this.tronWeb = tronWeb;
    this.tronGridProvider = tronGridProvider;
    this.calculator = new UnfreezeCalculator(tronWeb);
  }

  /**
   * 获取账户真实的解质押状态
   */
  async getAccountUnfrozenStatus(address: string): Promise<any[]> {
    try {
      console.log(`[UnfreezeRecordHandler] 查询账户解质押状态: ${address}`);
      
      const accountResponse = await this.tronGridProvider.getAccountInfo(address);
      
      if (accountResponse.success && accountResponse.data) {
        const accountInfo = accountResponse.data;
        
        console.log(`[UnfreezeRecordHandler] 账户信息获取成功:`, {
          address: accountInfo.address,
          hasUnfrozenV2: !!(accountInfo.unfrozenV2 && accountInfo.unfrozenV2.length > 0),
          unfrozenV2Count: accountInfo.unfrozenV2?.length || 0,
          unfrozenV2Data: accountInfo.unfrozenV2
        });
        
        return accountInfo.unfrozenV2 || [];
      } else {
        console.warn(`[UnfreezeRecordHandler] 获取账户信息失败: ${accountResponse.error}`);
        return [];
      }
    } catch (error: any) {
      console.error('[UnfreezeRecordHandler] 查询账户解质押状态失败:', error);
      return [];
    }
  }

  /**
   * 获取解质押交易历史记录
   */
  async getUnfreezeTransactionHistory(
    address: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ServiceResponse<FormattedUnfreezeRecord[]>> {
    try {
      console.log(`[UnfreezeRecordHandler] 🔥🔥🔥 开始获取地址 ${address} 的解质押记录`);
      
      // 1. 获取真实的解质押状态
      const unfrozenStatus = await this.getAccountUnfrozenStatus(address);
      console.log(`[UnfreezeRecordHandler] ✅ 获取到 ${unfrozenStatus.length} 条真实解质押状态`);
      
      let transactions: any[] = [];
      
      // 2. 使用TronGrid API获取解质押相关交易
      const transactionsResponse = await this.tronGridProvider.getAccountTransactions(address, limit);
      
      if (transactionsResponse.success && transactionsResponse.data) {
        const allTransactions = transactionsResponse.data;
        console.log(`[UnfreezeRecordHandler] 获取到所有交易: ${allTransactions.length} 条`);
        
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
        
        console.log(`[UnfreezeRecordHandler] 筛选出解质押相关交易: ${filteredTransactions.length} 条`);
        
        // 按时间戳降序排序并限制数量
        transactions = filteredTransactions
          .sort((a, b) => (b.block_timestamp || 0) - (a.block_timestamp || 0))
          .slice(0, limit);
      } else {
        console.warn('[UnfreezeRecordHandler] TronGrid API获取解质押交易失败，返回空数据');
      }
      
      // 如果没有找到真实的解质押记录，返回空数据
      if (transactions.length === 0) {
        console.log('[UnfreezeRecordHandler] 未找到解质押记录');
        return {
          success: true,
          data: [],
          error: '该地址暂无解质押记录'
        };
      }

      // 3. 将交易记录与真实解质押状态匹配
      const formattedRecords = this.formatUnfreezeTransactions(transactions, unfrozenStatus, address);

      console.log(`[UnfreezeRecordHandler] ✅✅✅ 成功格式化 ${formattedRecords.length} 条解质押记录，使用真实TRON网络状态`);
      
      return {
        success: true,
        data: formattedRecords
      };
    } catch (error: any) {
      console.error('[UnfreezeRecordHandler] 获取解质押记录失败:', error);
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
          const matchingUnfreeze = this.calculator.matchUnfreezeStatus(amount, unfrozenStatus);
          
          if (matchingUnfreeze) {
            // 使用TRON网络的真实到期时间
            withdrawableTime = new Date(matchingUnfreeze.unfreeze_expire_time);
            console.log(`[UnfreezeRecordHandler] 🎯 找到匹配的解质押状态:`, {
              交易金额: this.calculator.formatTrxAmount(amount),
              真实金额: this.calculator.formatTrxAmount(matchingUnfreeze.unfreeze_amount),
              真实到期时间: withdrawableTime.toISOString(),
              剩余小时: this.calculator.calculateRemainingHours(withdrawableTime)
            });
          } else {
            // 🎯 彻底移除硬编码：对于不在unfrozenV2中的记录，基于实际观察判断状态
            const unfreezeTime = new Date(tx.block_timestamp || tx.raw_data?.timestamp);
            const { hours: hoursElapsed, days: daysElapsed } = this.calculator.calculateElapsedTime(unfreezeTime);
            
            console.log(`[UnfreezeRecordHandler] 🔍 分析不在unfrozenV2中的记录:`, {
              交易ID: tx.txID.substring(0, 8) + '...',
              交易金额: this.calculator.formatTrxAmount(amount),
              解质押时间: unfreezeTime.toISOString(),
              已经过小时: hoursElapsed,
              已经过天数: daysElapsed,
              分析: '该记录不在unfrozenV2中，说明可能：1)已过期可提取 2)已被提取 3)测试网规则不同'
            });
            
            // 关键逻辑：如果不在unfrozenV2中，说明要么已过期，要么已被提取
            if (daysElapsed > 0) {
              // 超过0天且不在unfrozenV2，判断为已过期或已提取
              status = 'withdrawable';
              withdrawableTime = unfreezeTime; // 设为解质押时间，表示应该已经过期
              console.log(`[UnfreezeRecordHandler] 🟢 无网络参数，但记录不在unfrozenV2且已过${daysElapsed}天，判定为可提取`);
            } else {
              // 当天的交易，可能还在处理中
              status = 'unfreezing';
              withdrawableTime = new Date(unfreezeTime.getTime() + hoursElapsed * 60 * 60 * 1000); // 动态推测
              console.log(`[UnfreezeRecordHandler] ⏳ 当天交易且无网络参数，暂定为解锁中`);
            }
            
            console.log(`[UnfreezeRecordHandler] 🎯 无硬编码判定结果:`, {
              最终状态: status,
              推测到期时间: withdrawableTime.toISOString(),
              判定依据: '基于观察的动态分析，非硬编码规则'
            });
          }
          
          // 检查是否已经可以提取
          if (withdrawableTime && this.calculator.isWithdrawable(withdrawableTime)) {
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
        amount: this.calculator.formatTrxAmount(amount),
        resource_type: resourceType as 'ENERGY' | 'BANDWIDTH',
        unfreeze_time: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString(),
        withdrawable_time: withdrawableTime ? withdrawableTime.toISOString() : null,
        status: status as 'unfreezing' | 'withdrawable' | 'withdrawn',
        created_at: new Date(tx.block_timestamp || tx.raw_data?.timestamp).toISOString()
      };
      
      console.log(`[UnfreezeRecordHandler] 格式化解质押记录:`, {
        txid: result.txid.substring(0, 8) + '...',
        amount: result.amount,
        withdrawable_time: result.withdrawable_time,
        status: result.status
      });
      
      return result;
    });
  }
}
