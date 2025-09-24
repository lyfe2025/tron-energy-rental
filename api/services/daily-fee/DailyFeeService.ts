import { EventEmitter } from 'events'
import { logger } from '../../utils/logger'
import { ConfigManager } from './core/ConfigManager'
import { FeeCalculator } from './core/FeeCalculator'
import { OrderManager } from './core/OrderManager'
import { ErrorHandler } from './handlers/ErrorHandler'
import { EventHandler } from './handlers/EventHandler'
import { BatchProcessor } from './processors/BatchProcessor'
import { FeeCheckProcessor } from './processors/FeeCheckProcessor'

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

interface DailyFeeConfig {
  checkInterval: number
  batchSize: number
  maxRetries: number
  retryDelay: number
  feeCheckTime: string
  gracePeriodHours: number
  inactiveThresholdHours: number
}

/**
 * 日费服务主协调器
 * 整合所有日费相关功能的主入口点
 */
export class DailyFeeService extends EventEmitter {
  private static instance: DailyFeeService | null = null
  
  private feeCalculator: FeeCalculator
  private orderManager: OrderManager
  private configManager: ConfigManager
  private feeCheckProcessor: FeeCheckProcessor
  private batchProcessor: BatchProcessor
  private eventHandler: EventHandler
  private errorHandler: ErrorHandler
  
  private isRunning: boolean = false

