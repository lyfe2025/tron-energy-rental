import { logger } from '../../../utils/logger'
import { EnergyPoolService } from '../../energy-pool/EnergyPoolService'
import { PriceConfigService } from '../../PriceConfigService'
import { tronService, TronService } from '../../tron/TronService'
import { DelegationValidator } from '../core/DelegationValidator'
import { StatusManager } from '../core/StatusManager'
import { TransactionCounter } from '../core/TransactionCounter'
import { DelegationHelper } from '../utils/DelegationHelper'
import { RecordLogger } from '../utils/RecordLogger'

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
 * 单笔代理处理器
 * 负责处理单笔交易的能量代理逻辑
 */
export class SingleDelegationProcessor {
  private tronService: TronService
  private energyPoolService: EnergyPoolService
  private priceConfigService: PriceConfigService
  private delegationValidator: DelegationValidator
  private transactionCounter: TransactionCounter
  private statusManager: StatusManager
  private delegationHelper: DelegationHelper
  private recordLogger: RecordLogger

  constructor() {
    this.tronService = tronService
    this.energyPoolService = new EnergyPoolService()
    this.priceConfigService = PriceConfigService.getInstance()
    this.delegationValidator = new DelegationValidator()
    this.transactionCounter = new TransactionCounter()
    this.statusManager = new StatusManager()
    this.delegationHelper = new DelegationHelper()
    this.recordLogger = new RecordLogger()
  }

  /**
   * 执行单笔交易的能量代理
   */
  async delegateSingleTransaction(
    orderId: string,
    userAddress: string,
    transactionHash?: string
  ): Promise<DelegationResult> {
    const startTime = Date.now()
    
    try {
      logger.info(`开始执行单笔交易能量代理`, {
        orderId,
        userAddress,
        transactionHash
      })

      // 1. 验证代理请求参数
      const requestValidation = this.delegationValidator.validateDelegationRequest(
        orderId,
        userAddress
      )
      if (!requestValidation.success) {
        return {
          success: false,
          message: requestValidation.message
        }
      }

      // 2. 获取订单信息
      const order = await this.delegationHelper.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found or not a transaction package order'
        }
      }

      // 3. 验证订单状态
      const orderValidation = this.delegationValidator.validateOrderForDelegation(order, userAddress)
      if (!orderValidation.success) {
        return orderValidation
      }

      // 4. 检查是否可以进行代理（时间间隔限制）
      const canDelegate = await this.statusManager.canDelegateNow(order)
      if (!canDelegate.allowed) {
        return {
          success: false,
          message: canDelegate.reason,
          details: { nextAllowedTime: canDelegate.nextAllowedTime }
        }
      }

      // 5. 获取单笔交易所需能量
      const config = await this.priceConfigService.getTransactionPackageConfig()
      const energyPerTransaction = config?.single_transaction_energy || 65000

      // 6. 选择能量池账户
      const energyAccount = await this.energyPoolService.selectOptimalAccount(
        energyPerTransaction
      )
      if (!energyAccount) {
        return {
          success: false,
          message: 'No available energy pool account with sufficient energy'
        }
      }

      // 7. 验证能量池账户
      const accountValidation = this.delegationValidator.validateEnergyPoolAccount(
        energyAccount,
        energyPerTransaction
      )
      if (!accountValidation.success) {
        return {
          success: false,
          message: accountValidation.message
        }
      }

      // 8. 执行能量代理
      const lockPeriod = 3 // 代理3天
      const delegationResult = await this.tronService.delegateResource({
        ownerAddress: energyAccount.tron_address,
        receiverAddress: userAddress,
        balance: energyPerTransaction,
        resource: 'ENERGY',
        lock: true,
        lockPeriod: lockPeriod
      })

      if (!delegationResult.success) {
        logger.error(`能量代理失败`, {
          orderId,
          userAddress,
          error: delegationResult.error
        })
        return {
          success: false,
          message: 'Energy delegation failed',
          details: delegationResult.error
        }
      }

      // 9. 更新订单状态
      const updateResult = await this.updateOrderAfterDelegation(
        orderId,
        delegationResult.txid,
        energyPerTransaction,
        energyAccount.tron_address
      )

      if (!updateResult.success) {
        logger.error(`订单状态更新失败`, {
          orderId,
          delegationTxHash: delegationResult.txid,
          error: updateResult.error
        })
        // 即使更新失败，代理已经成功，返回成功但记录警告
        logger.warn(`能量代理成功但订单状态更新失败`, { orderId })
      }

      // 10. 记录能量使用日志
      await this.recordLogger.recordEnergyUsage(
        orderId,
        userAddress,
        energyPerTransaction,
        delegationResult.txid,
        transactionHash
      )

      // 11. 记录代理执行事件
      await this.recordLogger.recordDelegationExecution({
        orderId,
        userAddress,
        delegationTxHash: delegationResult.txid,
        energyDelegated: energyPerTransaction,
        remainingTransactions: updateResult.remainingTransactions,
        sourceAddress: energyAccount.tron_address
      })

