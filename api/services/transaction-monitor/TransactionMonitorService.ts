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
      this.logger.warn('TransactionMonitorService已在运行中');
      return;
    }

    try {
      // 加载需要监听的地址
      await this.addressManager.loadMonitoredAddresses();

      if (this.addressManager.getAddressCount() === 0) {
        this.logger.warn('没有需要监听的地址，跳过启动监听服务');
        return;
      }

      this.isRunning = true;
      this.logger.info(`🚀 启动交易监听服务，监听 ${this.addressManager.getAddressCount()} 个地址`);

      // 立即执行一次轮询
      await this.pollTransactions();

      // 启动定时轮询
      this.intervalId = setInterval(async () => {
        try {
          await this.pollTransactions();
        } catch (error) {
          this.logger.error('轮询交易时发生错误:', error);
        }
      }, this.POLL_INTERVAL);

      this.logger.info('交易监听服务启动成功');
    } catch (error) {
      this.isRunning = false;
      this.logger.error('启动交易监听服务失败:', error);
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
      return;
    }

    const monitoredAddresses = this.addressManager.getAllAddresses();
    const promises = Array.from(monitoredAddresses.values()).map(
      (monitoredAddress) => this.transactionProcessor.processAddressTransactions(monitoredAddress)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.error('批量轮询交易失败:', error);
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