  private constructor() {
    super()
    
    // 初始化所有组件
    this.configManager = new ConfigManager()
    this.orderManager = new OrderManager()
    this.eventHandler = new EventHandler()
    this.errorHandler = new ErrorHandler()
    
    // 创建费用计算器
    const config = this.configManager.getConfig()
    this.feeCalculator = new FeeCalculator({
      inactiveThresholdHours: config.inactiveThresholdHours,
      gracePeriodHours: config.gracePeriodHours
    })
    
    // 创建处理器
    this.feeCheckProcessor = new FeeCheckProcessor(
      this.feeCalculator,
      this.orderManager,
      this.configManager
    )
    
    this.batchProcessor = new BatchProcessor(
      this.orderManager,
      this.configManager,
      this.feeCheckProcessor
    )
    
    this.setupEventHandlers()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DailyFeeService {
    if (!DailyFeeService.instance) {
      DailyFeeService.instance = new DailyFeeService()
    }
    return DailyFeeService.instance
  }

  /**
   * 启动日费服务
   */
  async start(): Promise<void> {
    return this.startService()
  }

  /**
   * 启动日费服务
   */
  async startService(): Promise<void> {
    if (this.isRunning) {
      logger.warn('日费服务已在运行中')
      return
    }

    try {
      logger.info('启动日费服务')
      
      // 加载配置
      await this.configManager.loadConfig()
      
      // 加载需要处理的订单
      await this.orderManager.loadDailyFeeOrders()
      
      // 启动批量处理器
      this.batchProcessor.startProcessing()
      
      this.isRunning = true
      
      logger.info('日费服务启动成功', {
        dailyFeeOrdersCount: this.orderManager.size(),
        checkInterval: this.configManager.getConfig().checkInterval,
        feeCheckTime: this.configManager.getConfig().feeCheckTime
      })
      
      this.emit('service:started', {
        dailyFeeOrdersCount: this.orderManager.size(),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      this.errorHandler.handleServiceStartError(error as Error)
      throw error
    }
  }

  /**
   * 停止日费服务
   */
  async stop(): Promise<void> {
    return this.stopService()
  }

  /**
   * 停止日费服务
   */
  async stopService(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('日费服务未在运行')
      return
    }

    logger.info('停止日费服务')
    
    this.isRunning = false
    
    // 停止批量处理器
    this.batchProcessor.stopProcessing()
    
    // 清空订单管理器
    this.orderManager.clear()
    
    logger.info('日费服务已停止')
    
    this.emit('service:stopped', {
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 手动触发日费检查
   */
  async triggerFeeCheck(orderId?: string): Promise<any> {
    if (orderId) {
      return this.triggerOrderFeeCheck(orderId)
    }
    return this.triggerDailyFeeCheck()
  }

  /**
   * 手动触发日费检查
   */
  async triggerDailyFeeCheck(): Promise<{
    success: boolean
    message: string
    processedCount: number
    feeDeductedCount: number
    totalFeeAmount: number
  }> {
    try {
      logger.info('手动触发日费检查')
      
      const result = await this.batchProcessor.triggerBatchProcess()
      
      return {
        success: result.success,
        message: result.message,
        processedCount: result.processedCount,
        feeDeductedCount: result.feeDeductedCount,
        totalFeeAmount: result.totalFeeAmount
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        processedCount: 0,
        feeDeductedCount: 0,
        totalFeeAmount: 0
      }
    }
  }

  /**
   * 手动触发特定订单的费用检查
   */
  async triggerOrderFeeCheck(orderId: string): Promise<{
    success: boolean
    message: string
    feeDeducted: boolean
    feeAmount?: number
    remainingTransactions?: number
  }> {
    try {
      return await this.feeCheckProcessor.triggerOrderFeeCheck(orderId)
    } catch (error) {
      this.errorHandler.handleOrderProcessingError(error as Error, orderId)
      return {
        success: false,
        message: (error as Error).message || 'Unknown error',
        feeDeducted: false
      }
    }
  }

  /**
   * 添加订单到日费处理列表
   */
  async addOrder(orderId: string): Promise<boolean> {
    return this.addOrderToFeeProcessing(orderId)
  }

  /**
   * 添加订单到日费处理列表
   */
  async addOrderToFeeProcessing(orderId: string): Promise<boolean> {
    try {
      const success = await this.orderManager.addOrderToFeeProcessing(orderId)
      
      if (success) {
        const order = this.orderManager.getOrder(orderId)
        this.emit('order:added', {
          orderId,
          userAddress: order?.userAddress,
          timestamp: new Date().toISOString()
        })
      }
      
      return success
    } catch (error) {
      this.errorHandler.handleOrderProcessingError(error as Error, orderId)
      return false
    }
  }

  /**
   * 从日费处理列表移除订单
   */
  async removeOrder(orderId: string): Promise<boolean> {
    return this.removeOrderFromFeeProcessing(orderId)
  }

  /**
   * 从日费处理列表移除订单
   */
  async removeOrderFromFeeProcessing(orderId: string): Promise<boolean> {
    try {
      const order = this.orderManager.getOrder(orderId)
      const success = this.orderManager.removeOrderFromFeeProcessing(orderId)
      
      if (success && order) {
        this.emit('order:removed', {
          orderId,
          userAddress: order.userAddress,
          timestamp: new Date().toISOString()
        })
      }
      
      return success
    } catch (error) {
      this.errorHandler.handleOrderProcessingError(error as Error, orderId)
      return false
    }
  }

  /**
   * 获取日费服务状态
   */
  getStatus(): {
    isRunning: boolean
    dailyFeeOrdersCount: number
    config: DailyFeeConfig
    nextFeeCheckTime: string | null
    dailyFeeOrders: Array<{
      orderId: string
      userAddress: string
      remainingTransactions: number
      dailyFee: number
      lastCheck: Date | null
      daysSinceLastUsage: number
    }>
  } {
    const config = this.configManager.getConfig()
    const nextFeeCheckTime = this.configManager.calculateNextFeeCheckTime()
    const now = new Date()
    
    return {
      isRunning: this.isRunning,
      dailyFeeOrdersCount: this.orderManager.size(),
      config,
      nextFeeCheckTime: nextFeeCheckTime ? nextFeeCheckTime.toISOString() : null,
      dailyFeeOrders: this.orderManager.getAllOrders().map(order => {
        const daysSinceLastUsage = order.lastEnergyUsageTime 
          ? Math.floor((now.getTime() - order.lastEnergyUsageTime.getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          orderId: order.orderId,
          userAddress: order.userAddress,
          remainingTransactions: order.remainingTransactions,
          dailyFee: order.dailyFee,
          lastCheck: order.dailyFeeLastCheck,
          daysSinceLastUsage
        }
      })
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
      return await this.feeCalculator.getOrderFeeHistory(orderId, limit, offset)
    } catch (error) {
      this.errorHandler.handleOrderProcessingError(error as Error, orderId)
      return []
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 费用检查处理器事件
    this.feeCheckProcessor.on('fee:deducted', this.eventHandler.handleFeeDeducted.bind(this.eventHandler))
    this.feeCheckProcessor.on('order:expired', this.eventHandler.handleOrderExpired.bind(this.eventHandler))
    this.feeCheckProcessor.on('daily-fee-check:completed', this.eventHandler.handleDailyFeeCheckCompleted.bind(this.eventHandler))
    this.feeCheckProcessor.on('error', this.errorHandler.handleError.bind(this.errorHandler))

    // 批量处理器事件
    this.batchProcessor.on('batch:completed', this.eventHandler.handleBatchCompleted.bind(this.eventHandler))
    this.batchProcessor.on('batch:failed', this.eventHandler.handleBatchFailed.bind(this.eventHandler))
    this.batchProcessor.on('orders:reloaded', this.eventHandler.handleOrdersReloaded.bind(this.eventHandler))
    this.batchProcessor.on('error', this.errorHandler.handleError.bind(this.errorHandler))

    // 服务级别事件
    this.on('service:started', this.eventHandler.handleServiceStarted.bind(this.eventHandler))
    this.on('service:stopped', this.eventHandler.handleServiceStopped.bind(this.eventHandler))
    this.on('order:added', this.eventHandler.handleOrderAdded.bind(this.eventHandler))
    this.on('order:removed', this.eventHandler.handleOrderRemoved.bind(this.eventHandler))
    this.on('error', this.errorHandler.handleError.bind(this.errorHandler))
  }
}

// 创建单例实例
export const dailyFeeService = DailyFeeService.getInstance()
export default dailyFeeService
