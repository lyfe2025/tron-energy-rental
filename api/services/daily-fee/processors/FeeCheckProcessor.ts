import { EventEmitter } from 'events'
import { logger } from '../../../utils/logger'
import { ConfigManager } from '../core/ConfigManager'
import { FeeCalculator } from '../core/FeeCalculator'
import { OrderManager } from '../core/OrderManager'

interface FeeDeductionResult {
  orderId: string
  feeAmount: number
  feeReason: string
  lastUsageTime: Date | null
  remainingBefore: number
  remainingAfter: number
  success: boolean
  message: string
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
 * 费用检查处理器
 * 负责执行日费检查逻辑和批量处理
 */
export class FeeCheckProcessor extends EventEmitter {
  private feeCalculator: FeeCalculator
  private orderManager: OrderManager
  private configManager: ConfigManager

  constructor(feeCalculator: FeeCalculator, orderManager: OrderManager, configManager: ConfigManager) {
    super()
    this.feeCalculator = feeCalculator
    this.orderManager = orderManager
    this.configManager = configManager
  }

  /**
   * 执行日费检查
   */
  async performDailyFeeCheck(): Promise<{
    processedCount: number
    feeDeductedCount: number
    totalFeeAmount: number
  }> {
    const startTime = Date.now()
    const orders = this.orderManager.getAllOrders()
    const config = this.configManager.getConfig()
    
    if (orders.length === 0) {
      logger.debug('没有需要处理日费的订单')
      return {
        processedCount: 0,
        feeDeductedCount: 0,
        totalFeeAmount: 0
      }
    }

    logger.info('开始执行日费检查', {
      ordersCount: orders.length,
      batchSize: config.batchSize
    })

    let processedCount = 0
    let feeDeductedCount = 0
    let totalFeeAmount = 0

    // 分批处理订单
    for (let i = 0; i < orders.length; i += config.batchSize) {
      const batch = orders.slice(i, i + config.batchSize)
      
      const batchPromises = batch.map(async (order) => {
        try {
          const result = await this.checkOrderDailyFee(order)
          processedCount++
          
          if (result.success) {
            feeDeductedCount++
            totalFeeAmount += result.feeAmount
            
            // 更新本地订单状态
            this.orderManager.updateOrder(order.orderId, {
              remainingTransactions: result.remainingAfter,
              dailyFeeLastCheck: new Date()
            })
            
            // 如果剩余笔数为0，从监控列表移除
            if (result.remainingAfter <= 0) {
              this.orderManager.removeOrderFromFeeProcessing(order.orderId)
              this.emit('order:expired', {
                orderId: order.orderId,
                userAddress: order.userAddress,
                timestamp: new Date().toISOString()
              })
            }
          }
          
          return result
        } catch (error) {
          logger.error('检查订单日费失败', {
            orderId: order.orderId,
            userAddress: order.userAddress,
            error: error instanceof Error ? error.message : error
          })
          processedCount++
          return {
            orderId: order.orderId,
            feeAmount: 0,
            feeReason: 'error',
            lastUsageTime: null,
            remainingBefore: order.remainingTransactions,
            remainingAfter: order.remainingTransactions,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      await Promise.allSettled(batchPromises)
      
      // 批次间短暂延迟，避免过载
      if (i + config.batchSize < orders.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const executionTime = Date.now() - startTime
    
    logger.info('日费检查完成', {
      processedCount,
      feeDeductedCount,
      totalFeeAmount,
      executionTime: `${executionTime}ms`
    })

    // 发送日费检查统计事件
    this.emit('daily-fee-check:completed', {
      processedCount,
      feeDeductedCount,
      totalFeeAmount,
      executionTime,
      timestamp: new Date().toISOString()
    })

    return {
      processedCount,
      feeDeductedCount,
      totalFeeAmount
    }
  }

  /**
   * 检查单个订单的日费
   */
  async checkOrderDailyFee(order: DailyFeeOrder): Promise<FeeDeductionResult> {
    try {
      // 使用FeeCalculator计算费用
      const calculation = this.feeCalculator.calculateFeeDeduction(order)
      
      if (!calculation.shouldDeductFee) {
        logger.debug('订单未达到扣费条件', {
          orderId: order.orderId,
          reason: calculation.feeReason,
          hoursSinceLastUsage: calculation.hoursSinceLastUsage.toFixed(2)
        })
        
        return {
          orderId: order.orderId,
          feeAmount: calculation.feeAmount,
          feeReason: calculation.feeReason,
          lastUsageTime: order.lastEnergyUsageTime,
          remainingBefore: order.remainingTransactions,
          remainingAfter: calculation.remainingAfter,
          success: false,
          message: 'Fee deduction not required'
        }
      }
      
      // 执行扣费
      await this.feeCalculator.executeFeeDeduction(
        order.orderId,
        calculation.feeAmount,
        calculation.feeReason,
        order.lastEnergyUsageTime,
        order.remainingTransactions,
        calculation.remainingAfter
      )
      
      logger.info('订单日费扣除成功', {
        orderId: order.orderId,
        userAddress: order.userAddress,
        feeAmount: calculation.feeAmount,
        remainingBefore: order.remainingTransactions,
        remainingAfter: calculation.remainingAfter,
        hoursSinceLastUsage: calculation.hoursSinceLastUsage.toFixed(2)
      })
      
      // 触发费用扣除事件
      this.emit('fee:deducted', {
        orderId: order.orderId,
        userAddress: order.userAddress,
        feeAmount: calculation.feeAmount,
        feeReason: calculation.feeReason,
        remainingBefore: order.remainingTransactions,
        remainingAfter: calculation.remainingAfter,
        timestamp: new Date().toISOString()
      })
      
      return {
        orderId: order.orderId,
        feeAmount: calculation.feeAmount,
        feeReason: calculation.feeReason,
        lastUsageTime: order.lastEnergyUsageTime,
        remainingBefore: order.remainingTransactions,
        remainingAfter: calculation.remainingAfter,
        success: true,
        message: 'Fee deducted successfully'
      }
    } catch (error) {
      logger.error('检查订单日费异常', {
        orderId: order.orderId,
        userAddress: order.userAddress,
        error: error instanceof Error ? error.message : error
      })
      
      return {
        orderId: order.orderId,
        feeAmount: 0,
        feeReason: 'error',
        lastUsageTime: order.lastEnergyUsageTime,
        remainingBefore: order.remainingTransactions,
        remainingAfter: order.remainingTransactions,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
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
      const order = this.orderManager.getOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found in daily fee processing list',
          feeDeducted: false
        }
      }

      logger.info('手动触发订单费用检查', { orderId, userAddress: order.userAddress })
      
      const result = await this.checkOrderDailyFee(order)
      
      return {
        success: true,
        message: 'Order fee check completed',
        feeDeducted: result.success,
        feeAmount: result.success ? result.feeAmount : undefined,
        remainingTransactions: result.success ? result.remainingAfter : order.remainingTransactions
      }
    } catch (error) {
      logger.error('手动触发订单费用检查失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        feeDeducted: false
      }
    }
  }
}
