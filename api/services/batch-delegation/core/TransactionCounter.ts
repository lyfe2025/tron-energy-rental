import { DatabaseService } from '../../../database/DatabaseService'
import { logger } from '../../../utils/logger'

interface TransactionCountUpdateResult {
  success: boolean
  message: string
  orderId?: string
  transactionCount?: number
  usedTransactions?: number
  remainingTransactions?: number
  lastEnergyUsageTime?: Date
  details?: any
}

interface OrderTransactionData {
  id: string
  transaction_count: number
  used_transactions: number
  remaining_transactions: number
  last_energy_usage_time?: Date
}

/**
 * 交易计数器
 * 负责管理订单的交易笔数和使用情况
 */
export class TransactionCounter {
  private dbService: DatabaseService

  constructor() {
    this.dbService = DatabaseService.getInstance()
  }

  /**
   * 更新订单的交易笔数
   */
  async updateTransactionCount(
    orderId: string,
    usedCount: number,
    reason?: string
  ): Promise<TransactionCountUpdateResult> {
    try {
      logger.info(`开始更新订单交易笔数`, {
        orderId,
        usedCount,
        reason
      })

      // 1. 获取订单信息
      const order = await this.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found or not a transaction package order'
        }
      }

      // 2. 验证更新参数
      const currentUsed = order.used_transactions || 0
      const totalCount = order.transaction_count || 0
      const newUsedCount = currentUsed + usedCount

      if (newUsedCount > totalCount) {
        return {
          success: false,
          message: 'Used count exceeds total transaction count',
          details: {
            currentUsed,
            totalCount,
            requestedIncrease: usedCount,
            wouldResult: newUsedCount
          }
        }
      }

      // 3. 更新数据库
      const updateQuery = `
        UPDATE orders 
        SET 
          used_transactions = $1,
          remaining_transactions = $2,
          last_energy_usage_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND order_type = 'transaction_package'
        RETURNING 
          id, transaction_count, used_transactions, 
          remaining_transactions, last_energy_usage_time
      `

