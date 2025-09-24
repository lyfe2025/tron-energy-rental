import { EventEmitter } from 'events'
import { logger } from '../../../utils/logger'
import { ConfigManager } from '../core/ConfigManager'
import { OrderManager } from '../core/OrderManager'
import { FeeCheckProcessor } from './FeeCheckProcessor'

/**
 * 批量处理器
 * 负责批量处理任务的调度和执行
 */
export class BatchProcessor extends EventEmitter {
  private orderManager: OrderManager
  private configManager: ConfigManager
  private feeCheckProcessor: FeeCheckProcessor
  private processingInterval: NodeJS.Timeout | null = null
  private isProcessing: boolean = false

  constructor(orderManager: OrderManager, configManager: ConfigManager, feeCheckProcessor: FeeCheckProcessor) {
    super()
    this.orderManager = orderManager
    this.configManager = configManager
    this.feeCheckProcessor = feeCheckProcessor
  }

  /**
   * 启动批量处理循环
   */
  startProcessing(): void {
    if (this.processingInterval) {
      logger.warn('批量处理器已在运行')
      return
    }

    const config = this.configManager.getConfig()
    
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing) {
        return
      }

      try {
        // 检查是否到了日费检查时间
        if (this.configManager.shouldPerformDailyFeeCheck()) {
          await this.processBatch()
        }
      } catch (error) {
        logger.error('批量处理循环执行异常', {
          error: error instanceof Error ? error.message : error
        })
        this.emit('error', error)
      }
    }, config.checkInterval)

    logger.info('批量处理器已启动', {
      checkInterval: config.checkInterval
    })
  }

  /**
   * 停止批量处理循环
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      logger.info('批量处理器已停止')
    }
  }

  /**
   * 执行一次批量处理
   */
  async processBatch(): Promise<{
    success: boolean
    processedCount: number
    feeDeductedCount: number
    totalFeeAmount: number
  }> {
    if (this.isProcessing) {
      logger.warn('批量处理正在进行中，跳过本次执行')
      return {
        success: false,
        processedCount: 0,
        feeDeductedCount: 0,
        totalFeeAmount: 0
      }
    }

    this.isProcessing = true
    const startTime = Date.now()

    try {
      logger.info('开始批量处理日费检查')

      const result = await this.feeCheckProcessor.performDailyFeeCheck()

      const executionTime = Date.now() - startTime
      
      logger.info('批量处理完成', {
        ...result,
        executionTime: `${executionTime}ms`
      })

      this.emit('batch:completed', {
        ...result,
        executionTime,
        timestamp: new Date().toISOString()
      })

      return {
        success: true,
        ...result
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      
      logger.error('批量处理失败', {
        error: error instanceof Error ? error.message : error,
        executionTime: `${executionTime}ms`
      })

      this.emit('batch:failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        processedCount: 0,
        feeDeductedCount: 0,
        totalFeeAmount: 0
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 手动触发批量处理
   */
  async triggerBatchProcess(): Promise<{
    success: boolean
    message: string
    processedCount: number
    feeDeductedCount: number
    totalFeeAmount: number
  }> {
    try {
      logger.info('手动触发批量处理')
      
      const result = await this.processBatch()
      
      return {
        success: result.success,
        message: result.success ? 'Batch processing completed successfully' : 'Batch processing failed',
        processedCount: result.processedCount,
        feeDeductedCount: result.feeDeductedCount,
        totalFeeAmount: result.totalFeeAmount
      }
    } catch (error) {
      logger.error('手动触发批量处理失败', {
        error: error instanceof Error ? error.message : error
      })
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
   * 获取处理状态
   */
  getProcessingStatus(): {
    isRunning: boolean
    isProcessing: boolean
    nextCheckTime: Date | null
    ordersCount: number
  } {
    return {
      isRunning: this.processingInterval !== null,
      isProcessing: this.isProcessing,
      nextCheckTime: this.configManager.calculateNextFeeCheckTime(),
      ordersCount: this.orderManager.size()
    }
  }

  /**
   * 重新加载订单
   */
  async reloadOrders(): Promise<void> {
    try {
      logger.info('重新加载订单')
      await this.orderManager.loadDailyFeeOrders()
      
      this.emit('orders:reloaded', {
        count: this.orderManager.size(),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('重新加载订单失败', {
        error: error instanceof Error ? error.message : error
      })
      throw error
    }
  }
}
