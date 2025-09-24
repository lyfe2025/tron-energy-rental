import { DatabaseService } from '../../../database/DatabaseService'
import { logger } from '../../../utils/logger'

interface MonitoredOrder {
  orderId: string
  userAddress: string
  transactionCount: number
  usedTransactions: number
  remainingTransactions: number
  lastEnergyUsageTime: Date | null
  nextDelegationTime: Date | null
  energyPerTransaction: number
  isActive: boolean
}

/**
 * 订单监控器
 * 负责管理需要监控的订单
 */
export class OrderMonitor {
  private dbService: DatabaseService
  private monitoredOrders: Map<string, MonitoredOrder> = new Map()

  constructor() {
    this.dbService = DatabaseService.getInstance()
  }

  /**
   * 加载需要监控的订单
   */
  async loadMonitoredOrders(): Promise<void> {
    try {
      const query = `
        SELECT 
          o.id as order_id, o.target_address as user_address,
          o.transaction_count, o.used_transactions, o.remaining_transactions,
          o.last_energy_usage_time, o.next_delegation_time
        FROM orders o
        WHERE 
          o.order_type = 'transaction_package'
          AND o.status = 'active'
          AND o.payment_status = 'paid'
          AND o.remaining_transactions > 0
        ORDER BY o.created_at DESC
      `

      const result = await this.dbService.query(query)
      const energyPerTransaction = 65000 // 默认值

      this.monitoredOrders.clear()

      for (const row of result.rows) {
        const order: MonitoredOrder = {
          orderId: row.order_id,
          userAddress: row.user_address,
          transactionCount: row.transaction_count || 0,
          usedTransactions: row.used_transactions || 0,
          remainingTransactions: row.remaining_transactions || 0,
          lastEnergyUsageTime: row.last_energy_usage_time,
          nextDelegationTime: row.next_delegation_time,
          energyPerTransaction,
          isActive: true
        }

        this.monitoredOrders.set(order.orderId, order)
      }

      logger.info('监控订单加载完成', {
        count: this.monitoredOrders.size
      })
    } catch (error) {
      logger.error('加载监控订单失败', {
        error: error instanceof Error ? error.message : error
      })
      throw error
    }
  }

  /**
   * 添加订单到监控
   */
  async addOrder(orderId: string): Promise<boolean> {
    try {
      const order = await this.loadOrderForMonitoring(orderId)
      if (!order) {
        return false
      }

      this.monitoredOrders.set(orderId, order)
      logger.info('订单已添加到监控列表', { orderId })
      return true
    } catch (error) {
      logger.error('添加订单到监控列表失败', { orderId, error })
      return false
    }
  }

  /**
   * 移除订单
   */
  removeOrder(orderId: string): boolean {
    const removed = this.monitoredOrders.delete(orderId)
    if (removed) {
      logger.info('订单已从监控列表移除', { orderId })
    }
    return removed
  }

  /**
   * 获取所有监控的订单
   */
  getAllOrders(): MonitoredOrder[] {
    return Array.from(this.monitoredOrders.values())
  }

  /**
   * 获取特定订单
   */
  getOrder(orderId: string): MonitoredOrder | undefined {
    return this.monitoredOrders.get(orderId)
  }

  /**
   * 更新订单信息
   */
  updateOrder(orderId: string, updates: Partial<MonitoredOrder>): void {
    const order = this.monitoredOrders.get(orderId)
    if (order) {
      Object.assign(order, updates)
    }
  }

  /**
   * 获取监控统计
   */
  getStats(): {
    totalOrders: number
    activeOrders: number
    uniqueAddresses: number
  } {
    const orders = this.getAllOrders()
    const addresses = new Set(orders.map(o => o.userAddress))
    
    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(o => o.isActive).length,
      uniqueAddresses: addresses.size
    }
  }

  private async loadOrderForMonitoring(orderId: string): Promise<MonitoredOrder | null> {
    try {
      const query = `
        SELECT 
          o.id as order_id, o.target_address as user_address,
          o.transaction_count, o.used_transactions, o.remaining_transactions,
          o.last_energy_usage_time, o.next_delegation_time
        FROM orders o
        WHERE 
          o.id = $1
          AND o.order_type = 'transaction_package'
          AND o.status = 'active'
          AND o.payment_status = 'paid'
          AND o.remaining_transactions > 0
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
        nextDelegationTime: row.next_delegation_time,
        energyPerTransaction: 65000,
        isActive: true
      }
    } catch (error) {
      logger.error('加载订单监控信息失败', { orderId, error })
      return null
    }
  }
}