      const result = await this.dbService.query(updateQuery, [
        newUsedCount,
        totalCount - newUsedCount,
        orderId
      ])

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Failed to update order transaction count'
        }
      }

      const updatedOrder = result.rows[0]

      // 4. 记录更新日志
      if (reason) {
        await this.recordTransactionCountUpdate(
          orderId,
          currentUsed,
          newUsedCount,
          reason
        )
      }

      logger.info(`订单交易笔数更新成功`, {
        orderId,
        previousUsed: currentUsed,
        newUsed: newUsedCount,
        remaining: updatedOrder.remaining_transactions
      })

      return {
        success: true,
        message: 'Transaction count updated successfully',
        orderId,
        transactionCount: updatedOrder.transaction_count,
        usedTransactions: updatedOrder.used_transactions,
        remainingTransactions: updatedOrder.remaining_transactions,
        lastEnergyUsageTime: updatedOrder.last_energy_usage_time
      }
    } catch (error) {
      logger.error(`更新订单交易笔数失败`, {
        orderId,
        usedCount,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        message: 'Internal error during transaction count update',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 增加订单使用的交易笔数
   */
  async incrementUsedTransactions(orderId: string, increment: number = 1): Promise<TransactionCountUpdateResult> {
    return this.updateTransactionCount(orderId, increment, 'delegation_completed')
  }

  /**
   * 减少订单使用的交易笔数（回滚）
   */
  async decrementUsedTransactions(orderId: string, decrement: number = 1): Promise<TransactionCountUpdateResult> {
    try {
      const order = await this.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found or not a transaction package order'
        }
      }

      const currentUsed = order.used_transactions || 0
      if (currentUsed < decrement) {
        return {
          success: false,
          message: 'Cannot decrement more than current used count',
          details: {
            currentUsed,
            requestedDecrement: decrement
          }
        }
      }

      const totalCount = order.transaction_count || 0
      const newUsedCount = currentUsed - decrement

      const updateQuery = `
        UPDATE orders 
        SET 
          used_transactions = $1,
          remaining_transactions = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND order_type = 'transaction_package'
        RETURNING 
          id, transaction_count, used_transactions, 
          remaining_transactions, last_energy_usage_time
      `

      const result = await this.dbService.query(updateQuery, [
        newUsedCount,
        totalCount - newUsedCount,
        orderId
      ])

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Failed to decrement order transaction count'
        }
      }

      const updatedOrder = result.rows[0]

      // 记录回滚日志
      await this.recordTransactionCountUpdate(
        orderId,
        currentUsed,
        newUsedCount,
        'delegation_rollback'
      )

      logger.info(`订单交易笔数回滚成功`, {
        orderId,
        previousUsed: currentUsed,
        newUsed: newUsedCount,
        remaining: updatedOrder.remaining_transactions
      })

      return {
        success: true,
        message: 'Transaction count decremented successfully',
        orderId,
        transactionCount: updatedOrder.transaction_count,
        usedTransactions: updatedOrder.used_transactions,
        remainingTransactions: updatedOrder.remaining_transactions,
        lastEnergyUsageTime: updatedOrder.last_energy_usage_time
      }
    } catch (error) {
      logger.error(`回滚订单交易笔数失败`, {
        orderId,
        decrement,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        message: 'Internal error during transaction count decrement',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取订单交易统计信息
   */
  async getTransactionStats(orderId: string): Promise<{
    success: boolean
    stats?: {
      orderId: string
      totalTransactions: number
      usedTransactions: number
      remainingTransactions: number
      usagePercentage: number
      lastUsageTime: Date | null
      dailyUsage: number
      weeklyUsage: number
      monthlyUsage: number
    }
    message: string
  }> {
    try {
      const order = await this.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found or not a transaction package order'
        }
      }

      // 获取使用统计
      const usageStats = await this.getUsageStatistics(orderId)

      const totalTransactions = order.transaction_count || 0
      const usedTransactions = order.used_transactions || 0
      const remainingTransactions = order.remaining_transactions || 0
      const usagePercentage = totalTransactions > 0 ? (usedTransactions / totalTransactions) * 100 : 0

      return {
        success: true,
        stats: {
          orderId,
          totalTransactions,
          usedTransactions,
          remainingTransactions,
          usagePercentage: Math.round(usagePercentage * 100) / 100,
          lastUsageTime: order.last_energy_usage_time,
          dailyUsage: usageStats.dailyUsage,
          weeklyUsage: usageStats.weeklyUsage,
          monthlyUsage: usageStats.monthlyUsage
        },
        message: 'Transaction statistics retrieved successfully'
      }
    } catch (error) {
      logger.error('获取交易统计信息失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        message: 'Internal error during statistics retrieval'
      }
    }
  }

  /**
   * 批量更新多个订单的交易笔数
   */
  async batchUpdateTransactionCounts(updates: Array<{
    orderId: string
    usedCount: number
    reason?: string
  }>): Promise<Array<TransactionCountUpdateResult>> {
    const results: TransactionCountUpdateResult[] = []

    for (const update of updates) {
      const result = await this.updateTransactionCount(
        update.orderId,
        update.usedCount,
        update.reason
      )
      results.push(result)
    }

    const successCount = results.filter(r => r.success).length
    logger.info(`批量更新交易笔数完成`, {
      total: updates.length,
      success: successCount,
      failed: updates.length - successCount
    })

    return results
  }

  /**
   * 获取笔数套餐订单
   */
  private async getTransactionPackageOrder(orderId: string): Promise<OrderTransactionData | null> {
    try {
      const query = `
        SELECT id, transaction_count, used_transactions, remaining_transactions, last_energy_usage_time
        FROM orders 
        WHERE id = $1 AND order_type = 'transaction_package'
      `
      const result = await this.dbService.query(query, [orderId])
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      logger.error(`获取笔数套餐订单失败`, {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return null
    }
  }

  /**
   * 记录交易笔数更新日志
   */
  private async recordTransactionCountUpdate(
    orderId: string,
    previousCount: number,
    newCount: number,
    reason: string
  ): Promise<void> {
    // 只记录到文件日志，交易笔数更新已在orders表中跟踪
    logger.debug(`交易笔数更新日志记录`, {
      orderId,
      previousCount,
      newCount,
      reason,
      action: 'transaction_count_update'
    })
  }

  /**
   * 获取使用统计信息
   */
  private async getUsageStatistics(orderId: string): Promise<{
    dailyUsage: number
    weeklyUsage: number
    monthlyUsage: number
  }> {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as daily_usage,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as weekly_usage,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_usage
        FROM energy_usage_logs 
        WHERE order_id = $1
      `

      const result = await this.dbService.query(query, [orderId])
      const stats = result.rows[0] || {}

      return {
        dailyUsage: parseInt(stats.daily_usage) || 0,
        weeklyUsage: parseInt(stats.weekly_usage) || 0,
        monthlyUsage: parseInt(stats.monthly_usage) || 0
      }
    } catch (error) {
      logger.error('获取使用统计信息失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return {
        dailyUsage: 0,
        weeklyUsage: 0,
        monthlyUsage: 0
      }
    }
  }
}
