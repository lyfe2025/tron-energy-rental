/**
 * 订单状态更新器
 * 从 SingleDelegationProcessor.ts 分离出的订单状态更新逻辑
 */

import { logger } from '../../../../utils/logger'
import { StatusManager } from '../../core/StatusManager'
import { TransactionCounter } from '../../core/TransactionCounter'
import { DelegationHelper } from '../../utils/DelegationHelper'
import type { UpdateResult } from '../types/delegation.types'

export class OrderStatusUpdater {
  private transactionCounter: TransactionCounter
  private statusManager: StatusManager
  private delegationHelper: DelegationHelper

  constructor() {
    this.transactionCounter = new TransactionCounter()
    this.statusManager = new StatusManager()
    this.delegationHelper = new DelegationHelper()
  }

  /**
   * 代理成功后更新订单状态
   */
  async updateOrderAfterDelegation(
    orderId: string,
    delegationTxHash: string,
    energyDelegated: number,
    sourceAddress: string
  ): Promise<UpdateResult> {
    try {
      // 1. 更新交易笔数
      const counterResult = await this.transactionCounter.incrementUsedTransactions(orderId, 1)
      if (!counterResult.success) {
        return {
          success: false,
          error: counterResult.message
        }
      }

      // 2. 更新下次代理时间
      const statusResult = await this.statusManager.updateNextDelegationTime(orderId)
      if (!statusResult.success) {
        logger.warn('更新下次代理时间失败', {
          orderId,
          error: statusResult.error
        })
      }

      // 3. 更新代理记录
      await this.delegationHelper.updateDelegationRecord(
        orderId,
        delegationTxHash,
        sourceAddress,
        energyDelegated
      )

      return {
        success: true,
        usedTransactions: counterResult.usedTransactions,
        remainingTransactions: counterResult.remainingTransactions,
        nextDelegationTime: statusResult.nextDelegationTime
      }
    } catch (error: any) {
      logger.error(`代理后更新订单状态失败`, {
        orderId,
        delegationTxHash,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
