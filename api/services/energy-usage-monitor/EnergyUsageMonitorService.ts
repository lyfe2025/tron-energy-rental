import { EventEmitter } from 'events'
import { logger } from '../../utils/logger'
import { BatchDelegationService } from '../BatchDelegationService'
import { tronService, TronService } from '../tron/TronService'
import { OrderMonitor } from './core/OrderMonitor'

interface MonitorConfig {
  checkInterval: number
  batchSize: number
  maxRetries: number
  retryDelay: number
  energyThreshold: number
}

/**
 * 能量使用监控服务主协调器
 * 监控笔数套餐订单用户的能量使用情况，自动触发能量代理
 */
export class EnergyUsageMonitorService extends EventEmitter {
  private static instance: EnergyUsageMonitorService | null = null
  
  private orderMonitor: OrderMonitor
  private tronService: TronService
  private batchDelegationService: BatchDelegationService
  
  private isRunning: boolean = false
  private monitorInterval: NodeJS.Timeout | null = null
  private lastEnergyStates: Map<string, number> = new Map()
  
  private config: MonitorConfig = {
    checkInterval: 10000, // 10秒检查一次（更频繁的检查）
    batchSize: 10, // 每批处理10个订单
    maxRetries: 3,
    retryDelay: 5000, // 5秒重试延迟
    energyThreshold: 5000 // 能量变化阈值5000 SUN（降低阈值提高敏感度）
  }

  private constructor() {
    super()
    this.orderMonitor = new OrderMonitor()
    this.tronService = tronService
    this.batchDelegationService = BatchDelegationService.getInstance()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EnergyUsageMonitorService {
    if (!EnergyUsageMonitorService.instance) {
      EnergyUsageMonitorService.instance = new EnergyUsageMonitorService()
    }
    return EnergyUsageMonitorService.instance
  }

  /**
   * 启动能量使用监控服务
   */
  async start(): Promise<void> {
    return this.startMonitoring()
  }

  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      logger.warn('能量使用监控服务已在运行中')
      return
    }

