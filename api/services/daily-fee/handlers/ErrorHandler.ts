import { logger } from '../../../utils/logger'

/**
 * 错误处理器
 * 负责处理日费服务相关的错误
 */
export class ErrorHandler {
  /**
   * 处理错误事件
   */
  handleError(error: Error): void {
    logger.error('日费服务错误', {
      event: 'daily-fee:error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理配置加载错误
   */
  handleConfigLoadError(error: Error): void {
    logger.error('日费配置加载错误', {
      event: 'config:load-error',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理订单加载错误
   */
  handleOrderLoadError(error: Error): void {
    logger.error('日费订单加载错误', {
      event: 'order:load-error',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理费用计算错误
   */
  handleFeeCalculationError(error: Error, orderId: string): void {
    logger.error('费用计算错误', {
      event: 'fee:calculation-error',
      orderId,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理数据库操作错误
   */
  handleDatabaseError(error: Error, operation: string, orderId?: string): void {
    logger.error('数据库操作错误', {
      event: 'database:operation-error',
      operation,
      orderId,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理服务启动错误
   */
  handleServiceStartError(error: Error): void {
    logger.error('日费服务启动错误', {
      event: 'service:start-error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理批量处理错误
   */
  handleBatchProcessingError(error: Error, batchInfo?: any): void {
    logger.error('批量处理错误', {
      event: 'batch:processing-error',
      error: error.message,
      batchInfo,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 处理订单处理错误
   */
  handleOrderProcessingError(error: Error, orderId: string, userAddress?: string): void {
    logger.error('订单处理错误', {
      event: 'order:processing-error',
      orderId,
      userAddress,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 创建标准错误响应
   */
  createErrorResponse(error: Error, context?: string): {
    success: false
    message: string
    error: string
    context?: string
    timestamp: string
  } {
    return {
      success: false,
      message: 'Operation failed',
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 判断是否为临时错误（可重试）
   */
  isTemporaryError(error: Error): boolean {
    const temporaryErrorPatterns = [
      /connection/i,
      /timeout/i,
      /network/i,
      /unavailable/i,
      /overload/i
    ]
    
    return temporaryErrorPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    )
  }

  /**
   * 获取错误严重级别
   */
  getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPatterns = [
      /database.*corrupt/i,
      /out of memory/i,
      /disk.*full/i
    ]
    
    const highPatterns = [
      /database.*connection/i,
      /authentication.*failed/i,
      /permission.*denied/i
    ]
    
    const mediumPatterns = [
      /timeout/i,
      /network/i,
      /unavailable/i
    ]
    
    if (criticalPatterns.some(pattern => pattern.test(error.message))) {
      return 'critical'
    }
    
    if (highPatterns.some(pattern => pattern.test(error.message))) {
      return 'high'
    }
    
    if (mediumPatterns.some(pattern => pattern.test(error.message))) {
      return 'medium'
    }
    
    return 'low'
  }
}
