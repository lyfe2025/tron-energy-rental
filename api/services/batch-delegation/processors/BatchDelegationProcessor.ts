import { logger } from '../../../utils/logger'
import { DelegationValidator } from '../core/DelegationValidator'
import { RecordLogger } from '../utils/RecordLogger'
import { SingleDelegationProcessor } from './SingleDelegationProcessor'

interface DelegationRequest {
  orderId: string
  userAddress: string
  transactionHash?: string
}

interface DelegationResult {
  success: boolean
  message: string
  orderId?: string
  delegationTxHash?: string
  energyDelegated?: number
  remainingTransactions?: number
  usedTransactions?: number
  nextDelegationTime?: Date
  details?: any
}

/**
 * 批量代理处理器
 * 负责处理批量能量代理请求
 */
export class BatchDelegationProcessor {
  private singleDelegationProcessor: SingleDelegationProcessor
  private delegationValidator: DelegationValidator
  private recordLogger: RecordLogger

  constructor() {
    this.singleDelegationProcessor = new SingleDelegationProcessor()
    this.delegationValidator = new DelegationValidator()
    this.recordLogger = new RecordLogger()
  }

  /**
   * 批量执行多个订单的能量代理
   */
  async executeBatchDelegation(delegations: DelegationRequest[]): Promise<DelegationResult[]> {
    const results: DelegationResult[] = []
    const batchSize = 5 // 每批处理5个订单

    // 验证批量请求
    const validation = this.delegationValidator.validateBatchDelegationRequest(delegations)
    if (!validation.success) {
      // 为所有请求返回失败结果
      return delegations.map(delegation => ({
        success: false,
        message: validation.message,
        orderId: delegation.orderId
      }))
    }

    logger.info(`开始批量执行能量代理`, {
      totalCount: delegations.length,
      batchSize
    })

    // 记录批量处理开始
    await this.recordLogger.recordBatchProcessingStart({
      totalCount: delegations.length,
      batchSize,
      orderIds: delegations.map(d => d.orderId)
    })

    // 分批处理以避免过载
    for (let i = 0; i < delegations.length; i += batchSize) {
      const batch = delegations.slice(i, i + batchSize)
      const batchResults = await this.processBatch(batch, i / batchSize + 1)
      results.push(...batchResults)

      // 批次间延迟，避免过于频繁的请求
      if (i + batchSize < delegations.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successCount = results.filter(r => r.success).length
    logger.info(`批量能量代理执行完成`, {
      total: results.length,
      success: successCount,
      failure: results.length - successCount
    })

    // 记录批量处理完成
    await this.recordLogger.recordBatchProcessingComplete({
      totalCount: results.length,
      successCount,
      failureCount: results.length - successCount,
      results: results.map(r => ({
        orderId: r.orderId,
        success: r.success,
        message: r.message
      }))
    })

    return results
  }

  /**
   * 处理单个批次
   */
  private async processBatch(
    batch: DelegationRequest[],
    batchNumber: number
  ): Promise<DelegationResult[]> {
    logger.info(`处理批次 ${batchNumber}`, {
      batchSize: batch.length,
      orderIds: batch.map(d => d.orderId)
    })

    const batchPromises = batch.map(delegation =>
      this.processSingleDelegationWithRetry(delegation)
    )

    try {
      const batchResults = await Promise.allSettled(batchPromises)
      
      return batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          logger.error(`批次处理中的代理失败`, {
            batchNumber,
            delegationIndex: index,
            orderId: batch[index].orderId,
            error: result.reason
          })
          return {
            success: false,
            message: 'Batch processing failed',
            orderId: batch[index].orderId,
            details: result.reason
          }
        }
      })
    } catch (error) {
      logger.error(`批量处理异常`, {
        batchNumber,
        error: error instanceof Error ? error.message : error
      })
      
      // 为当前批次的所有请求添加失败结果
      return batch.map(delegation => ({
        success: false,
        message: 'Batch processing error',
        orderId: delegation.orderId,
        details: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  /**
   * 带重试机制的单笔代理处理
   */
  private async processSingleDelegationWithRetry(
    delegation: DelegationRequest,
    maxRetries: number = 3
  ): Promise<DelegationResult> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.singleDelegationProcessor.delegateSingleTransaction(
          delegation.orderId,
          delegation.userAddress,
          delegation.transactionHash
        )

        if (result.success) {
          if (attempt > 1) {
            logger.info(`代理重试成功`, {
              orderId: delegation.orderId,
              attempt,
              maxRetries
            })
          }
          return result
        }

        // 如果是业务逻辑错误，不重试
        if (this.isBusinessLogicError(result.message)) {
          logger.debug(`业务逻辑错误，不重试`, {
            orderId: delegation.orderId,
            message: result.message
          })
          return result
        }

        lastError = new Error(result.message)
        
        if (attempt < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // 指数退避，最大5秒
          logger.warn(`代理失败，${retryDelay}ms后重试`, {
            orderId: delegation.orderId,
            attempt,
            maxRetries,
            error: result.message
          })
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      } catch (error) {
        lastError = error
        
        if (attempt < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          logger.warn(`代理异常，${retryDelay}ms后重试`, {
            orderId: delegation.orderId,
            attempt,
            maxRetries,
            error: error instanceof Error ? error.message : error
          })
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    logger.error(`代理重试失败，已达最大重试次数`, {
      orderId: delegation.orderId,
      maxRetries,
      lastError: lastError instanceof Error ? lastError.message : lastError
    })

    return {
      success: false,
      message: 'Failed after maximum retries',
      orderId: delegation.orderId,
      details: lastError instanceof Error ? lastError.message : 'Unknown error'
    }
  }

  /**
   * 判断是否为业务逻辑错误（不应重试）
   */
  private isBusinessLogicError(message: string): boolean {
    const businessErrorPatterns = [
      /order not found/i,
      /invalid.*address/i,
      /insufficient.*transactions/i,
      /payment.*not.*paid/i,
      /order.*not.*active/i,
      /address.*not.*match/i,
      /must wait.*before/i
    ]
    
    return businessErrorPatterns.some(pattern => pattern.test(message))
  }

  /**
   * 获取批量处理统计信息
   */
  async getBatchProcessingStats(
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    totalBatches: number
    totalDelegations: number
    successfulDelegations: number
    failedDelegations: number
    averageBatchSize: number
    averageProcessingTime: number
    errorDistribution: Record<string, number>
  }> {
    try {
      // 这里应该从数据库或缓存中获取统计信息
      // 为了演示，返回模拟数据
      return {
        totalBatches: 0,
        totalDelegations: 0,
        successfulDelegations: 0,
        failedDelegations: 0,
        averageBatchSize: 0,
        averageProcessingTime: 0,
        errorDistribution: {}
      }
    } catch (error) {
      logger.error('获取批量处理统计信息失败', {
        error: error instanceof Error ? error.message : error
      })
      return {
        totalBatches: 0,
        totalDelegations: 0,
        successfulDelegations: 0,
        failedDelegations: 0,
        averageBatchSize: 0,
        averageProcessingTime: 0,
        errorDistribution: {}
      }
    }
  }

  /**
   * 取消批量处理（如果支持）
   */
  async cancelBatchProcessing(batchId: string): Promise<{
    success: boolean
    message: string
    cancelledCount?: number
  }> {
    // 实际实现中，这里应该有机制来跟踪和取消正在进行的批量处理
    logger.info(`尝试取消批量处理`, { batchId })
    
    return {
      success: false,
      message: 'Batch cancellation not implemented'
    }
  }

  /**
   * 预检查批量代理请求
   */
  async precheckBatchDelegation(delegations: DelegationRequest[]): Promise<{
    success: boolean
    message: string
    validCount: number
    invalidCount: number
    details: Array<{
      orderId: string
      valid: boolean
      message: string
    }>
  }> {
    // 验证批量请求格式
    const validation = this.delegationValidator.validateBatchDelegationRequest(delegations)
    if (!validation.success) {
      return {
        success: false,
        message: validation.message,
        validCount: 0,
        invalidCount: delegations.length,
        details: delegations.map(d => ({
          orderId: d.orderId,
          valid: false,
          message: validation.message
        }))
      }
    }

    // 检查每个代理请求的前置条件
    const details = await Promise.all(
      delegations.map(async (delegation) => {
        try {
          const precondition = await this.singleDelegationProcessor.validateDelegationPreconditions(
            delegation.orderId,
            delegation.userAddress
          )
          return {
            orderId: delegation.orderId,
            valid: precondition.valid,
            message: precondition.message
          }
        } catch (error) {
          return {
            orderId: delegation.orderId,
            valid: false,
            message: error instanceof Error ? error.message : 'Validation error'
          }
        }
      })
    )

    const validCount = details.filter(d => d.valid).length
    const invalidCount = details.length - validCount

    return {
      success: true,
      message: 'Precheck completed',
      validCount,
      invalidCount,
      details
    }
  }
}