      const executionTime = Date.now() - startTime
      logger.info(`单笔交易能量代理成功`, {
        orderId,
        userAddress,
        delegationTxHash: delegationResult.txid,
        energyDelegated: energyPerTransaction,
        executionTime: `${executionTime}ms`
      })

      return {
        success: true,
        message: 'Energy delegation completed successfully',
        orderId,
        delegationTxHash: delegationResult.txid,
        energyDelegated: energyPerTransaction,
        remainingTransactions: updateResult.remainingTransactions,
        usedTransactions: updateResult.usedTransactions,
        nextDelegationTime: updateResult.nextDelegationTime
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error(`单笔交易能量代理异常`, {
        orderId,
        userAddress,
        error: error instanceof Error ? error.message : error,
        executionTime: `${executionTime}ms`
      })
      return {
        success: false,
        message: 'Internal error during energy delegation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 代理成功后更新订单状态
   */
  private async updateOrderAfterDelegation(
    orderId: string,
    delegationTxHash: string,
    energyDelegated: number,
    sourceAddress: string
  ): Promise<{
    success: boolean
    error?: string
    usedTransactions?: number
    remainingTransactions?: number
    nextDelegationTime?: Date
  }> {
    try {
      // 1. 更新交易笔数
      const counterResult = await this.transactionCounter.incrementUsedTransactions(orderId, 1)
      if (!counterResult.success) {
        return {
          success: false,
          error: counterResult.message
        }
      }

      // 2. 更新下次代理时间
      const statusResult = await this.statusManager.updateNextDelegationTime(orderId)
      if (!statusResult.success) {
        logger.warn('更新下次代理时间失败', {
          orderId,
          error: statusResult.error
        })
      }

      // 3. 更新代理记录
      await this.delegationHelper.updateDelegationRecord(
        orderId,
        delegationTxHash,
        sourceAddress,
        energyDelegated
      )

      return {
        success: true,
        usedTransactions: counterResult.usedTransactions,
        remainingTransactions: counterResult.remainingTransactions,
        nextDelegationTime: statusResult.nextDelegationTime
      }
    } catch (error) {
      logger.error(`代理后更新订单状态失败`, {
        orderId,
        delegationTxHash,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 验证代理前置条件
   */
  async validateDelegationPreconditions(
    orderId: string,
    userAddress: string
  ): Promise<{
    valid: boolean
    message: string
    order?: any
    energyRequired?: number
    energyAccount?: any
  }> {
    try {
      // 1. 验证请求参数
      const requestValidation = this.delegationValidator.validateDelegationRequest(
        orderId,
        userAddress
      )
      if (!requestValidation.success) {
        return {
          valid: false,
          message: requestValidation.message
        }
      }

      // 2. 获取订单信息
      const order = await this.delegationHelper.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          valid: false,
          message: 'Order not found or not a transaction package order'
        }
      }

      // 3. 验证订单状态
      const orderValidation = this.delegationValidator.validateOrderForDelegation(order, userAddress)
      if (!orderValidation.success) {
        return {
          valid: false,
          message: orderValidation.message
        }
      }

      // 4. 检查代理时间
      const canDelegate = await this.statusManager.canDelegateNow(order)
      if (!canDelegate.allowed) {
        return {
          valid: false,
          message: canDelegate.reason || 'Cannot delegate at this time'
        }
      }

      // 5. 获取能量需求
      const config = await this.priceConfigService.getTransactionPackageConfig()
      const energyRequired = config?.single_transaction_energy || 65000

      // 6. 检查能量池可用性
      const energyAccount = await this.energyPoolService.selectOptimalAccount(energyRequired)
      if (!energyAccount) {
        return {
          valid: false,
          message: 'No available energy pool account with sufficient energy'
        }
      }

      return {
        valid: true,
        message: 'All preconditions satisfied',
        order,
        energyRequired,
        energyAccount
      }
    } catch (error) {
      logger.error('验证代理前置条件失败', {
        orderId,
        userAddress,
        error: error instanceof Error ? error.message : error
      })
      return {
        valid: false,
        message: 'Internal error during validation'
      }
    }
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
    try {
      const order = await this.delegationHelper.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found'
        }
      }

      const config = await this.priceConfigService.getTransactionPackageConfig()
      const energyAmount = config?.single_transaction_energy || 65000
      const lockPeriod = 3 // 默认3天

      const canDelegate = await this.statusManager.canDelegateNow(order)

      return {
        success: true,
        estimate: {
          energyAmount,
          lockPeriod,
          estimatedCost: 0, // 通常能量代理不收费
          nextDelegationTime: order.next_delegation_time,
          canDelegateNow: canDelegate.allowed
        },
        message: 'Delegation estimate retrieved successfully'
      }
    } catch (error) {
      logger.error('获取代理预估信息失败', {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return {
        success: false,
        message: 'Internal error during estimate calculation'
      }
    }
  }
}
