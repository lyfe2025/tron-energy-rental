import { type Request, type Response } from 'express'
import { BatchDelegationService } from '../services/BatchDelegationService'
import { logger } from '../utils/logger'
import type { Order } from '../services/order/types'

/**
 * 分批能量代理控制器
 * 处理笔数套餐订单的分批能量代理逻辑
 */
export class BatchDelegationController {
  private batchDelegationService: BatchDelegationService

  constructor() {
    this.batchDelegationService = BatchDelegationService.getInstance()
  }

  /**
   * 执行单笔交易的能量代理
   * POST /api/delegation/batch/execute
   */
  delegateSingleTransaction = async (req: Request, res: Response) => {
    try {
      const { orderId, userAddress, transactionHash } = req.body

      // 参数验证
      if (!orderId || !userAddress) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'orderId and userAddress are required'
        })
      }

      // 验证地址格式
      if (!this.isValidTronAddress(userAddress)) {
        return res.status(400).json({
          error: 'Invalid address format',
          message: 'userAddress must be a valid TRON address'
        })
      }

      logger.info(`开始执行单笔交易能量代理`, {
        orderId,
        userAddress,
        transactionHash
      })

      const result = await this.batchDelegationService.delegateSingleTransaction(
        orderId,
        userAddress,
        transactionHash
      )

      if (!result.success) {
        return res.status(400).json({
          error: 'Delegation failed',
          message: result.message,
          details: result.details
        })
      }

      logger.info(`单笔交易能量代理成功`, {
        orderId,
        userAddress,
        delegationTxHash: result.delegationTxHash,
        energyDelegated: result.energyDelegated
      })

      res.json({
        success: true,
        message: 'Energy delegation completed successfully',
        data: {
          orderId: result.orderId,
          delegationTxHash: result.delegationTxHash,
          energyDelegated: result.energyDelegated,
          remainingTransactions: result.remainingTransactions,
          usedTransactions: result.usedTransactions,
          nextDelegationTime: result.nextDelegationTime
        }
      })
    } catch (error) {
      logger.error('Delegate single transaction error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 更新订单的交易笔数
   * PUT /api/delegation/batch/update-count
   */
  updateTransactionCount = async (req: Request, res: Response) => {
    try {
      const { orderId, usedCount, reason } = req.body

      // 参数验证
      if (!orderId || typeof usedCount !== 'number') {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'orderId and usedCount are required'
        })
      }

      if (usedCount < 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'usedCount must be non-negative'
        })
      }

      logger.info(`开始更新订单交易笔数`, {
        orderId,
        usedCount,
        reason
      })

      const result = await this.batchDelegationService.updateTransactionCount(
        orderId,
        usedCount,
        reason
      )

      if (!result.success) {
        return res.status(400).json({
          error: 'Update failed',
          message: result.message,
          details: result.details
        })
      }

      logger.info(`订单交易笔数更新成功`, {
        orderId,
        usedTransactions: result.usedTransactions,
        remainingTransactions: result.remainingTransactions
      })

      res.json({
        success: true,
        message: 'Transaction count updated successfully',
        data: {
          orderId: result.orderId,
          transactionCount: result.transactionCount,
          usedTransactions: result.usedTransactions,
          remainingTransactions: result.remainingTransactions,
          lastEnergyUsageTime: result.lastEnergyUsageTime
        }
      })
    } catch (error) {
      logger.error('Update transaction count error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 获取订单的代理状态
   * GET /api/delegation/batch/status/:orderId
   */
  getDelegationStatus = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params

      if (!orderId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'orderId is required'
        })
      }

      const status = await this.batchDelegationService.getDelegationStatus(orderId)

      if (!status) {
        return res.status(404).json({
          error: 'Order not found',
          message: 'The specified order does not exist or is not a transaction package order'
        })
      }

      res.json({
        success: true,
        data: status
      })
    } catch (error) {
      logger.error('Get delegation status error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 批量执行多个订单的能量代理
   * POST /api/delegation/batch/execute-multiple
   */
  executeBatchDelegation = async (req: Request, res: Response) => {
    try {
      const { delegations } = req.body

      // 参数验证
      if (!Array.isArray(delegations) || delegations.length === 0) {
        return res.status(400).json({
          error: 'Invalid parameter',
          message: 'delegations must be a non-empty array'
        })
      }

      // 验证每个代理请求的格式
      for (const delegation of delegations) {
        if (!delegation.orderId || !delegation.userAddress) {
          return res.status(400).json({
            error: 'Invalid delegation format',
            message: 'Each delegation must have orderId and userAddress'
          })
        }

        if (!this.isValidTronAddress(delegation.userAddress)) {
          return res.status(400).json({
            error: 'Invalid address format',
            message: `Invalid TRON address: ${delegation.userAddress}`
          })
        }
      }

      logger.info(`开始批量执行能量代理`, {
        delegationCount: delegations.length,
        orderIds: delegations.map(d => d.orderId)
      })

      const results = await this.batchDelegationService.executeBatchDelegation(delegations)

      const successCount = results.filter(r => r.success).length
      const failureCount = results.length - successCount

      logger.info(`批量能量代理执行完成`, {
        total: results.length,
        success: successCount,
        failure: failureCount
      })

      res.json({
        success: true,
        message: `Batch delegation completed: ${successCount} success, ${failureCount} failed`,
        data: {
          total: results.length,
          successCount,
          failureCount,
          results
        }
      })
    } catch (error) {
      logger.error('Execute batch delegation error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 获取待处理的代理任务列表
   * GET /api/delegation/batch/pending
   */
  getPendingDelegations = async (req: Request, res: Response) => {
    try {
      const { limit = 50, offset = 0 } = req.query

      const limitNum = Math.min(parseInt(limit as string) || 50, 100)
      const offsetNum = Math.max(parseInt(offset as string) || 0, 0)

      const pendingDelegations = await this.batchDelegationService.getPendingDelegations(
        limitNum,
        offsetNum
      )

      res.json({
        success: true,
        data: {
          delegations: pendingDelegations.delegations,
          total: pendingDelegations.total,
          limit: limitNum,
          offset: offsetNum
        }
      })
    } catch (error) {
      logger.error('Get pending delegations error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    // TRON地址格式验证：以T开头，长度34位
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/
    return tronAddressRegex.test(address)
  }

  /**
   * 手动触发订单的下次代理时间检查
   * POST /api/delegation/batch/trigger-next/:orderId
   */
  triggerNextDelegation = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params

      if (!orderId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'orderId is required'
        })
      }

      const result = await this.batchDelegationService.triggerNextDelegation(orderId)

      if (!result.success) {
        return res.status(400).json({
          error: 'Trigger failed',
          message: result.message,
          details: result.details
        })
      }

      res.json({
        success: true,
        message: 'Next delegation triggered successfully',
        data: {
          orderId: result.orderId,
          nextDelegationTime: result.nextDelegationTime,
          canDelegate: result.canDelegate
        }
      })
    } catch (error) {
      logger.error('Trigger next delegation error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// 创建默认实例
export const batchDelegationController = new BatchDelegationController()
export default batchDelegationController