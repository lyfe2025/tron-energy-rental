import { DatabaseService } from '../../../database/DatabaseService'
import { logger } from '../../../utils/logger'

/**
 * 记录日志器
 * 负责记录代理相关的日志和事件
 */
export class RecordLogger {
  private dbService: DatabaseService

  constructor() {
    this.dbService = DatabaseService.getInstance()
  }

  /**
   * 记录能量使用日志 (防重复)
   */
  async recordEnergyUsage(
    orderId: string,
    userAddress: string,
    energyConsumed: number,
    delegationTxHash: string,
    transactionHash?: string
  ): Promise<void> {
    try {
      const finalTxHash = transactionHash || delegationTxHash
      
      // 检查是否已存在相同的记录 (同一订单+同一交易哈希)
      const checkQuery = `
        SELECT id FROM energy_usage_logs 
        WHERE order_id = $1 
        AND transaction_hash = $2 
        LIMIT 1
      `
      
      const existingRecord = await this.dbService.query(checkQuery, [orderId, finalTxHash])
      
      if (existingRecord.rows && existingRecord.rows.length > 0) {
        logger.debug(`能量使用日志已存在，跳过重复记录`, {
          orderId,
          userAddress: userAddress.substring(0, 15) + '...',
          transactionHash: finalTxHash.substring(0, 12) + '...',
          existingRecordId: existingRecord.rows[0].id
        })
        return // 记录已存在，直接返回
      }

      const insertQuery = `
        INSERT INTO energy_usage_logs (
          order_id, user_address, energy_amount, energy_before, energy_after, 
          energy_consumed, transaction_hash, usage_time, detection_time,
          detection_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $8)
      `

      await this.dbService.query(insertQuery, [
        orderId,
        userAddress,
        energyConsumed,  // energy_amount字段
        0, // energy_before - 需要从区块链查询实际值
        0, // energy_after - 需要从区块链查询实际值
        energyConsumed,
        finalTxHash,
        'api_polling' // detection_method
      ])

      logger.debug(`能量使用日志记录成功`, {
        orderId,
        userAddress: userAddress.substring(0, 15) + '...',
        energyConsumed,
        transactionHash: finalTxHash.substring(0, 12) + '...'
      })
    } catch (error) {
      logger.error(`记录能量使用日志失败`, {
        orderId,
        userAddress,
        energyConsumed,
        error: error instanceof Error ? error.message : error
      })
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 记录代理执行事件 (仅记录到文件日志，订单状态已在订单表中管理)
   */
  async recordDelegationExecution(event: {
    orderId: string
    userAddress: string
    delegationTxHash: string
    energyDelegated: number
    remainingTransactions?: number
    sourceAddress: string
  }): Promise<void> {
    // 只记录到文件日志，订单错误和状态已在订单表中管理
    logger.info('代理执行完成事件', {
      event: 'delegation:executed',
      orderId: event.orderId,
      userAddress: event.userAddress,
      delegationTxHash: event.delegationTxHash,
      energyDelegated: event.energyDelegated,
      remainingTransactions: event.remainingTransactions,
      sourceAddress: event.sourceAddress,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录批量处理开始 (仅记录到文件日志)
   */
  async recordBatchProcessingStart(event: {
    totalCount: number
    batchSize: number
    orderIds: string[]
  }): Promise<void> {
    // 只记录到文件日志
    logger.info('批量处理开始事件', {
      event: 'batch:processing-start',
      totalCount: event.totalCount,
      batchSize: event.batchSize,
      sampleOrderIds: event.orderIds.slice(0, 10),
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录批量处理完成 (仅记录到文件日志)
   */
  async recordBatchProcessingComplete(event: {
    totalCount: number
    successCount: number
    failureCount: number
    results: Array<{
      orderId: string
      success: boolean
      message: string
    }>
  }): Promise<void> {
    // 只记录到文件日志
    const successRate = event.totalCount > 0 ? (event.successCount / event.totalCount * 100).toFixed(2) + '%' : '0%'
    
    logger.info('批量处理完成事件', {
      event: 'batch:processing-complete',
      totalCount: event.totalCount,
      successCount: event.successCount,
      failureCount: event.failureCount,
      successRate: successRate,
      sampleResults: event.results.slice(0, 10),
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录代理失败事件 (仅记录到文件日志，失败信息已在订单表中管理)
   */
  async recordDelegationFailure(event: {
    orderId: string
    userAddress: string
    error: string
    errorCategory?: string
    retryCount?: number
  }): Promise<void> {
    // 只记录到文件日志，失败信息已在订单表的error_message和processing_details中管理
    logger.error('代理失败事件', {
      event: 'delegation:failed',
      orderId: event.orderId,
      userAddress: event.userAddress,
      error: event.error,
      errorCategory: event.errorCategory || 'unknown',
      retryCount: event.retryCount || 0,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录代理重试事件 (仅记录到文件日志)
   */
  async recordDelegationRetry(event: {
    orderId: string
    userAddress: string
    attempt: number
    maxAttempts: number
    lastError: string
  }): Promise<void> {
    // 只记录到文件日志
    logger.warn('代理重试事件', {
      event: 'delegation:retry',
      orderId: event.orderId,
      userAddress: event.userAddress,
      attempt: event.attempt,
      maxAttempts: event.maxAttempts,
      lastError: event.lastError,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录系统性能指标 (仅记录到文件日志)
   */
  async recordPerformanceMetrics(metrics: {
    operation: string
    executionTime: number
    memoryUsage?: number
    cpuUsage?: number
    throughput?: number
  }): Promise<void> {
    // 只记录到文件日志，只在调试模式下记录详细的性能指标
    if (process.env.NODE_ENV === 'development') {
      logger.debug('性能指标', {
        event: 'performance:metrics',
        operation: metrics.operation,
        executionTime: metrics.executionTime,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        throughput: metrics.throughput,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * 清理过期日志
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<{
    deletedCount: number
    success: boolean
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // 清理能量使用日志表
      const energyLogQuery = `
        DELETE FROM energy_usage_logs 
        WHERE usage_time < $1
      `;
      const energyResult = await this.dbService.query(energyLogQuery, [cutoffDate]);
      const energyDeletedCount = energyResult.rowCount || 0;

      logger.info('日志清理完成', {
        event: 'logs:cleanup',
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount: energyDeletedCount,
        timestamp: new Date().toISOString()
      });

      return {
        deletedCount: energyDeletedCount,
        success: true
      };
    } catch (error) {
      logger.error('日志清理失败', {
        event: 'logs:cleanup-error',
        retentionDays,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString()
      });

      return {
        deletedCount: 0,
        success: false
      };
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number
    logsByLevel: Record<string, number>
    logsByEvent: Record<string, number>
    averageLogsPerDay: number
  }> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 默认30天前
      const end = endDate || new Date();
      
      // 获取能量使用日志统计
      const energyStatsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          DATE(usage_time) as log_date
        FROM energy_usage_logs 
        WHERE usage_time BETWEEN $1 AND $2
        GROUP BY DATE(usage_time)
        ORDER BY log_date
      `;
      
      const result = await this.dbService.query(energyStatsQuery, [start, end]);
      const dailyStats = result.rows || [];
      
      const totalLogs = dailyStats.reduce((sum: number, row: any) => sum + parseInt(row.total_logs), 0);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const averageLogsPerDay = daysDiff > 0 ? totalLogs / daysDiff : 0;

      // 简化的日志级别统计（基于数据库记录）
      const logsByLevel: Record<string, number> = {
        'info': totalLogs, // 能量使用日志主要是info级别
        'error': 0,
        'warn': 0,
        'debug': 0
      };

      // 简化的事件类型统计
      const logsByEvent: Record<string, number> = {
        'energy:usage': totalLogs,
        'delegation:executed': 0,
        'delegation:failed': 0,
        'batch:processing': 0
      };

      logger.debug('日志统计查询完成', {
        event: 'logs:statistics',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalLogs,
        averageLogsPerDay,
        timestamp: new Date().toISOString()
      });

      return {
        totalLogs,
        logsByLevel,
        logsByEvent,
        averageLogsPerDay: Math.round(averageLogsPerDay * 100) / 100 // 保留2位小数
      };
    } catch (error) {
      logger.error('获取日志统计失败', {
        event: 'logs:statistics-error',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString()
      });

      // 返回默认值
      return {
        totalLogs: 0,
        logsByLevel: {},
        logsByEvent: {},
        averageLogsPerDay: 0
      };
    }
  }

}
