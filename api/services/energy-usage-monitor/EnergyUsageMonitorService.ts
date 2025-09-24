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
    checkInterval: 30000, // 30秒检查一次
    batchSize: 10, // 每批处理10个订单
    maxRetries: 3,
    retryDelay: 5000, // 5秒重试延迟
    energyThreshold: 1000 // 能量变化阈值1000 SUN
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
  }> {
    try {
      // 获取当前能量
      const currentEnergy = await this.getCurrentEnergy(order.userAddress)
      if (currentEnergy === null) {
        return { energyUsageDetected: false, delegationTriggered: false }
      }

      const lastEnergy = this.lastEnergyStates.get(order.userAddress) || currentEnergy
      const energyChange = lastEnergy - currentEnergy
      const energyUsageDetected = energyChange > this.config.energyThreshold

      this.lastEnergyStates.set(order.userAddress, currentEnergy)

      if (energyUsageDetected && order.remainingTransactions > 0) {
        try {
          const delegationResult = await this.batchDelegationService.delegateSingleTransaction(
            order.orderId,
            order.userAddress
          )

          if (delegationResult.success) {
            this.orderMonitor.updateOrder(order.orderId, {
              usedTransactions: delegationResult.usedTransactions,
              remainingTransactions: delegationResult.remainingTransactions,
              lastEnergyUsageTime: new Date()
            })

            logger.info('自动触发能量代理成功', {
              orderId: order.orderId,
              userAddress: order.userAddress
            })

            return { energyUsageDetected: true, delegationTriggered: true }
          }
        } catch (delegationError) {
          logger.error('自动触发能量代理异常', {
            orderId: order.orderId,
            error: delegationError
          })
        }
      }

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
}

// 创建单例实例
export const energyUsageMonitorService = EnergyUsageMonitorService.getInstance()
export default energyUsageMonitorService
