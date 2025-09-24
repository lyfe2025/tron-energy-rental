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
   * 记录能量使用日志
   */
  async recordEnergyUsage(
    orderId: string,
    userAddress: string,
    energyConsumed: number,
    delegationTxHash: string,
    transactionHash?: string
  ): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO energy_usage_logs (
          order_id, user_address, energy_before, energy_after, 
          energy_consumed, transaction_hash, usage_time, detection_time
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `

      await this.dbService.query(insertQuery, [
        orderId,
        userAddress,
        0, // energy_before - 需要从区块链查询实际值
        0, // energy_after - 需要从区块链查询实际值
        energyConsumed,
        transactionHash || delegationTxHash
      ])

      logger.debug(`能量使用日志记录成功`, {
        orderId,
        userAddress: userAddress.substring(0, 15) + '...',
        energyConsumed,
        transactionHash: (transactionHash || delegationTxHash).substring(0, 12) + '...'
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
   * 记录代理执行事件
   */
  async recordDelegationExecution(event: {
    orderId: string
    userAddress: string
    delegationTxHash: string
    energyDelegated: number
    remainingTransactions?: number
    sourceAddress: string
  }): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('info', 'Delegation executed', $1, CURRENT_TIMESTAMP)
      `

      const metadata = {
        event: 'delegation:executed',
        orderId: event.orderId,
        userAddress: event.userAddress,
        delegationTxHash: event.delegationTxHash,
        energyDelegated: event.energyDelegated,
        remainingTransactions: event.remainingTransactions,
        sourceAddress: event.sourceAddress,
        timestamp: new Date().toISOString()
      }

      await this.dbService.query(insertQuery, [JSON.stringify(metadata)])

      logger.info('代理执行完成事件', metadata)
    } catch (error) {
      logger.error(`记录代理执行事件失败`, {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 记录批量处理开始
   */
  async recordBatchProcessingStart(event: {
    totalCount: number
    batchSize: number
    orderIds: string[]
  }): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('info', 'Batch processing started', $1, CURRENT_TIMESTAMP)
      `

      const metadata = {
        event: 'batch:processing-start',
        totalCount: event.totalCount,
        batchSize: event.batchSize,
        orderIds: event.orderIds.slice(0, 10), // 只记录前10个ID
        timestamp: new Date().toISOString()
      }

      await this.dbService.query(insertQuery, [JSON.stringify(metadata)])

      logger.info('批量处理开始事件', {
        totalCount: event.totalCount,
        batchSize: event.batchSize,
        sampleOrderIds: event.orderIds.slice(0, 5)
      })
    } catch (error) {
      logger.error(`记录批量处理开始事件失败`, {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 记录批量处理完成
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
    try {
      const insertQuery = `
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('info', 'Batch processing completed', $1, CURRENT_TIMESTAMP)
      `

      const metadata = {
        event: 'batch:processing-complete',
        totalCount: event.totalCount,
        successCount: event.successCount,
        failureCount: event.failureCount,
        successRate: event.totalCount > 0 ? (event.successCount / event.totalCount * 100).toFixed(2) + '%' : '0%',
        sampleResults: event.results.slice(0, 10), // 只记录前10个结果
        timestamp: new Date().toISOString()
      }

      await this.dbService.query(insertQuery, [JSON.stringify(metadata)])

      logger.info('批量处理完成事件', {
        totalCount: event.totalCount,
        successCount: event.successCount,
        failureCount: event.failureCount,
        successRate: metadata.successRate
      })
    } catch (error) {
      logger.error(`记录批量处理完成事件失败`, {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 记录代理失败事件
   */
  async recordDelegationFailure(event: {
    orderId: string
    userAddress: string
    error: string
    errorCategory?: string
    retryCount?: number
  }): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('error', 'Delegation failed', $1, CURRENT_TIMESTAMP)
      `

      const metadata = {
        event: 'delegation:failed',
        orderId: event.orderId,
        userAddress: event.userAddress,
        error: event.error,
        errorCategory: event.errorCategory || 'unknown',
        retryCount: event.retryCount || 0,
        timestamp: new Date().toISOString()
      }

      await this.dbService.query(insertQuery, [JSON.stringify(metadata)])

      logger.error('代理失败事件', metadata)
    } catch (error) {
      logger.error(`记录代理失败事件失败`, {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 记录代理重试事件
   */
  async recordDelegationRetry(event: {
    orderId: string
    userAddress: string
    attempt: number
    maxAttempts: number
    lastError: string
  }): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('warn', 'Delegation retry', $1, CURRENT_TIMESTAMP)
      `

      const metadata = {
        event: 'delegation:retry',
        orderId: event.orderId,
        userAddress: event.userAddress,
        attempt: event.attempt,
        maxAttempts: event.maxAttempts,
        lastError: event.lastError,
        timestamp: new Date().toISOString()
      }

      await this.dbService.query(insertQuery, [JSON.stringify(metadata)])

      logger.warn('代理重试事件', metadata)
    } catch (error) {
      logger.error(`记录代理重试事件失败`, {
        event,
        error: error instanceof Error ? error.message : error
      })
    }
  }

  /**
   * 记录系统性能指标
   */
  async recordPerformanceMetrics(metrics: {
    operation: string
    executionTime: number
    memoryUsage?: number
    cpuUsage?: number
    throughput?: number
  }): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('debug', 'Performance metrics', $1, CURRENT_TIMESTAMP)
      `

      const metadata = {
        event: 'performance:metrics',
        operation: metrics.operation,
        executionTime: metrics.executionTime,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        throughput: metrics.throughput,
        timestamp: new Date().toISOString()
      }

      await this.dbService.query(insertQuery, [JSON.stringify(metadata)])

      // 只在调试模式下记录详细的性能指标
      if (process.env.NODE_ENV === 'development') {
        logger.debug('性能指标', metadata)
      }
    } catch (error) {
      logger.error(`记录性能指标失败`, {
        metrics,
        error: error instanceof Error ? error.message : error
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
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const deleteQuery = `
        DELETE FROM system_logs 
        WHERE created_at < $1 
          AND level IN ('debug', 'info')
          AND message LIKE '%delegation%'
      `

      const result = await this.dbService.query(deleteQuery, [cutoffDate])
      const deletedCount = result.rowCount || 0

      logger.info('清理过期代理日志完成', {
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount
      })

      return {
        deletedCount,
        success: true
      }
    } catch (error) {
      logger.error('清理过期日志失败', {
        retentionDays,
        error: error instanceof Error ? error.message : error
      })
      return {
        deletedCount: 0,
        success: false
      }
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
      const conditions = []
      const params = []
      let paramIndex = 1

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`)
        params.push(startDate)
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`)
        params.push(endDate)
      }

      conditions.push(`message LIKE '%delegation%'`)

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const query = `
        SELECT 
          COUNT(*) as total_logs,
          level,
          metadata->>'event' as event_type
        FROM system_logs 
        ${whereClause}
        GROUP BY level, metadata->>'event'
      `

      const result = await this.dbService.query(query, params)

      const logsByLevel: Record<string, number> = {}
      const logsByEvent: Record<string, number> = {}
      let totalLogs = 0

      result.rows.forEach(row => {
        const count = parseInt(row.total_logs) || 0
        totalLogs += count
        
        if (row.level) {
          logsByLevel[row.level] = (logsByLevel[row.level] || 0) + count
        }
        
        if (row.event_type) {
          logsByEvent[row.event_type] = (logsByEvent[row.event_type] || 0) + count
        }
      })

      // 计算平均每日日志数
      const days = startDate && endDate 
        ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 1
      const averageLogsPerDay = totalLogs / days

      return {
        totalLogs,
        logsByLevel,
        logsByEvent,
        averageLogsPerDay: Math.round(averageLogsPerDay * 100) / 100
      }
    } catch (error) {
      logger.error('获取日志统计信息失败', {
        startDate,
        endDate,
        error: error instanceof Error ? error.message : error
      })
      return {
        totalLogs: 0,
        logsByLevel: {},
        logsByEvent: {},
        averageLogsPerDay: 0
      }
    }
  }
}
