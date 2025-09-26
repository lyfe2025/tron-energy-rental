/**
 * 代理验证器
 * 从 SingleDelegationProcessor.ts 分离出的验证和预检查逻辑
 */

import { logger } from '../../../../utils/logger'
import { EnergyPoolService } from '../../../energy-pool/EnergyPoolService'
import { DelegationValidator as CoreDelegationValidator } from '../../core/DelegationValidator'
import { StatusManager } from '../../core/StatusManager'
import { DelegationHelper } from '../../utils/DelegationHelper'
import type { EstimateResult, ValidationResult } from '../types/delegation.types'

export class DelegationValidator {
  private coreDelegationValidator: CoreDelegationValidator
  private statusManager: StatusManager
  private delegationHelper: DelegationHelper
  private energyPoolService: EnergyPoolService

  constructor() {
    this.coreDelegationValidator = new CoreDelegationValidator()
    this.statusManager = new StatusManager()
    this.delegationHelper = new DelegationHelper()
    this.energyPoolService = new EnergyPoolService()
  }

  /**
   * 验证代理前置条件
   */
  async validateDelegationPreconditions(
    orderId: string,
    userAddress: string
  ): Promise<ValidationResult> {
    try {
      // 1. 验证请求参数
      const requestValidation = this.coreDelegationValidator.validateDelegationRequest(
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
      const orderValidation = this.coreDelegationValidator.validateOrderForDelegation(order, userAddress)
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

      // 5. 获取能量需求（从订单计算单笔能量）
      const energyRequired = Math.floor(order.energy_amount / order.transaction_count)
      
      logger.info(`[代理前验证] 计算单笔能量需求`, {
        orderId,
        '订单总能量': order.energy_amount,
        '总笔数': order.transaction_count,
        '单笔能量需求': energyRequired
      })

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
    } catch (error: any) {
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
  async getDelegationEstimate(orderId: string): Promise<EstimateResult> {
    try {
      const order = await this.delegationHelper.getTransactionPackageOrder(orderId)
      if (!order) {
        return {
          success: false,
          message: 'Order not found'
        }
      }

      // 从订单计算单笔能量（基于后台配置的标准转账能量消耗*(1+安全缓冲百分比)）
      const energyAmount = Math.floor(order.energy_amount / order.transaction_count)
      const lockPeriod = 3 // 默认3天
      
      logger.info(`[检查代理状态] 计算单笔能量`, {
        orderId,
        '订单总能量': order.energy_amount,
        '总笔数': order.transaction_count,
        '单笔能量': energyAmount
      })

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
    } catch (error: any) {
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
