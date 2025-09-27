import { DelegationValidator } from './core/DelegationValidator'
import { StatusManager } from './core/StatusManager'
import { TransactionCounter } from './core/TransactionCounter'
import { BatchDelegationProcessor } from './processors/BatchDelegationProcessor'
import { SingleDelegationProcessor } from './processors/SingleDelegationProcessor'
import { DelegationHelper } from './utils/DelegationHelper'
import { RecordLogger } from './utils/RecordLogger'

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

interface TransactionCountUpdateResult {
  success: boolean
  message: string
  orderId?: string
  transactionCount?: number
  usedTransactions?: number
  remainingTransactions?: number
  lastEnergyUsageTime?: Date
  details?: any
}

interface DelegationStatus {
  orderId: string
  orderType: string
  transactionCount: number
  usedTransactions: number
  remainingTransactions: number
  lastEnergyUsageTime: Date | null
  nextDelegationTime: Date | null
  dailyFeeLastCheck: Date | null
  status: string
  paymentStatus: string
  canDelegate: boolean
  energyPerTransaction: number
}

interface PendingDelegation {
  orderId: string
  userAddress: string
  transactionCount: number
  usedTransactions: number
  remainingTransactions: number
  nextDelegationTime: Date | null
  priority: number
}

/**
 * 分批能量代理服务主协调器
 * 整合所有代理相关功能的主入口点
 */
export class BatchDelegationService {
  private static instance: BatchDelegationService
  
  private delegationValidator: DelegationValidator
  private transactionCounter: TransactionCounter
  private statusManager: StatusManager
  private singleDelegationProcessor: SingleDelegationProcessor
  private batchDelegationProcessor: BatchDelegationProcessor
  private delegationHelper: DelegationHelper
  private recordLogger: RecordLogger

  private constructor() {
    // 初始化所有组件
    this.delegationValidator = new DelegationValidator()
    this.transactionCounter = new TransactionCounter()
    this.statusManager = new StatusManager()
    this.singleDelegationProcessor = new SingleDelegationProcessor()
    this.batchDelegationProcessor = new BatchDelegationProcessor()
    this.delegationHelper = new DelegationHelper()
    this.recordLogger = new RecordLogger()
  }

  static getInstance(): BatchDelegationService {
    if (!BatchDelegationService.instance) {
      BatchDelegationService.instance = new BatchDelegationService()
    }
    return BatchDelegationService.instance
  }

  /**
   * 执行单笔交易的能量代理
   */
  async delegateSingleTransaction(
    orderId: string,
    userAddress: string,
    transactionHash?: string,
    isManualDelegation: boolean = false
  ): Promise<DelegationResult> {
    return await this.singleDelegationProcessor.delegateSingleTransaction(
      orderId,
      userAddress,
      transactionHash,
      isManualDelegation
    )
  }

  /**
   * 更新订单的交易笔数
   */
  async updateTransactionCount(
    orderId: string,
    usedCount: number,
    reason?: string
  ): Promise<TransactionCountUpdateResult> {
    return await this.transactionCounter.updateTransactionCount(orderId, usedCount, reason)
  }

  /**
   * 获取订单的代理状态
   */
  async getDelegationStatus(orderId: string): Promise<DelegationStatus | null> {
    return await this.statusManager.getDelegationStatus(orderId)
  }

  /**
   * 批量执行多个订单的能量代理
   */
  async executeBatchDelegation(delegations: DelegationRequest[]): Promise<DelegationResult[]> {
    return await this.batchDelegationProcessor.executeBatchDelegation(delegations)
  }

  /**
   * 获取待处理的代理任务列表
   */
  async getPendingDelegations(limit: number = 50, offset: number = 0): Promise<{
    delegations: PendingDelegation[]
    total: number
  }> {
    return await this.statusManager.getPendingDelegations(limit, offset)
  }

  /**
   * 手动触发订单的下次代理时间检查
   */
  async triggerNextDelegation(orderId: string): Promise<{
    success: boolean
    message: string
    orderId?: string
    nextDelegationTime?: Date
    canDelegate?: boolean
    details?: any
  }> {
    return await this.statusManager.triggerNextDelegation(orderId)
  }

  /**
   * 验证代理请求
   */
  validateDelegationRequest(
    orderId: string,
    userAddress: string,
    energyAmount?: number
  ): { success: boolean; message: string } {
    return this.delegationValidator.validateDelegationRequest(orderId, userAddress, energyAmount)
  }

