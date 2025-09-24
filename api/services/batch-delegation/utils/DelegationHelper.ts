import { DatabaseService } from '../../../database/DatabaseService'
import { logger } from '../../../utils/logger'

/**
 * 代理工具函数
 * 提供代理相关的通用工具方法
 */
export class DelegationHelper {
  private dbService: DatabaseService

  constructor() {
    this.dbService = DatabaseService.getInstance()
  }

  /**
   * 获取笔数套餐订单
   */
  async getTransactionPackageOrder(orderId: string): Promise<any | null> {
    try {
      const query = `
        SELECT * FROM orders 
        WHERE id = $1 AND order_type = 'transaction_package'
      `
      const result = await this.dbService.query(query, [orderId])
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      logger.error(`获取笔数套餐订单失败`, {
        orderId,
        error: error instanceof Error ? error.message : error
      })
      return null
    }
  }

  /**
   * 更新代理记录
   */
  async updateDelegationRecord(
    orderId: string,
    delegationTxHash: string,
    sourceAddress: string,
    energyAmount: number
  ): Promise<boolean> {
    try {
      const updateQuery = `
        UPDATE orders 
        SET 
          delegate_tx_hash = $2,
          source_address = $3,
          delegated_energy_amount = COALESCE(delegated_energy_amount, 0) + $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND order_type = 'transaction_package'
      `

      const result = await this.dbService.query(updateQuery, [
        orderId,
        delegationTxHash,
        sourceAddress,
        energyAmount
      ])

      const success = result.rowCount > 0
      
      if (success) {
        logger.debug('代理记录更新成功', {
          orderId,
          delegationTxHash: delegationTxHash.substring(0, 12) + '...',
          sourceAddress: sourceAddress.substring(0, 15) + '...',
          energyAmount
        })
      } else {
        logger.warn('代理记录更新失败，未找到订单', { orderId })
      }

      return success
    } catch (error) {
      logger.error('更新代理记录失败', {
        orderId,
        delegationTxHash,
        error: error instanceof Error ? error.message : error
      })
      return false
    }
  }

