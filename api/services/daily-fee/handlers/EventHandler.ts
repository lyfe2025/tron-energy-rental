import { logger } from '../../../utils/logger'

/**
 * 事件处理器
 * 负责处理日费服务相关的事件
 */
export class EventHandler {
  /**
   * 处理费用扣除事件
   */
  async handleFeeDeducted(event: any): Promise<void> {
    try {
      // 记录费用扣除事件
      logger.info('费用扣除事件', {
        event: 'daily-fee:deducted',
        orderId: event.orderId,
        userAddress: event.userAddress,
        feeAmount: event.feeAmount,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理费用扣除事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理订单过期事件
   */
  async handleOrderExpired(event: any): Promise<void> {
    try {
      // 记录订单过期事件
      logger.info('订单过期事件', {
        event: 'order:expired',
        orderId: event.orderId,
        userAddress: event.userAddress,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('处理订单过期事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理服务启动事件
   */
  async handleServiceStarted(event: any): Promise<void> {
    try {
      logger.info('日费服务启动事件', {
        event: 'service:started',
        dailyFeeOrdersCount: event.dailyFeeOrdersCount,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理服务启动事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理服务停止事件
   */
  async handleServiceStopped(event: any): Promise<void> {
    try {
      logger.info('日费服务停止事件', {
        event: 'service:stopped',
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理服务停止事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理订单添加事件
   */
  async handleOrderAdded(event: any): Promise<void> {
    try {
      logger.info('订单添加事件', {
        event: 'order:added',
        orderId: event.orderId,
        userAddress: event.userAddress,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理订单添加事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理订单移除事件
   */
  async handleOrderRemoved(event: any): Promise<void> {
    try {
      logger.info('订单移除事件', {
        event: 'order:removed',
        orderId: event.orderId,
        userAddress: event.userAddress,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理订单移除事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理日费检查完成事件
   */
  async handleDailyFeeCheckCompleted(event: any): Promise<void> {
    try {
      logger.info('日费检查完成事件', {
        event: 'daily-fee-check:completed',
        processedCount: event.processedCount,
        feeDeductedCount: event.feeDeductedCount,
        totalFeeAmount: event.totalFeeAmount,
        executionTime: event.executionTime,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理日费检查完成事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理批量处理完成事件
   */
  async handleBatchCompleted(event: any): Promise<void> {
    try {
      logger.info('批量处理完成事件', {
        event: 'batch:completed',
        processedCount: event.processedCount,
        feeDeductedCount: event.feeDeductedCount,
        totalFeeAmount: event.totalFeeAmount,
        executionTime: event.executionTime,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理批量处理完成事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理批量处理失败事件
   */
  async handleBatchFailed(event: any): Promise<void> {
    try {
      logger.error('批量处理失败事件', {
        event: 'batch:failed',
        error: event.error,
        executionTime: event.executionTime,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理批量处理失败事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 处理订单重新加载事件
   */
  async handleOrdersReloaded(event: any): Promise<void> {
    try {
      logger.info('订单重新加载事件', {
        event: 'orders:reloaded',
        count: event.count,
        timestamp: event.timestamp
      })
    } catch (error) {
      logger.error('处理订单重新加载事件失败', {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }
}
