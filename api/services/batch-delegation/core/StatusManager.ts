import { DatabaseService } from '../../../database/DatabaseService'
import { logger } from '../../../utils/logger'
import { PriceConfigService } from '../../PriceConfigService'

interface DelegationStatus {
  orderId: string
  orderType: string
  transactionCount: number
  usedTransactions: number
  remainingTransactions: number
  lastEnergyUsageTime: Date | null
  nextDelegationTime: Date | null
  dailyFeeLastCheck: Date | null
  status: string
  paymentStatus: string
  canDelegate: boolean
  energyPerTransaction: number
}

interface PendingDelegation {
  orderId: string
  userAddress: string
  transactionCount: number
  usedTransactions: number
  remainingTransactions: number
  nextDelegationTime: Date | null
  priority: number
}

interface NextDelegationResult {
  success: boolean
  message: string
  orderId?: string
  nextDelegationTime?: Date
  canDelegate?: boolean
  details?: any
}

/**
 * 状态管理器
 * 负责管理订单状态、代理时间和待处理任务
 */
export class StatusManager {
  private dbService: DatabaseService
  private priceConfigService: PriceConfigService

  constructor() {
    this.dbService = DatabaseService.getInstance()
    this.priceConfigService = PriceConfigService.getInstance()
  }

  /**
   * 获取订单的代理状态
   */
  async getDelegationStatus(orderId: string): Promise<DelegationStatus | null> {
    try {
      const query = `
        SELECT 
          o.id, o.order_type, o.transaction_count, o.used_transactions,
          o.remaining_transactions, o.last_energy_usage_time, o.next_delegation_time,
          o.daily_fee_last_check, o.status, o.payment_status, o.target_address
        FROM orders o
        WHERE o.id = $1 AND o.order_type = 'transaction_package'
      `

      const result = await this.dbService.query(query, [orderId])
      if (result.rows.length === 0) {
        return null
      }

      const order = result.rows[0]
      // 从订单计算单笔能量（基于后台配置）
      const energyPerTransaction = Math.floor(order.energy_amount / order.transaction_count)

      // 检查是否可以进行代理
      const canDelegate = await this.canDelegateNow(order)

      return {
        orderId: order.id,
        orderType: order.order_type,
        transactionCount: order.transaction_count || 0,
        usedTransactions: order.used_transactions || 0,
        remainingTransactions: order.remaining_transactions || 0,
        lastEnergyUsageTime: order.last_energy_usage_time,
        nextDelegationTime: order.next_delegation_time,
        dailyFeeLastCheck: order.daily_fee_last_check,
        status: order.status,
        paymentStatus: order.payment_status,
        canDelegate: canDelegate.allowed,
        energyPerTransaction
      }
    } catch (error) {
      logger.error(`获取代理状态失败`, {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return null
    }
  }

  /**
   * 获取待处理的代理任务列表
   */
  async getPendingDelegations(limit: number = 50, offset: number = 0): Promise<{
    delegations: PendingDelegation[]
    total: number
  }> {
    try {
      // 查询待处理的笔数套餐订单
      const query = `
        SELECT 
          o.id as order_id, o.target_address as user_address,
          o.transaction_count, o.used_transactions, o.remaining_transactions,
          o.next_delegation_time, o.last_energy_usage_time,
          CASE 
            WHEN o.remaining_transactions > 0 AND 
                 (o.next_delegation_time IS NULL OR o.next_delegation_time <= CURRENT_TIMESTAMP)
            THEN 1 ELSE 0 
          END as priority
        FROM orders o
        WHERE 
          o.order_type = 'transaction_package' 
          AND o.status = 'active'
          AND o.payment_status = 'paid'
          AND o.remaining_transactions > 0
        ORDER BY priority DESC, o.next_delegation_time ASC NULLS FIRST
        LIMIT $1 OFFSET $2
      `

      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        WHERE 
          o.order_type = 'transaction_package' 
          AND o.status = 'active'
          AND o.payment_status = 'paid'
          AND o.remaining_transactions > 0
      `

      const [dataResult, countResult] = await Promise.all([
        this.dbService.query(query, [limit, offset]),
        this.dbService.query(countQuery)
      ])

      const delegations: PendingDelegation[] = dataResult.rows.map(row => ({
        orderId: row.order_id,
        userAddress: row.user_address,
        transactionCount: row.transaction_count || 0,
        usedTransactions: row.used_transactions || 0,
        remainingTransactions: row.remaining_transactions || 0,
        nextDelegationTime: row.next_delegation_time,
        priority: row.priority || 0
      }))

      return {
        delegations,
        total: parseInt(countResult.rows[0].total)
      }
    } catch (error) {
      logger.error(`获取待处理代理任务失败`, {
        limit,
        offset,
        error: error instanceof Error ? error.message : error
      })
      return {
        delegations: [],
        total: 0
      }
    }
  }

  /**
   * 手动触发订单的下次代理时间检查
   */
  async triggerNextDelegation(orderId: string): Promise<NextDelegationResult> {
    try {
      const order = await this.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found or not a transaction package order'
        }
      }

      // 重置下次代理时间为当前时间，允许立即代理
      const updateQuery = `
        UPDATE orders 
        SET 
          next_delegation_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND order_type = 'transaction_package'
        RETURNING next_delegation_time
      `

      const result = await this.dbService.query(updateQuery, [orderId])
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Failed to update next delegation time'
        }
      }

      const nextDelegationTime = result.rows[0].next_delegation_time
      const canDelegate = await this.canDelegateNow({ ...order, next_delegation_time: nextDelegationTime })

      logger.info(`手动触发下次代理时间更新`, {
        orderId,
        nextDelegationTime,
        canDelegate: canDelegate.allowed
      })

      return {
        success: true,
        message: 'Next delegation time updated successfully',
        orderId,
        nextDelegationTime,
        canDelegate: canDelegate.allowed
      }
    } catch (error) {
      logger.error(`触发下次代理失败`, {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        message: 'Internal error during trigger next delegation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 更新订单的下次代理时间
   */
  async updateNextDelegationTime(orderId: string, intervalMinutes?: number): Promise<{
    success: boolean
    nextDelegationTime?: Date
    error?: string
  }> {
    try {
      // 获取配置中的代理间隔时间
      const config = await this.priceConfigService.getTransactionPackageConfig()
      const interval = intervalMinutes || config?.energy_check_interval || 30
      
      const nextDelegationTime = new Date()
      nextDelegationTime.setMinutes(nextDelegationTime.getMinutes() + interval)

      const updateQuery = `
        UPDATE orders 
        SET 
          next_delegation_time = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND order_type = 'transaction_package'
        RETURNING next_delegation_time
      `

      const result = await this.dbService.query(updateQuery, [orderId, nextDelegationTime])

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Failed to update next delegation time'
        }
      }

      return {
        success: true,
        nextDelegationTime: result.rows[0].next_delegation_time
      }
    } catch (error) {
      logger.error(`更新下次代理时间失败`, {
        orderId,
        intervalMinutes,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 检查是否可以立即进行代理（防重复代理）
   */
  async canDelegateNow(order: any): Promise<{
    allowed: boolean
    reason?: string
    nextAllowedTime?: Date
  }> {
    try {
      // 1. 检查订单剩余笔数
      if (!order.remaining_transactions || order.remaining_transactions <= 0) {
        return {
          allowed: false,
          reason: 'No remaining transactions available for delegation'
        }
      }

      // 2. 检查订单状态
      if (order.status !== 'active' || order.payment_status !== 'paid') {
        return {
          allowed: false,
          reason: 'Order is not active or not paid'
        }
      }

      // 3. 检查是否已经有正在处理的代理（防并发重复）
      const processingCheck = await this.dbService.query(`
        SELECT COUNT(*) as count 
        FROM energy_usage_logs 
        WHERE order_id = $1 
        AND created_at > NOW() - INTERVAL '30 seconds'
      `, [order.id])
      
      if (processingCheck.rows[0].count > 0) {
        return {
          allowed: false,
          reason: 'Another delegation is currently being processed for this order'
        }
      }

      // 4. 首次代理特殊处理：确保只代理一笔
      if (!order.used_transactions || order.used_transactions === 0) {
        // 首次代理，检查是否已经有能量使用记录
        const existingUsage = await this.dbService.query(`
          SELECT COUNT(*) as count 
          FROM energy_usage_logs 
          WHERE order_id = $1
        `, [order.id])
        
        if (existingUsage.rows[0].count > 0) {
          return {
            allowed: false,
            reason: 'First delegation has already been completed'
          }
        }
        
        // 首次代理允许，不需要检查时间间隔
        return { allowed: true }
      }

      // 5. 非首次代理：检查时间间隔
      if (!order.next_delegation_time) {
        return { allowed: true }
      }

      const now = new Date()
      const nextDelegationTime = new Date(order.next_delegation_time)

      // 如果当前时间已经超过下次代理时间，允许代理
      if (now >= nextDelegationTime) {
        return { allowed: true }
      }

      // 否则需要等待
      const waitTime = Math.ceil((nextDelegationTime.getTime() - now.getTime()) / 1000)
      return {
        allowed: false,
        reason: `Must wait ${waitTime} seconds before next delegation`,
        nextAllowedTime: nextDelegationTime
      }
    } catch (error) {
      logger.error('检查代理权限失败', {
        orderId: order.id,
        error: error instanceof Error ? error.message : error
      })
      return {
        allowed: false,
        reason: 'Internal error during delegation check'
      }
    }
  }

  /**
   * 批量更新订单状态
   */
  async batchUpdateOrderStatus(updates: Array<{
    orderId: string
    status?: string
    nextDelegationTime?: Date
    lastEnergyUsageTime?: Date
  }>): Promise<Array<{
    success: boolean
    orderId: string
    message: string
  }>> {
    const results = []

    for (const update of updates) {
      try {
        const fields = []
        const values = []
        let paramIndex = 1

        if (update.status) {
          fields.push(`status = $${paramIndex++}`)
          values.push(update.status)
        }

        if (update.nextDelegationTime) {
          fields.push(`next_delegation_time = $${paramIndex++}`)
          values.push(update.nextDelegationTime)
        }

        if (update.lastEnergyUsageTime) {
          fields.push(`last_energy_usage_time = $${paramIndex++}`)
          values.push(update.lastEnergyUsageTime)
        }

        if (fields.length === 0) {
          results.push({
            success: false,
            orderId: update.orderId,
            message: 'No fields to update'
          })
          continue
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`)
        values.push(update.orderId)

        const updateQuery = `
          UPDATE orders 
          SET ${fields.join(', ')}
          WHERE id = $${paramIndex} AND order_type = 'transaction_package'
        `

        const result = await this.dbService.query(updateQuery, values)

        results.push({
          success: result.rowCount > 0,
          orderId: update.orderId,
          message: result.rowCount > 0 ? 'Updated successfully' : 'Order not found'
        })
      } catch (error) {
        results.push({
          success: false,
          orderId: update.orderId,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * 获取订单概览统计
   */
  async getOrderOverviewStats(): Promise<{
    totalOrders: number
    activeOrders: number
    pendingDelegations: number
    completedOrders: number
    totalTransactions: number
    usedTransactions: number
    remainingTransactions: number
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_orders,
          COUNT(CASE WHEN status = 'active' AND remaining_transactions > 0 AND 
                      (next_delegation_time IS NULL OR next_delegation_time <= CURRENT_TIMESTAMP) THEN 1 END) as pending_delegations,
          COUNT(CASE WHEN status = 'completed' OR remaining_transactions = 0 THEN 1 END) as completed_orders,
          COALESCE(SUM(transaction_count), 0) as total_transactions,
          COALESCE(SUM(used_transactions), 0) as used_transactions,
          COALESCE(SUM(remaining_transactions), 0) as remaining_transactions
        FROM orders 
        WHERE order_type = 'transaction_package' AND payment_status = 'paid'
      `

      const result = await this.dbService.query(query)
      const stats = result.rows[0] || {}

      return {
        totalOrders: parseInt(stats.total_orders) || 0,
        activeOrders: parseInt(stats.active_orders) || 0,
        pendingDelegations: parseInt(stats.pending_delegations) || 0,
        completedOrders: parseInt(stats.completed_orders) || 0,
        totalTransactions: parseInt(stats.total_transactions) || 0,
        usedTransactions: parseInt(stats.used_transactions) || 0,
        remainingTransactions: parseInt(stats.remaining_transactions) || 0
      }
    } catch (error) {
      logger.error('获取订单概览统计失败', {
        error: error instanceof Error ? error.message : error
      })
      return {
        totalOrders: 0,
        activeOrders: 0,
        pendingDelegations: 0,
        completedOrders: 0,
        totalTransactions: 0,
        usedTransactions: 0,
        remainingTransactions: 0
      }
    }
  }

  /**
   * 获取笔数套餐订单
   */
  private async getTransactionPackageOrder(orderId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM orders 
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
}
