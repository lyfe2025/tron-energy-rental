import { DatabaseService } from '../../../database/DatabaseService'
import { logger } from '../../../utils/logger'

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
 * 订单管理器
 * 负责日费订单的加载、管理和状态维护
 */
export class OrderManager {
  private dbService: DatabaseService
  private dailyFeeOrders: Map<string, DailyFeeOrder> = new Map()

  constructor() {
    this.dbService = DatabaseService.getInstance()
  }

  /**
   * 加载所有需要处理日费的订单
   */
  async loadDailyFeeOrders(): Promise<void> {
    try {
      const query = `
        SELECT 
          o.id as order_id, o.target_address as user_address,
          o.transaction_count, o.used_transactions, o.remaining_transactions,
          o.last_energy_usage_time, o.daily_fee_last_check, o.created_at,
          pc.daily_fee
        FROM orders o
        JOIN price_configs pc ON o.price_config_id = pc.id
        WHERE 
          o.order_type = 'transaction_package'
          AND o.status = 'active'
          AND o.payment_status = 'paid'
          AND o.remaining_transactions > 0
          AND pc.daily_fee > 0
        ORDER BY o.created_at DESC
      `

      const result = await this.dbService.query(query)

      this.dailyFeeOrders.clear()

      for (const row of result.rows) {
        const order: DailyFeeOrder = {
          orderId: row.order_id,
          userAddress: row.user_address,
          transactionCount: row.transaction_count || 0,
          usedTransactions: row.used_transactions || 0,
          remainingTransactions: row.remaining_transactions || 0,
          lastEnergyUsageTime: row.last_energy_usage_time,
          dailyFeeLastCheck: row.daily_fee_last_check,
          dailyFee: parseFloat(row.daily_fee) || 0,
          createdAt: row.created_at,
          isActive: true
        }

        this.dailyFeeOrders.set(order.orderId, order)
      }

      logger.info('日费订单加载完成', {
        count: this.dailyFeeOrders.size
      })
    } catch (error) {
      logger.error('加载日费订单失败', {
        error: error instanceof Error ? error.message : error
      })
      throw error
    }
  }

  /**
   * 加载单个订单用于日费处理
   */
  async loadOrderForFeeProcessing(orderId: string): Promise<DailyFeeOrder | null> {
    try {
      const query = `
        SELECT 
          o.id as order_id, o.target_address as user_address,
          o.transaction_count, o.used_transactions, o.remaining_transactions,
          o.last_energy_usage_time, o.daily_fee_last_check, o.created_at,
          pc.daily_fee
        FROM orders o
        JOIN price_configs pc ON o.price_config_id = pc.id
        WHERE 
          o.id = $1
          AND o.order_type = 'transaction_package'
          AND o.status = 'active'
          AND o.payment_status = 'paid'
          AND o.remaining_transactions > 0
          AND pc.daily_fee > 0
      `

      const result = await this.dbService.query(query, [orderId])
      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        orderId: row.order_id,
        userAddress: row.user_address,
        transactionCount: row.transaction_count || 0,
        usedTransactions: row.used_transactions || 0,
        remainingTransactions: row.remaining_transactions || 0,
        lastEnergyUsageTime: row.last_energy_usage_time,
        dailyFeeLastCheck: row.daily_fee_last_check,
        dailyFee: parseFloat(row.daily_fee) || 0,
        createdAt: row.created_at,
        isActive: true
      }
    } catch (error) {
      logger.error('加载订单日费处理信息失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return null
    }
  }

  /**
   * 添加订单到日费处理列表
   */
  async addOrderToFeeProcessing(orderId: string): Promise<boolean> {
    try {
      const order = await this.loadOrderForFeeProcessing(orderId)
      if (!order) {
        logger.warn('无法添加订单到日费处理列表，订单不存在或不符合条件', { orderId })
        return false
      }

      this.dailyFeeOrders.set(orderId, order)
      
      logger.info('订单已添加到日费处理列表', {
        orderId,
        userAddress: order.userAddress,
        remainingTransactions: order.remainingTransactions,
        dailyFee: order.dailyFee
      })
      
      return true
    } catch (error) {
      logger.error('添加订单到日费处理列表失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return false
    }
  }

  /**
   * 从日费处理列表移除订单
   */
  removeOrderFromFeeProcessing(orderId: string): boolean {
    const order = this.dailyFeeOrders.get(orderId)
    if (!order) {
      logger.warn('订单不在日费处理列表中', { orderId })
      return false
    }

    this.dailyFeeOrders.delete(orderId)
    
    logger.info('订单已从日费处理列表移除', {
      orderId,
      userAddress: order.userAddress
    })
    
    return true
  }

  /**
   * 获取订单
   */
  getOrder(orderId: string): DailyFeeOrder | undefined {
    return this.dailyFeeOrders.get(orderId)
  }

  /**
   * 获取所有订单
   */
  getAllOrders(): DailyFeeOrder[] {
    return Array.from(this.dailyFeeOrders.values())
  }

  /**
   * 更新订单状态
   */
  updateOrder(orderId: string, updates: Partial<DailyFeeOrder>): void {
    const order = this.dailyFeeOrders.get(orderId)
    if (order) {
      Object.assign(order, updates)
    }
  }

  /**
   * 清空所有订单
   */
  clear(): void {
    this.dailyFeeOrders.clear()
  }

  /**
   * 获取订单数量
   */
  size(): number {
    return this.dailyFeeOrders.size
  }

  /**
   * 检查订单是否存在
   */
  hasOrder(orderId: string): boolean {
    return this.dailyFeeOrders.has(orderId)
  }
}