  /**
   * 格式化TRON地址
   */
  formatTronAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!address || address.length < startChars + endChars) {
      return address
    }
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`
  }

  /**
   * 验证TRON交易哈希格式
   */
  isValidTronTxHash(txHash: string): boolean {
    // TRON交易哈希是64位十六进制字符串
    return /^[a-fA-F0-9]{64}$/.test(txHash)
  }

  /**
   * 计算代理到期时间
   */
  calculateDelegationExpiry(delegationTime: Date, lockPeriod: number): Date {
    const expiryTime = new Date(delegationTime)
    expiryTime.setDate(expiryTime.getDate() + lockPeriod)
    return expiryTime
  }

  /**
   * 检查代理是否已过期
   */
  isDelegationExpired(delegationTime: Date, lockPeriod: number): boolean {
    const expiryTime = this.calculateDelegationExpiry(delegationTime, lockPeriod)
    return new Date() > expiryTime
  }

  /**
   * 获取代理剩余时间（秒）
   */
  getDelegationRemainingTime(delegationTime: Date, lockPeriod: number): number {
    const expiryTime = this.calculateDelegationExpiry(delegationTime, lockPeriod)
    const remaining = Math.max(0, expiryTime.getTime() - Date.now())
    return Math.floor(remaining / 1000)
  }

  /**
   * 转换能量单位
   */
  convertEnergyUnit(energy: number, fromUnit: 'SUN' | 'TRX' = 'SUN', toUnit: 'SUN' | 'TRX' = 'TRX'): number {
    if (fromUnit === toUnit) {
      return energy
    }
    
    if (fromUnit === 'SUN' && toUnit === 'TRX') {
      return energy / 1000000 // 1 TRX = 1,000,000 SUN
    }
    
    if (fromUnit === 'TRX' && toUnit === 'SUN') {
      return energy * 1000000
    }
    
    return energy
  }

  /**
   * 格式化能量数量显示
   */
  formatEnergyAmount(energy: number, unit: 'auto' | 'SUN' | 'TRX' = 'auto'): string {
    if (unit === 'SUN') {
      return `${energy.toLocaleString()} SUN`
    }
    
    if (unit === 'TRX') {
      const trx = this.convertEnergyUnit(energy, 'SUN', 'TRX')
      return `${trx.toFixed(6)} TRX`
    }
    
    // auto unit selection
    if (energy >= 1000000) {
      const trx = this.convertEnergyUnit(energy, 'SUN', 'TRX')
      return `${trx.toFixed(2)} TRX`
    } else {
      return `${energy.toLocaleString()} SUN`
    }
  }

  /**
   * 生成代理记录的唯一ID
   */
  generateDelegationId(orderId: string, timestamp?: Date): string {
    const time = timestamp || new Date()
    const timeStr = time.getTime().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 8)
    return `${orderId.substring(0, 8)}_${timeStr}_${randomStr}`
  }

  /**
   * 解析代理结果错误信息
   */
  parseDelegationError(error: any): {
    code: string
    message: string
    category: 'network' | 'validation' | 'insufficient_funds' | 'system' | 'unknown'
    retryable: boolean
  } {
    const errorStr = error?.message || error?.toString() || 'Unknown error'
    const errorCode = error?.code || 'UNKNOWN'

    // 网络错误
    if (/network|connection|timeout/i.test(errorStr)) {
      return {
        code: errorCode,
        message: errorStr,
        category: 'network',
        retryable: true
      }
    }

    // 验证错误
    if (/invalid|validation|format/i.test(errorStr)) {
      return {
        code: errorCode,
        message: errorStr,
        category: 'validation',
        retryable: false
      }
    }

    // 资金不足
    if (/insufficient|balance|energy/i.test(errorStr)) {
      return {
        code: errorCode,
        message: errorStr,
        category: 'insufficient_funds',
        retryable: false
      }
    }

    // 系统错误
    if (/system|internal|server/i.test(errorStr)) {
      return {
        code: errorCode,
        message: errorStr,
        category: 'system',
        retryable: true
      }
    }

    return {
      code: errorCode,
      message: errorStr,
      category: 'unknown',
      retryable: true
    }
  }

  /**
   * 批量获取订单信息
   */
  async getBatchOrderInfo(orderIds: string[]): Promise<Map<string, any>> {
    const orderMap = new Map()
    
    if (orderIds.length === 0) {
      return orderMap
    }

    try {
      const placeholders = orderIds.map((_, index) => `$${index + 1}`).join(',')
      const query = `
        SELECT id, transaction_count, used_transactions, remaining_transactions,
               status, payment_status, target_address, last_energy_usage_time,
               next_delegation_time, created_at
        FROM orders 
        WHERE id IN (${placeholders}) AND order_type = 'transaction_package'
      `

      const result = await this.dbService.query(query, orderIds)
      
      result.rows.forEach(row => {
        orderMap.set(row.id, row)
      })

      logger.debug('批量获取订单信息成功', {
        requestedCount: orderIds.length,
        foundCount: orderMap.size
      })
    } catch (error) {
      logger.error('批量获取订单信息失败', {
        orderIds: orderIds.slice(0, 5), // 只记录前5个ID
        error: error instanceof Error ? error.message : error
      })
    }

    return orderMap
  }

  /**
   * 计算代理优先级
   */
  calculateDelegationPriority(order: any): number {
    let priority = 0

    // 基础优先级：剩余笔数比例
    const remainingRatio = order.remaining_transactions / (order.transaction_count || 1)
    priority += remainingRatio * 10

    // 时间优先级：等待时间越长优先级越高
    if (order.next_delegation_time) {
      const waitTime = Date.now() - new Date(order.next_delegation_time).getTime()
      if (waitTime > 0) {
        priority += Math.min(waitTime / (1000 * 60 * 60), 24) // 最多24小时的时间加成
      }
    }

    // 创建时间优先级：越早创建的订单优先级越高
    const ageHours = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)
    priority += Math.min(ageHours * 0.1, 10) // 最多10分的年龄加成

    return Math.round(priority * 100) / 100
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
    const { ownerAddress, receiverAddress, balance, resource, lockPeriod } = params

    if (!ownerAddress || !/^T[A-Za-z1-9]{33}$/.test(ownerAddress)) {
      return { valid: false, message: 'Invalid owner address format' }
    }

    if (!receiverAddress || !/^T[A-Za-z1-9]{33}$/.test(receiverAddress)) {
      return { valid: false, message: 'Invalid receiver address format' }
    }

    if (ownerAddress === receiverAddress) {
      return { valid: false, message: 'Owner and receiver addresses cannot be the same' }
    }

    if (!balance || balance <= 0) {
      return { valid: false, message: 'Balance must be positive' }
    }

    if (resource !== 'ENERGY' && resource !== 'BANDWIDTH') {
      return { valid: false, message: 'Resource must be ENERGY or BANDWIDTH' }
    }

    if (lockPeriod !== undefined && (lockPeriod < 1 || lockPeriod > 30)) {
      return { valid: false, message: 'Lock period must be between 1 and 30 days' }
    }

    return { valid: true, message: 'Validation passed' }
  }
}
