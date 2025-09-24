import { logger } from '../../../utils/logger'
import { PriceConfigService } from '../../PriceConfigService.ts'

interface DailyFeeConfig {
  checkInterval: number // 检查间隔（毫秒）
  batchSize: number // 每批处理的订单数量
  maxRetries: number // 最大重试次数
  retryDelay: number // 重试延迟（毫秒）
  feeCheckTime: string // 每日费用检查时间 (HH:mm格式)
  gracePeriodHours: number // 宽限期（小时）
  inactiveThresholdHours: number // 非活跃阈值（小时）
}

/**
 * 配置管理器
 * 负责日费服务的配置加载和管理
 */
export class ConfigManager {
  private priceConfigService: PriceConfigService
  private config: DailyFeeConfig

  constructor() {
    this.priceConfigService = PriceConfigService.getInstance()
    this.config = this.getDefaultConfig()
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): DailyFeeConfig {
    return {
      checkInterval: 60000, // 1分钟检查一次
      batchSize: 20, // 每批处理20个订单
      maxRetries: 3,
      retryDelay: 5000, // 5秒重试延迟
      feeCheckTime: '00:00', // 每日凌晨检查
      gracePeriodHours: 1, // 1小时宽限期
      inactiveThresholdHours: 24 // 24小时未使用视为需要扣费
    }
  }

  /**
   * 加载配置
   */
  async loadConfig(): Promise<void> {
    try {
      const priceConfig = await this.priceConfigService.getTransactionPackageConfig()
      if (priceConfig) {
        // 从配置中更新日费参数
        if (priceConfig.daily_fee_check_time) {
          this.config.feeCheckTime = priceConfig.daily_fee_check_time
        }
      }
      
      logger.debug('日费配置已加载', this.config)
    } catch (error) {
      logger.error('加载日费配置失败', {
        error: error instanceof Error ? error.message : error
      })
      // 使用默认配置继续运行
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): DailyFeeConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<DailyFeeConfig>): void {
    this.config = { ...this.config, ...updates }
    logger.debug('日费配置已更新', this.config)
  }

  /**
   * 判断是否应该执行日费检查
   */
  shouldPerformDailyFeeCheck(): boolean {
    const now = new Date()
    const [targetHour, targetMinute] = this.config.feeCheckTime.split(':').map(Number)
    
    // 检查当前时间是否接近目标时间（允许一定误差）
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    const targetTime = targetHour * 60 + targetMinute
    const currentTime = currentHour * 60 + currentMinute
    
    // 允许前后5分钟的误差
    const tolerance = 5
    
    return Math.abs(currentTime - targetTime) <= tolerance
  }

  /**
   * 计算下次费用检查时间
   */
  calculateNextFeeCheckTime(): Date | null {
    try {
      const now = new Date()
      const [targetHour, targetMinute] = this.config.feeCheckTime.split(':').map(Number)
      
      const nextCheck = new Date(now)
      nextCheck.setHours(targetHour, targetMinute, 0, 0)
      
      // 如果今天的检查时间已过，设置为明天
      if (nextCheck <= now) {
        nextCheck.setDate(nextCheck.getDate() + 1)
      }
      
      return nextCheck
    } catch (error) {
      logger.error('计算下次费用检查时间失败', {
        error: error instanceof Error ? error.message : error
      })
      return null
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = this.getDefaultConfig()
    logger.info('日费配置已重置为默认值')
  }
}
