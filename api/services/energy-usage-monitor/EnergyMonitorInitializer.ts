/**
 * 能量监控初始化服务
 * 负责在系统启动时初始化和启动能量使用监控服务
 */
import { logger } from '../../utils/logger'
import { EnergyUsageMonitorService } from './EnergyUsageMonitorService'

export class EnergyMonitorInitializer {
  private static instance: EnergyMonitorInitializer | null = null
  private isInitialized: boolean = false

  private constructor() {}

  static getInstance(): EnergyMonitorInitializer {
    if (!EnergyMonitorInitializer.instance) {
      EnergyMonitorInitializer.instance = new EnergyMonitorInitializer()
    }
    return EnergyMonitorInitializer.instance
  }

  /**
   * 初始化能量监控系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('能量监控系统已初始化，跳过重复初始化')
      return
    }

    try {
      logger.info('🚀 开始初始化能量监控系统...')

      // 1. 获取能量使用监控服务实例
      const energyMonitorService = EnergyUsageMonitorService.getInstance()

      // 2. 启动监控服务
      logger.info('启动能量使用监控服务...')
      await energyMonitorService.start()

      // 3. 设置事件监听器
      this.setupEventListeners(energyMonitorService)

      // 4. 标记为已初始化
      this.isInitialized = true

      logger.info('✅ 能量监控系统初始化完成')
      
    } catch (error) {
      logger.error('❌ 能量监控系统初始化失败', {
        error: error instanceof Error ? error.message : error
      })
      throw error
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(energyMonitorService: EnergyUsageMonitorService): void {
    // 监听订单完成事件
    energyMonitorService.on('order:completed', (data) => {
      logger.info('📋 订单自动完成通知', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        usedTransactions: data.usedTransactions,
        totalTransactions: data.totalTransactions,
        completedAt: data.completedAt
      })
    })

    // 监听监控启动事件
    energyMonitorService.on('monitoring:started', (data) => {
      logger.info('👁️ 能量监控服务已启动', {
        monitoredOrdersCount: data.monitoredOrdersCount,
        timestamp: data.timestamp
      })
    })

    // 监听监控停止事件
    energyMonitorService.on('monitoring:stopped', (data) => {
      logger.info('🛑 能量监控服务已停止', {
        timestamp: data.timestamp
      })
    })

    // 监听错误事件
    energyMonitorService.on('error', (error) => {
      logger.error('❌ 能量监控服务错误', {
        error: error instanceof Error ? error.message : error
      })
    })

    logger.info('✅ 能量监控事件监听器设置完成')
  }

  /**
   * 检查初始化状态
   */
  isInitializationComplete(): boolean {
    return this.isInitialized
  }

  /**
   * 重新初始化（用于故障恢复）
   */
  async reinitialize(): Promise<void> {
    logger.info('🔄 重新初始化能量监控系统...')
    this.isInitialized = false
    
    try {
      // 停止现有服务
      const energyMonitorService = EnergyUsageMonitorService.getInstance()
      await energyMonitorService.stop()
      
      // 重新初始化
      await this.initialize()
      
      logger.info('✅ 能量监控系统重新初始化完成')
    } catch (error) {
      logger.error('❌ 能量监控系统重新初始化失败', {
        error: error instanceof Error ? error.message : error
      })
      throw error
    }
  }

  /**
   * 获取监控状态
   */
  getStatus(): {
    isInitialized: boolean
    monitoringStatus: any
  } {
    const energyMonitorService = EnergyUsageMonitorService.getInstance()
    
    return {
      isInitialized: this.isInitialized,
      monitoringStatus: energyMonitorService.getStatus()
    }
  }
}

// 导出单例
export const energyMonitorInitializer = EnergyMonitorInitializer.getInstance()
