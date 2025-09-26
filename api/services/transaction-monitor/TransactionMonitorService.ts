/**
 * 交易监听服务 - 主服务类
 * 负责协调各个子服务，提供统一的交易监听接口
 */
import { Logger } from 'winston';
import { DatabaseService } from '../../database/DatabaseService';
import { createBotLogger } from '../../utils/logger';
import { RedisService } from '../cache/RedisService';
import { PaymentService } from '../payment';
import { MonitoredAddressManager } from './MonitoredAddressManager';
import { TransactionCache } from './TransactionCache';
import { TransactionParser } from './TransactionParser';
import { TransactionProcessor } from './TransactionProcessor';

export class TransactionMonitorService {
  private logger: Logger;
  private intervalId?: NodeJS.Timeout;
  private readonly POLL_INTERVAL = 5000; // 5秒轮询
  private isRunning = false;

  // 子服务
  private addressManager: MonitoredAddressManager;
  private transactionCache: TransactionCache;
  private transactionParser: TransactionParser;
  private transactionProcessor: TransactionProcessor;

  constructor(
    private redisService: RedisService,
    private paymentService: PaymentService,
    private databaseService: DatabaseService
  ) {
    this.logger = createBotLogger('TransactionMonitor');
    
    // 初始化子服务
    this.addressManager = new MonitoredAddressManager(this.logger, this.databaseService);
    this.transactionCache = new TransactionCache(this.logger, this.redisService);
    this.transactionParser = new TransactionParser(this.logger);
    this.transactionProcessor = new TransactionProcessor(
      this.logger,
      this.transactionCache,
      this.transactionParser,
      this.paymentService
    );
  }

  /**
   * 启动交易监听服务
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('🔄 TransactionMonitorService已在运行中');
      return;
    }

    this.logger.info('🚀 开始启动交易监听服务...');

    try {
      // 步骤1: 加载需要监听的地址
      this.logger.info('📋 步骤1: 开始加载监听地址配置...');
      await this.addressManager.loadMonitoredAddresses();

      const addressCount = this.addressManager.getAddressCount();
      if (addressCount === 0) {
        this.logger.warn('⚠️ 没有找到需要监听的地址，跳过启动监听服务');
        this.logger.info('💡 请检查数据库中price_configs表的配置和网络状态');
        return;
      }

      this.logger.info(`✅ 步骤1完成: 成功加载 ${addressCount} 个监听地址`);

      // 步骤2: 标记服务运行状态
      this.isRunning = true;
      this.logger.info('📡 步骤2: 交易监听服务已启动');

      // 步骤3: 执行首次轮询
      this.logger.info('🔍 步骤3: 执行首次交易轮询...');
      await this.pollTransactions();
      this.logger.info('✅ 步骤3完成: 首次轮询完成');

      // 步骤4: 启动定时轮询
      this.logger.info(`⏰ 步骤4: 启动定时轮询 (间隔: ${this.POLL_INTERVAL}ms)`);
      this.intervalId = setInterval(async () => {
        try {
          await this.pollTransactions();
        } catch (error) {
          this.logger.error('❌ 定时轮询时发生错误:', error);
        }
      }, this.POLL_INTERVAL);

      this.logger.info('🎉 交易监听服务启动成功！');
      this.logger.info(`📊 服务状态: 监听${addressCount}个地址，轮询间隔${this.POLL_INTERVAL}ms`);
    } catch (error) {
      this.isRunning = false;
      this.logger.error('❌ 启动交易监听服务失败:', error);
      this.logger.error('🔧 请检查数据库连接、网络配置和TronGrid API密钥');
      throw error;
    }
  }

  /**
   * 停止交易监听服务
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.addressManager.clear();
    this.logger.info('交易监听服务已停止');
  }

  /**
   * 重新加载监听地址（当配置更新时调用）
   */
  async reloadAddresses(): Promise<void> {
    await this.addressManager.reloadAddresses();
  }

  /**
   * 轮询所有监听地址的交易
   */
  private async pollTransactions(): Promise<void> {
    if (!this.isRunning || this.addressManager.getAddressCount() === 0) {
      this.logger.debug('🔍 轮询跳过: 服务未运行或无监听地址');
      return;
    }

    const monitoredAddresses = this.addressManager.getAllAddresses();
    const addressCount = Array.from(monitoredAddresses.values()).length;
    
    // 静默轮询，只在有错误时输出日志
    
    const promises = Array.from(monitoredAddresses.values()).map(
      async (monitoredAddress) => {
        // 安全检查：确保地址存在
        const address = monitoredAddress?.address;
        const shortAddress = (address && typeof address === 'string') ? 
          address.substring(0, 8) + '...' : '[无效地址]';
        
        try {
          await this.transactionProcessor.processAddressTransactions(monitoredAddress);
        } catch (error) {
          this.logger.error(`❌ 处理地址 ${shortAddress} 的交易时出错:`, error);
          throw error; // 重新抛出以便Promise.allSettled能捕获
        }
      }
    );

    try {
      const results = await Promise.allSettled(promises);
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed > 0) {
        this.logger.warn(`⚠️ 轮询完成: ${succeeded} 成功, ${failed} 失败`);
      }
      // 成功时不输出日志，减少噪音
    } catch (error) {
      this.logger.error('❌ 批量轮询交易失败:', error);
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isRunning: boolean; monitoredAddresses: number } {
    return {
      isRunning: this.isRunning,
      monitoredAddresses: this.addressManager.getAddressCount()
    };
  }
}