    try {
      logger.info('启动能量使用监控服务')
      
      // 加载需要监控的订单
      await this.orderMonitor.loadMonitoredOrders()
      
      // 启动监控循环
      this.isRunning = true
      this.startMonitoringLoop()
      
      const stats = this.orderMonitor.getStats()
      logger.info('能量使用监控服务启动成功', {
        monitoredOrdersCount: stats.totalOrders,
        checkInterval: this.config.checkInterval
      })
      
      this.emit('monitoring:started', {
        monitoredOrdersCount: stats.totalOrders,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('启动能量使用监控服务失败', {
        error: error instanceof Error ? error.message : error
      })
      throw error
    }
  }

  /**
   * 停止能量使用监控服务
   */
  async stop(): Promise<void> {
    return this.stopMonitoring()
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('能量使用监控服务未在运行')
      return
    }

    logger.info('停止能量使用监控服务')
    
    this.isRunning = false
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    
    this.lastEnergyStates.clear()
    
    logger.info('能量使用监控服务已停止')
    
    this.emit('monitoring:stopped', {
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 添加订单到监控列表
   */
  async addOrder(orderId: string): Promise<boolean> {
    return await this.orderMonitor.addOrder(orderId)
  }

  /**
   * 从监控列表移除订单
   */
  async removeOrder(orderId: string): Promise<boolean> {
    return this.orderMonitor.removeOrder(orderId)
  }

  /**
   * 获取监控状态
   */
  getStatus(): {
    isRunning: boolean
    monitoredOrdersCount: number
    config: MonitorConfig
    monitoredOrders: Array<{
      orderId: string
      userAddress: string
      remainingTransactions: number
      lastCheck: Date | null
    }>
  } {
    const stats = this.orderMonitor.getStats()
    return {
      isRunning: this.isRunning,
      monitoredOrdersCount: stats.totalOrders,
      config: { ...this.config },
      monitoredOrders: this.orderMonitor.getAllOrders().map(order => ({
        orderId: order.orderId,
        userAddress: order.userAddress,
        remainingTransactions: order.remainingTransactions,
        lastCheck: order.lastEnergyUsageTime
      }))
    }
  }

  /**
   * 手动触发特定订单的能量检查
   */
  async triggerEnergyCheck(orderId: string): Promise<{
    success: boolean
    message: string
    energyUsageDetected?: boolean
    delegationTriggered?: boolean
  }> {
    try {
      const order = this.orderMonitor.getOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found in monitoring list'
        }
      }

      logger.info('手动触发能量检查', { orderId, userAddress: order.userAddress })
      
      // 确保手动检查总是更新最后检查时间
      this.orderMonitor.updateOrder(orderId, {
        lastEnergyUsageTime: new Date()
      })
      
      // 简化的检查逻辑
      const result = await this.checkOrderEnergyUsage(order)
      
      return {
        success: true,
        message: 'Energy check completed',
        energyUsageDetected: result.energyUsageDetected,
        delegationTriggered: result.delegationTriggered
      }
    } catch (error) {
      logger.error('手动触发能量检查失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      
      // 即使出错也要更新最后检查时间
      try {
        this.orderMonitor.updateOrder(orderId, {
          lastEnergyUsageTime: new Date()
        })
      } catch (updateError) {
        logger.debug('更新最后检查时间失败', { orderId, updateError })
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private startMonitoringLoop(): void {
    this.monitorInterval = setInterval(async () => {
      if (!this.isRunning) {
        return
      }

      try {
        await this.performMonitoringCycle()
      } catch (error) {
        logger.error('监控循环执行异常', {
          error: error instanceof Error ? error.message : error
        })
        this.emit('error', error)
      }
    }, this.config.checkInterval)
  }

  private async performMonitoringCycle(): Promise<void> {
    const orders = this.orderMonitor.getAllOrders()
    
    if (orders.length === 0) {
      logger.debug('没有需要监控的订单')
      return
    }

    logger.debug('开始监控循环', {
      ordersCount: orders.length,
      batchSize: this.config.batchSize
    })

    // 简化处理：只处理前几个订单
    const processOrders = orders.slice(0, this.config.batchSize)
    
    for (const order of processOrders) {
      try {
        await this.checkOrderEnergyUsage(order)
      } catch (error) {
        logger.error('检查订单能量使用失败', {
          orderId: order.orderId,
          error: error instanceof Error ? error.message : error
        })
      }
    }
  }

  private async checkOrderEnergyUsage(order: any): Promise<{
    energyUsageDetected: boolean
    delegationTriggered: boolean
    orderCompleted?: boolean
  }> {
    try {
      // 获取当前能量
      const currentEnergy = await this.getCurrentEnergy(order.userAddress)
      if (currentEnergy === null) {
        return { energyUsageDetected: false, delegationTriggered: false }
      }

      // 获取我们上次代理的能量信息
      const ourLastDelegation = await this.getLastDelegationInfo(order.orderId)
      if (!ourLastDelegation) {
        logger.debug('未找到上次代理信息，跳过检查', {
          orderId: order.orderId
        })
        return { energyUsageDetected: false, delegationTriggered: false }
      }

      // 计算时间间隔 - 至少等待5分钟后再检查
      const timeSinceLastDelegation = Date.now() - ourLastDelegation.delegationTime.getTime()
      const minWaitTime = 5 * 60 * 1000 // 5分钟
      
      if (timeSinceLastDelegation < minWaitTime) {
        logger.debug('代理时间间隔不足，等待更多时间', {
          orderId: order.orderId,
          timeSinceLastDelegation: Math.round(timeSinceLastDelegation / 1000),
          minWaitTime: Math.round(minWaitTime / 1000)
        })
        return { energyUsageDetected: false, delegationTriggered: false }
      }

      // 更精确的能量检测逻辑：检查是否我们代理的能量被大量使用
      const expectedEnergyAfterDelegation = ourLastDelegation.energyBeforeDelegation + ourLastDelegation.energyDelegated
      const energyFromOurDelegation = Math.max(0, currentEnergy - ourLastDelegation.energyBeforeDelegation)
      const ourEnergyConsumed = Math.max(0, ourLastDelegation.energyDelegated - energyFromOurDelegation)
      
      // 判断我们代理的能量是否被大量消耗（至少80%）
      const ourEnergyUsageRatio = ourEnergyConsumed / ourLastDelegation.energyDelegated
      const energyUsageDetected = ourEnergyUsageRatio >= 0.8 || currentEnergy <= 1000

      // 更新状态记录
      this.lastEnergyStates.set(order.userAddress, currentEnergy)

      logger.debug('精确能量使用检测', {
        orderId: order.orderId,
        userAddress: order.userAddress.substring(0, 10) + '...',
        currentEnergy,
        ourLastDelegation: {
          energyBeforeDelegation: ourLastDelegation.energyBeforeDelegation,
          energyDelegated: ourLastDelegation.energyDelegated,
          delegationTime: ourLastDelegation.delegationTime
        },
        expectedEnergyAfterDelegation,
        energyFromOurDelegation,
        ourEnergyConsumed,
        ourEnergyUsageRatio: Math.round(ourEnergyUsageRatio * 100) + '%',
        energyUsageDetected,
        remainingTransactions: order.remainingTransactions
      })

      if (energyUsageDetected && order.remainingTransactions > 0) {
        try {
          logger.info('检测到我们代理的能量被使用，触发下一笔代理', {
            orderId: order.orderId,
            userAddress: order.userAddress.substring(0, 10) + '...',
            ourEnergyUsageRatio: Math.round(ourEnergyUsageRatio * 100) + '%',
            ourEnergyConsumed,
            energyDelegated: ourLastDelegation.energyDelegated,
            remainingTransactions: order.remainingTransactions
          })

          const delegationResult = await this.batchDelegationService.delegateSingleTransaction(
            order.orderId,
            order.userAddress
          )

          if (delegationResult.success) {
            // 更新订单信息
            this.orderMonitor.updateOrder(order.orderId, {
              usedTransactions: delegationResult.usedTransactions,
              remainingTransactions: delegationResult.remainingTransactions,
              lastEnergyUsageTime: new Date()
            })

            logger.info('🚀 自动触发能量代理成功', {
              orderId: order.orderId,
              userAddress: order.userAddress.substring(0, 10) + '...',
              usedTransactions: delegationResult.usedTransactions,
              remainingTransactions: delegationResult.remainingTransactions
            })

            // 检查是否所有笔数已用完
            if (delegationResult.remainingTransactions <= 0) {
              await this.completeOrder(order.orderId)
              return { 
                energyUsageDetected: true, 
                delegationTriggered: true, 
                orderCompleted: true 
              }
            }

            return { energyUsageDetected: true, delegationTriggered: true }
          } else {
            logger.warn('自动触发能量代理失败', {
              orderId: order.orderId,
              reason: delegationResult.message
            })
          }
        } catch (delegationError) {
          logger.error('自动触发能量代理异常', {
            orderId: order.orderId,
            error: delegationError instanceof Error ? delegationError.message : delegationError
          })
        }
      } else if (order.remainingTransactions <= 0) {
        // 如果没有剩余笔数，完成订单
        await this.completeOrder(order.orderId)
        return { 
          energyUsageDetected: false, 
          delegationTriggered: false, 
          orderCompleted: true 
        }
      }

      // 无论是否触发代理，都更新最后检查时间
      this.orderMonitor.updateOrder(order.orderId, {
        lastEnergyUsageTime: new Date()
      })

      return { energyUsageDetected, delegationTriggered: false }
    } catch (error) {
      logger.error('检查订单能量使用异常', {
        orderId: order.orderId,
        error: error instanceof Error ? error.message : error
      })
      return { energyUsageDetected: false, delegationTriggered: false }
    }
  }

  private async getCurrentEnergy(address: string): Promise<number | null> {
    try {
      const accountInfo = await this.tronService.getAccountInfo(address)
      return accountInfo.data?.energy || 0
    } catch (error) {
      logger.error('获取账户能量失败', { address, error })
      return null
    }
  }

  /**
   * 获取上次代理信息
   */
  private async getLastDelegationInfo(orderId: string): Promise<{
    energyDelegated: number
    energyBeforeDelegation: number
    delegationTime: Date
  } | null> {
    try {
      const { DatabaseService } = await import('../../database/DatabaseService')
      const dbService = DatabaseService.getInstance()

      // 查询最近一次代理记录
      const query = `
        SELECT 
          o.used_transactions,
          o.last_energy_usage_time,
          pc.config
        FROM orders o
        LEFT JOIN price_configs pc ON o.price_config_id = pc.id
        WHERE o.id = $1 
          AND o.order_type = 'transaction_package'
        ORDER BY o.updated_at DESC
        LIMIT 1
      `

      const result = await dbService.query(query, [orderId])
      
      if (result.rows.length === 0 || !result.rows[0].last_energy_usage_time) {
        return null
      }

      const orderData = result.rows[0]
      const config = orderData.config || {}
      
      // 从配置中获取每笔能量数量（默认65000）
      const energyPerTransaction = config.energy_per_transaction || 65000
      
      // 查询最近的代理跟踪记录
      const energyLogQuery = `
        SELECT energy_before, energy_after, energy_amount, created_at
        FROM energy_usage_logs
        WHERE order_id = $1 
          AND detection_method = 'delegation_tracking'
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      const energyLogResult = await dbService.query(energyLogQuery, [orderId])
      let energyBeforeDelegation = 0
      let actualEnergyDelegated = energyPerTransaction
      
      if (energyLogResult.rows.length > 0) {
        const logRecord = energyLogResult.rows[0]
        // 使用记录中的代理前能量状态
        energyBeforeDelegation = logRecord.energy_before || 0
        // 使用实际记录的代理能量数量
        actualEnergyDelegated = logRecord.energy_amount || energyPerTransaction
        
        logger.debug('找到代理跟踪记录', {
          orderId,
          energyBefore: energyBeforeDelegation,
          energyAfter: logRecord.energy_after,
          energyDelegated: actualEnergyDelegated
        })
      } else {
        logger.debug('未找到代理跟踪记录，使用默认值', {
          orderId,
          defaultEnergy: energyPerTransaction
        })
      }

      return {
        energyDelegated: actualEnergyDelegated,
        energyBeforeDelegation,
        delegationTime: new Date(orderData.last_energy_usage_time)
      }
    } catch (error) {
      logger.error('获取代理信息失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return null
    }
  }

  /**
   * 完成订单 - 当所有笔数用完时调用
   */
  private async completeOrder(orderId: string): Promise<void> {
    try {
      const { DatabaseService } = await import('../../database/DatabaseService')
      const dbService = DatabaseService.getInstance()

      // 更新订单状态为已完成
      const updateQuery = `
        UPDATE orders 
        SET 
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
          AND order_type = 'transaction_package'
          AND status = 'active'
        RETURNING id, order_number, used_transactions, transaction_count
      `

      const result = await dbService.query(updateQuery, [orderId])
      
      if (result.rows.length > 0) {
        const order = result.rows[0]
        
        logger.info('✅ 笔数套餐订单自动完成', {
          orderId: orderId,
          orderNumber: order.order_number,
          usedTransactions: order.used_transactions,
          totalTransactions: order.transaction_count,
          completedAt: new Date().toISOString()
        })

        // 从监控列表中移除已完成的订单
        this.orderMonitor.removeOrder(orderId)

        // 发送事件通知
        this.emit('order:completed', {
          orderId: orderId,
          orderNumber: order.order_number,
          completedAt: new Date(),
          usedTransactions: order.used_transactions,
          totalTransactions: order.transaction_count
        })
      } else {
        logger.warn('尝试完成订单失败：订单未找到或状态不符', {
          orderId: orderId
        })
      }
    } catch (error) {
      logger.error('完成订单异常', {
        orderId: orderId,
        error: error instanceof Error ? error.message : error
      })
    }
  }
}

// 创建单例实例
export const energyUsageMonitorService = EnergyUsageMonitorService.getInstance()
export default energyUsageMonitorService
