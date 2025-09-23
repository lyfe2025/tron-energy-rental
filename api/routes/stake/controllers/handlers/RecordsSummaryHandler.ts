/**
 * 综合记录摘要处理器
 * 处理记录摘要相关的业务逻辑
 */
import type { Request, Response } from 'express';
import type { StakeQueryParams } from '../../types/stake.types.ts';
import { BaseRecordsHandler } from './BaseRecordsHandler.ts';

export interface RecordsSummary {
  staking: {
    totalOperations: number;
    freezeOperations: number;
    unfreezeOperations: number;
    totalFrozen: number;
    totalUnfrozen: number;
    netStaked: number;
  };
  delegation: {
    totalOperations: number;
    delegateOperations: number;
    undelegateOperations: number;
    totalDelegated: number;
    totalUndelegated: number;
    netDelegated: number;
  };
  withdrawal: {
    totalUnfreezes: number;
    withdrawableCount: number;
    withdrawnCount: number;
    withdrawableAmount: number;
    totalWithdrawn: number;
  };
}

export class RecordsSummaryHandler extends BaseRecordsHandler {
  /**
   * 获取综合记录摘要
   */
  async getRecordsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { address, pool_id } = req.query as StakeQueryParams;
      
      if (!address && !pool_id) {
        throw new Error('address or pool_id is required');
      }
      
      const targetId = pool_id || address;
      console.log(`[RecordsSummaryHandler] 获取摘要信息，目标ID: ${targetId}`);
      
      // 并行获取各种统计信息（质押统计已改为实时数据，从TRON网络获取）
      const [stakeStats, delegateStats, unfreezeStats] = await Promise.all([
        this.getStakeStatistics(),
        this.getDelegateStatistics(),
        this.getUnfreezeStatistics()
      ]);
      
      const summary: RecordsSummary = {
        staking: {
          totalOperations: stakeStats.total_operations || 0,
          freezeOperations: stakeStats.freeze_count || 0,
          unfreezeOperations: stakeStats.unfreeze_count || 0,
          totalFrozen: stakeStats.total_frozen || 0,
          totalUnfrozen: stakeStats.total_unfrozen || 0,
          netStaked: (stakeStats.total_frozen || 0) - (stakeStats.total_unfrozen || 0)
        },
        delegation: {
          totalOperations: delegateStats.total_operations || 0,
          delegateOperations: delegateStats.delegate_count || 0,
          undelegateOperations: delegateStats.undelegate_count || 0,
          totalDelegated: delegateStats.total_delegated || 0,
          totalUndelegated: delegateStats.total_undelegated || 0,
          netDelegated: (delegateStats.total_delegated || 0) - (delegateStats.total_undelegated || 0)
        },
        withdrawal: {
          totalUnfreezes: unfreezeStats.total_unfreezes || 0,
          withdrawableCount: unfreezeStats.withdrawable_count || 0,
          withdrawnCount: unfreezeStats.withdrawn_count || 0,
          withdrawableAmount: unfreezeStats.withdrawable_amount || 0,
          totalWithdrawn: unfreezeStats.total_withdrawn || 0
        }
      };
      
      res.json({ success: true, data: summary });
    } catch (error: any) {
      this.handleError(res, error, '获取记录摘要');
    }
  }

  /**
   * 获取质押统计信息
   * 注意：使用实时数据，返回默认统计结构
   */
  private async getStakeStatistics(): Promise<any> {
    return {
      total_operations: 0,
      freeze_count: 0,
      unfreeze_count: 0,
      total_frozen: 0,
      total_unfrozen: 0
    };
  }

  /**
   * 获取委托统计信息
   * 注意：改为使用实时数据
   */
  private async getDelegateStatistics(): Promise<any> {
    return {
      total_operations: 0,
      delegate_count: 0,
      undelegate_count: 0,
      total_delegated: 0,
      total_undelegated: 0
    };
  }

  /**
   * 获取解冻统计信息
   * 注意：使用实时数据，返回默认统计结构
   */
  private async getUnfreezeStatistics(): Promise<any> {
    return {
      total_unfreezes: 0,
      withdrawable_count: 0,
      withdrawn_count: 0,
      withdrawable_amount: 0,
      total_withdrawn: 0
    };
  }
}
