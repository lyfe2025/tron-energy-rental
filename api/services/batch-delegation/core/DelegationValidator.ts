
interface DelegationValidationResult {
  success: boolean
  message: string
}

interface OrderValidationData {
  id: string
  status: string
  payment_status: string
  remaining_transactions: number
  target_address?: string
}

/**
 * 代理验证器
 * 负责验证订单和代理请求的有效性
 */
export class DelegationValidator {
  /**
   * 验证订单是否可以进行代理
   */
  validateOrderForDelegation(order: OrderValidationData, userAddress: string): DelegationValidationResult {
    // 检查订单状态
    if (order.status !== 'active') {
      return {
        success: false,
        message: `Order status is ${order.status}, expected 'active'`
      }
    }

    // 检查支付状态
    if (order.payment_status !== 'paid') {
      return {
        success: false,
        message: `Payment status is ${order.payment_status}, expected 'paid'`
      }
    }

    // 检查剩余交易笔数
    const remainingTransactions = order.remaining_transactions || 0
    if (remainingTransactions <= 0) {
      return {
        success: false,
        message: 'No remaining transactions available for delegation'
      }
    }

    // 检查目标地址是否匹配
    if (order.target_address && order.target_address !== userAddress) {
      return {
        success: false,
        message: 'User address does not match order target address'
      }
    }

    return {
      success: true,
      message: 'Order validation passed'
    }
  }

  /**
   * 验证代理请求参数
   */
  validateDelegationRequest(
    orderId: string,
    userAddress: string,
    energyAmount?: number
  ): DelegationValidationResult {
    // 验证orderId
    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        message: 'Valid order ID is required'
      }
    }

    // 验证userAddress
    if (!userAddress || typeof userAddress !== 'string') {
      return {
        success: false,
        message: 'Valid user address is required'
      }
    }

    // 验证TRON地址格式
    if (!this.isValidTronAddress(userAddress)) {
      return {
        success: false,
        message: 'Invalid TRON address format'
      }
    }

    // 验证能量数量（如果提供）
    if (energyAmount !== undefined) {
      if (typeof energyAmount !== 'number' || energyAmount <= 0) {
        return {
          success: false,
          message: 'Energy amount must be a positive number'
        }
      }

      if (energyAmount < 1000) {
        return {
          success: false,
          message: 'Energy amount must be at least 1000'
        }
      }
    }

    return {
      success: true,
      message: 'Delegation request validation passed'
    }
  }

  /**
   * 验证批量代理请求
   */
  validateBatchDelegationRequest(delegations: Array<{
    orderId: string
    userAddress: string
    transactionHash?: string
  }>): DelegationValidationResult {
    if (!Array.isArray(delegations)) {
      return {
        success: false,
        message: 'Delegations must be an array'
      }
    }

    if (delegations.length === 0) {
      return {
        success: false,
        message: 'At least one delegation is required'
      }
    }

    if (delegations.length > 50) {
      return {
        success: false,
        message: 'Maximum 50 delegations allowed per batch'
      }
    }

    // 验证每个代理请求
    for (let i = 0; i < delegations.length; i++) {
      const delegation = delegations[i]
      const validation = this.validateDelegationRequest(
        delegation.orderId,
        delegation.userAddress
      )

      if (!validation.success) {
        return {
          success: false,
          message: `Delegation ${i + 1}: ${validation.message}`
        }
      }
    }

    // 检查重复的订单ID
    const orderIds = delegations.map(d => d.orderId)
    const uniqueOrderIds = new Set(orderIds)
    if (orderIds.length !== uniqueOrderIds.size) {
      return {
        success: false,
        message: 'Duplicate order IDs found in batch'
      }
    }

    return {
      success: true,
      message: 'Batch delegation request validation passed'
    }
  }

  /**
   * 验证交易笔数更新请求
   */
  validateTransactionCountUpdate(
    orderId: string,
    usedCount: number,
    totalCount: number,
    currentUsed: number
  ): DelegationValidationResult {
    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        message: 'Valid order ID is required'
      }
    }

    if (typeof usedCount !== 'number' || usedCount < 0) {
      return {
        success: false,
        message: 'Used count must be a non-negative number'
      }
    }

    if (typeof totalCount !== 'number' || totalCount <= 0) {
      return {
        success: false,
        message: 'Total count must be a positive number'
      }
    }

    if (typeof currentUsed !== 'number' || currentUsed < 0) {
      return {
        success: false,
        message: 'Current used count must be a non-negative number'
      }
    }

    const newUsedCount = currentUsed + usedCount
    if (newUsedCount > totalCount) {
      return {
        success: false,
        message: 'Used count exceeds total transaction count'
      }
    }

    return {
      success: true,
      message: 'Transaction count update validation passed'
    }
  }

  /**
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    // TRON地址格式：Base58编码，以T开头，长度34位
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/
    return tronAddressRegex.test(address)
  }

  /**
   * 验证能量池账户可用性
   */
  validateEnergyPoolAccount(account: any, requiredEnergy: number): DelegationValidationResult {
    if (!account) {
      return {
        success: false,
        message: 'Energy pool account not found'
      }
    }

    if (!account.tron_address) {
      return {
        success: false,
        message: 'Energy pool account address is missing'
      }
    }

    if (!this.isValidTronAddress(account.tron_address)) {
      return {
        success: false,
        message: 'Invalid energy pool account address format'
      }
    }

    if (account.available_energy < requiredEnergy) {
      return {
        success: false,
        message: 'Insufficient energy in pool account'
      }
    }

    if (account.status !== 'active') {
      return {
        success: false,
        message: 'Energy pool account is not active'
      }
    }

    return {
      success: true,
      message: 'Energy pool account validation passed'
    }
  }

  /**
   * 验证代理配置参数
   */
  validateDelegationConfig(config: {
    energyPerTransaction?: number
    lockPeriod?: number
    intervalMinutes?: number
  }): DelegationValidationResult {
    if (config.energyPerTransaction !== undefined) {
      if (typeof config.energyPerTransaction !== 'number' || config.energyPerTransaction <= 0) {
        return {
          success: false,
          message: 'Energy per transaction must be a positive number'
        }
      }

      if (config.energyPerTransaction < 1000) {
        return {
          success: false,
          message: 'Energy per transaction must be at least 1000'
        }
      }
    }

    if (config.lockPeriod !== undefined) {
      if (typeof config.lockPeriod !== 'number' || config.lockPeriod <= 0) {
        return {
          success: false,
          message: 'Lock period must be a positive number'
        }
      }

      if (config.lockPeriod > 30) {
        return {
          success: false,
          message: 'Lock period cannot exceed 30 days'
        }
      }
    }

    if (config.intervalMinutes !== undefined) {
      if (typeof config.intervalMinutes !== 'number' || config.intervalMinutes <= 0) {
        return {
          success: false,
          message: 'Interval minutes must be a positive number'
        }
      }

      if (config.intervalMinutes < 1) {
        return {
          success: false,
          message: 'Interval minutes must be at least 1'
        }
      }
    }

    return {
      success: true,
      message: 'Delegation config validation passed'
    }
  }
}
