import { DatabaseService } from '../../../database/DatabaseService'
import { logger } from '../../../utils/logger'

interface FeeCalculationConfig {
  inactiveThresholdHours: number
  gracePeriodHours: number
}

interface FeeCalculationResult {
  shouldDeductFee: boolean
  feeAmount: number
  feeReason: string
  hoursSinceLastUsage: number
  remainingAfter: number
}

interface DailyFeeOrder {
  orderId: string
  userAddress: string
  transactionCount: number
  usedTransactions: number
  remainingTransactions: number
  lastEnergyUsageTime: Date | null
  dailyFeeLastCheck: Date | null
  dailyFee: number
  createdAt: Date
  isActive: boolean
}

/**
 * 日费计算器
 * 负责费用计算逻辑和扣费判断
 */
export class FeeCalculator {
  private dbService: DatabaseService
  private config: FeeCalculationConfig

  constructor(config: FeeCalculationConfig) {
    this.dbService = DatabaseService.getInstance()
    this.config = config
  }

  /**
   * 计算订单是否需要扣费
   */
  calculateFeeDeduction(order: DailyFeeOrder): FeeCalculationResult {
    const now = new Date()
    
    // 计算自上次使用以来的时间
    const lastUsageTime = order.lastEnergyUsageTime || order.createdAt
    const hoursSinceLastUsage = (now.getTime() - lastUsageTime.getTime()) / (1000 * 60 * 60)
    
    // 检查是否需要扣费
    const shouldDeductFee = hoursSinceLastUsage >= this.config.inactiveThresholdHours

    if (!shouldDeductFee) {
      return {
        shouldDeductFee: false,
        feeAmount: 0,
        feeReason: 'not_required',
        hoursSinceLastUsage,
        remainingAfter: order.remainingTransactions
      }
    }

    // 检查是否已经在今天扣过费
    if (order.dailyFeeLastCheck) {
      const lastCheckDate = new Date(order.dailyFeeLastCheck)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      if (lastCheckDate >= todayStart) {
        return {
          shouldDeductFee: false,
          feeAmount: 0,
          feeReason: 'already_deducted_today',
          hoursSinceLastUsage,
          remainingAfter: order.remainingTransactions
        }
      }
    }
    
    // 计算扣费笔数（日费对应的笔数）
    const feeTransactions = Math.min(order.dailyFee, order.remainingTransactions)
    
    if (feeTransactions <= 0) {
      return {
        shouldDeductFee: false,
        feeAmount: 0,
        feeReason: 'insufficient_transactions',
        hoursSinceLastUsage,
        remainingAfter: order.remainingTransactions
      }
    }
    
    const remainingAfter = order.remainingTransactions - feeTransactions
    const feeReason = `daily_fee_${Math.floor(hoursSinceLastUsage / 24)}d`
    
    return {
      shouldDeductFee: true,
      feeAmount: feeTransactions,
      feeReason,
      hoursSinceLastUsage,
      remainingAfter
    }
  }

  /**
   * 执行费用扣除到数据库
   */
  async executeFeeDeduction(
    orderId: string,
    feeAmount: number,
    feeReason: string,
    lastUsageTime: Date | null,
    remainingBefore: number,
    remainingAfter: number
  ): Promise<void> {
    const client = await this.dbService.getClient()
    
    try {
      await client.query('BEGIN')
      
      // 更新订单剩余笔数和最后检查时间
      const updateOrderQuery = `
        UPDATE orders 
        SET 
          remaining_transactions = $1,
          daily_fee_last_check = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `
      
      await client.query(updateOrderQuery, [remainingAfter, orderId])
      
      // 记录费用扣除日志
      const insertLogQuery = `
        INSERT INTO daily_fee_logs (
          order_id, fee_amount, fee_reason, last_usage_time,
          fee_time, remaining_before, remaining_after
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
      `
      
      await client.query(insertLogQuery, [
        orderId,
        feeAmount,
        feeReason,
        lastUsageTime,
        remainingBefore,
        remainingAfter
      ])
      
      await client.query('COMMIT')
      
      logger.debug('订单费用扣除数据库操作完成', {
        orderId,
        feeAmount,
        remainingAfter
      })
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('订单费用扣除数据库操作失败', {
        orderId,
        feeAmount,
        error: error instanceof Error ? error.message : error
      })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * 获取订单费用历史
   */
  async getOrderFeeHistory(orderId: string, limit: number = 30, offset: number = 0): Promise<Array<{
    id: string
    feeAmount: number
    feeReason: string
    lastUsageTime: Date | null
    feeTime: Date
    remainingBefore: number
    remainingAfter: number
  }>> {
    try {
      const query = `
        SELECT 
          id, fee_amount, fee_reason, last_usage_time, 
          fee_time, remaining_before, remaining_after
        FROM daily_fee_logs
        WHERE order_id = $1
        ORDER BY fee_time DESC
        LIMIT $2 OFFSET $3
      `

      const result = await this.dbService.query(query, [orderId, limit, offset])
      
      return result.rows.map(row => ({
        id: row.id,
        feeAmount: parseFloat(row.fee_amount),
        feeReason: row.fee_reason,
        lastUsageTime: row.last_usage_time,
        feeTime: row.fee_time,
        remainingBefore: row.remaining_before,
        remainingAfter: row.remaining_after
      }))
    } catch (error) {
      logger.error('获取订单费用历史失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return []
    }
  }

  /**
   * 更新计算配置
   */
  updateConfig(config: Partial<FeeCalculationConfig>): void {
    this.config = { ...this.config, ...config }
  }
}