  /**
   * 验证批量代理请求
   */
  validateBatchDelegationRequest(delegations: DelegationRequest[]): { success: boolean; message: string } {
    return this.delegationValidator.validateBatchDelegationRequest(delegations)
  }

  /**
   * 获取订单交易统计信息
   */
  async getTransactionStats(orderId: string): Promise<{
    success: boolean
    stats?: {
      orderId: string
      totalTransactions: number
      usedTransactions: number
      remainingTransactions: number
      usagePercentage: number
      lastUsageTime: Date | null
      dailyUsage: number
      weeklyUsage: number
      monthlyUsage: number
    }
    message: string
  }> {
    return await this.transactionCounter.getTransactionStats(orderId)
  }

  /**
   * 批量更新订单状态
   */
  async batchUpdateOrderStatus(updates: Array<{
    orderId: string
    status?: string
    nextDelegationTime?: Date
    lastEnergyUsageTime?: Date
  }>): Promise<Array<{
    success: boolean
    orderId: string
    message: string
  }>> {
    return await this.statusManager.batchUpdateOrderStatus(updates)
  }

  /**
   * 获取代理预估信息
   */
  async getDelegationEstimate(orderId: string): Promise<{
    success: boolean
    estimate?: {
      energyAmount: number
      lockPeriod: number
      estimatedCost: number
      nextDelegationTime: Date | null
      canDelegateNow: boolean
    }
    message: string
  }> {
    return await this.singleDelegationProcessor.getDelegationEstimate(orderId)
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
    return await this.batchDelegationProcessor.precheckBatchDelegation(delegations)
  }

  /**
   * 获取订单概览统计
   */
  async getOrderOverviewStats(): Promise<{
    totalOrders: number
    activeOrders: number
    pendingDelegations: number
    completedOrders: number
    totalTransactions: number
    usedTransactions: number
    remainingTransactions: number
  }> {
    return await this.statusManager.getOrderOverviewStats()
  }

  /**
   * 格式化TRON地址
   */
  formatTronAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    return this.delegationHelper.formatTronAddress(address, startChars, endChars)
  }

  /**
   * 格式化能量数量显示
   */
  formatEnergyAmount(energy: number, unit: 'auto' | 'SUN' | 'TRX' = 'auto'): string {
    return this.delegationHelper.formatEnergyAmount(energy, unit)
  }

  /**
   * 计算代理优先级
   */
  calculateDelegationPriority(order: any): number {
    return this.delegationHelper.calculateDelegationPriority(order)
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
    return await this.batchDelegationProcessor.getBatchProcessingStats(startTime, endTime)
  }

  /**
   * 清理过期日志
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<{
    deletedCount: number
    success: boolean
  }> {
    return await this.recordLogger.cleanupOldLogs(retentionDays)
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
    return await this.recordLogger.getLogStatistics(startDate, endDate)
  }

  /**
   * 记录代理执行事件（外部调用接口）
   */
  async recordDelegationExecution(event: {
    orderId: string
    userAddress: string
    delegationTxHash: string
    energyDelegated: number
    remainingTransactions?: number
    sourceAddress: string
  }): Promise<void> {
    await this.recordLogger.recordDelegationExecution(event)
  }

  /**
   * 记录代理失败事件（外部调用接口）
   */
  async recordDelegationFailure(event: {
    orderId: string
    userAddress: string
    error: string
    errorCategory?: string
    retryCount?: number
  }): Promise<void> {
    await this.recordLogger.recordDelegationFailure(event)
  }

  /**
   * 检查是否可以立即进行代理
   */
  async canDelegateNow(order: any, isManualDelegation: boolean = false): Promise<{
    allowed: boolean
    reason?: string
    nextAllowedTime?: Date
  }> {
    return await this.statusManager.canDelegateNow(order, isManualDelegation)
  }

  /**
   * 批量获取订单信息
   */
  async getBatchOrderInfo(orderIds: string[]): Promise<Map<string, any>> {
    return await this.delegationHelper.getBatchOrderInfo(orderIds)
  }

  /**
   * 验证代理参数
   */
  validateDelegationParams(params: {
    ownerAddress: string
    receiverAddress: string
    balance: number
    resource: string
    lockPeriod?: number
  }): { valid: boolean; message: string } {
    return this.delegationHelper.validateDelegationParams(params)
  }
}

export default BatchDelegationService
