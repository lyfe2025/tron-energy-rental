/**
 * 单笔代理处理器 - 主协调器
 * 负责协调各个模块完成单笔交易的能量代理逻辑
 * 
 * 架构说明：
 * - 本文件作为主协调器，负责流程控制
 * - 具体功能实现分离到各个handler模块中
 * - 保持所有公共接口不变，确保兼容性
 */

import { logger } from '../../../utils/logger'
import { EnergyPoolService } from '../../energy-pool/EnergyPoolService'
import { PriceConfigService } from '../../PriceConfigService'
import { tronService, TronService as TronServiceLegacy } from '../../tron'
import { DelegationValidator as CoreDelegationValidator } from '../core/DelegationValidator'
import { StatusManager } from '../core/StatusManager'
import { DelegationHelper } from '../utils/DelegationHelper'
import { RecordLogger } from '../utils/RecordLogger'

// 导入分离的处理器模块
import { DelegationExecutor } from './handlers/DelegationExecutor'
import { DelegationValidator } from './handlers/DelegationValidator'
import { EnergyPoolSelector } from './handlers/EnergyPoolSelector'
import { OrderStatusUpdater } from './handlers/OrderStatusUpdater'

// 导入类型定义
import type { DelegationResult, EstimateResult, ValidationResult } from './types/delegation.types'

/**
 * 单笔代理处理器 - 主协调器
 */
export class SingleDelegationProcessor {
  // 原有依赖保持不变（保证兼容性）
  private tronService: TronServiceLegacy
  private energyPoolService: EnergyPoolService
  private priceConfigService: PriceConfigService
  private delegationValidator: CoreDelegationValidator
  private statusManager: StatusManager
  private delegationHelper: DelegationHelper
  private recordLogger: RecordLogger

  // 新的模块化处理器
  private energyPoolSelector: EnergyPoolSelector
  private orderStatusUpdater: OrderStatusUpdater
  private delegationValidatorHandler: DelegationValidator
  private delegationExecutor: DelegationExecutor

  constructor() {
    // 初始化原有依赖（保证兼容性）
    this.tronService = tronService
    this.energyPoolService = new EnergyPoolService()
    this.priceConfigService = PriceConfigService.getInstance()
    this.delegationValidator = new CoreDelegationValidator()
    this.statusManager = new StatusManager()
    this.delegationHelper = new DelegationHelper()
    this.recordLogger = new RecordLogger()

    // 初始化新的模块化处理器
    this.energyPoolSelector = new EnergyPoolSelector()
    this.orderStatusUpdater = new OrderStatusUpdater()
    this.delegationValidatorHandler = new DelegationValidator()
    this.delegationExecutor = new DelegationExecutor(this.tronService)
  }

  /**
   * 执行单笔交易的能量代理
   * 主要业务流程入口，保持原有接口不变
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

      // 5. 获取单笔交易所需能量（从订单的energy_amount计算）
      const energyPerTransaction = Math.floor(order.energy_amount / order.transaction_count)
      
      logger.info(`[笔数套餐] 计算单笔能量`, {
        orderId,
        计算详情: {
          '订单总能量': order.energy_amount,
          '总笔数': order.transaction_count,
          '单笔能量': energyPerTransaction,
          '计算公式': `${order.energy_amount} ÷ ${order.transaction_count} = ${energyPerTransaction}`,
          '说明': '基于后台配置的标准转账能量消耗*(1+安全缓冲百分比)'
        }
      })

      // 6. 选择能量池账户（使用智能选择逻辑）
      const energyAccount = await this.energyPoolSelector.selectEnergyPoolAccountWithDelegationCheck(
        energyPerTransaction,
        order.network_id
      )
      if (!energyAccount) {
        return {
          success: false,
          message: 'No available energy pool account with sufficient delegatable balance'
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
      const delegationResult = await this.delegationExecutor.executeDelegation(
        orderId,
        userAddress,
        energyPerTransaction,
        energyAccount,
        order,
        transactionHash
      )

      if (!delegationResult.success) {
        return delegationResult
      }

      // 9. 更新订单状态
      const updateResult = await this.orderStatusUpdater.updateOrderAfterDelegation(
        orderId,
        delegationResult.delegationTxHash!,
        energyPerTransaction,
        energyAccount.tron_address
      )

      if (!updateResult.success) {
        logger.error(`订单状态更新失败`, {
          orderId,
          delegationTxHash: delegationResult.delegationTxHash,
          error: updateResult.error
        })
        // 即使更新失败，代理已经成功，返回成功但记录警告
        logger.warn(`能量代理成功但订单状态更新失败`, { orderId })
      }

      // 10. 记录能量使用日志（第二次记录，确保完整性）
      await this.recordLogger.recordEnergyUsage(
        orderId,
        userAddress,
        energyPerTransaction,
        delegationResult.delegationTxHash!,
        transactionHash
      )

      // 11. 记录代理执行事件
      await this.recordLogger.recordDelegationExecution({
        orderId,
        userAddress,
        delegationTxHash: delegationResult.delegationTxHash!,
        energyDelegated: energyPerTransaction,
        remainingTransactions: updateResult.remainingTransactions,
        sourceAddress: energyAccount.tron_address
      })

      const executionTime = Date.now() - startTime
      logger.info(`单笔交易能量代理成功`, {
        orderId,
        userAddress,
        delegationTxHash: delegationResult.delegationTxHash,
        energyDelegated: energyPerTransaction,
        executionTime: `${executionTime}ms`
      })

      return {
        success: true,
        message: 'Energy delegation completed successfully',
        orderId,
        delegationTxHash: delegationResult.delegationTxHash!,
        energyDelegated: energyPerTransaction,
        remainingTransactions: updateResult.remainingTransactions,
        usedTransactions: updateResult.usedTransactions,
        nextDelegationTime: updateResult.nextDelegationTime
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime
      logger.error(`单笔交易能量代理异常`, {
        orderId,
        userAddress,
        error: error instanceof Error ? error.message : error,
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        phase: 'single_delegation_processor_top_level'
      })
      return {
        success: false,
        message: `Internal error during energy delegation: ${error instanceof Error ? error.message : error}`,
        details: {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          phase: 'single_delegation_processor_execution'
        }
      }
    }
  }

  /**
   * 验证代理前置条件
   * 保持原有接口不变
   */
  async validateDelegationPreconditions(
    orderId: string,
    userAddress: string
  ): Promise<ValidationResult> {
    return await this.delegationValidatorHandler.validateDelegationPreconditions(orderId, userAddress)
  }

  /**
   * 获取代理预估信息
   * 保持原有接口不变
   */
  async getDelegationEstimate(orderId: string): Promise<EstimateResult> {
    return await this.delegationValidatorHandler.getDelegationEstimate(orderId)
  }
}