/**
 * 交易缓存管理器
 * 负责管理已处理交易的Redis缓存，避免重复处理
 */
import { Logger } from 'winston';
import { RedisService } from '../cache/RedisService';

export class TransactionCache {
  private readonly PROCESSED_TX_TTL = 86400; // 24小时

  constructor(
    private logger: Logger,
    private redisService: RedisService
  ) {}

  /**
   * 检查交易是否已处理
   */
  async isTransactionProcessed(txId: string): Promise<boolean> {
    try {
      const key = `flash_rent_processed:${txId}`;
      const result = await this.redisService.get(key);
      return result !== null;
    } catch (error) {
      // 如果是Redis连接问题，跳过去重检查让交易继续处理
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        this.logger.warn(`Redis连接不可用，跳过交易去重检查 ${txId}`);
        return false;
      }
      this.logger.error(`检查交易处理状态失败 ${txId}:`, error);
      return false;
    }
  }

  /**
   * 标记交易为已处理
   */
  async markTransactionProcessed(txId: string): Promise<void> {
    try {
      const key = `flash_rent_processed:${txId}`;
      await this.redisService.set(key, Date.now().toString(), this.PROCESSED_TX_TTL);
    } catch (error) {
      // 如果是Redis连接问题，只警告但不影响交易处理
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        this.logger.warn(`Redis连接不可用，无法标记交易处理状态 ${txId}，但交易处理将继续`);
        return;
      }
      this.logger.error(`标记交易处理状态失败 ${txId}:`, error);
    }
  }

  /**
   * 移除处理标记
   */
  async removeProcessedMark(txId: string): Promise<void> {
    try {
      const key = `flash_rent_processed:${txId}`;
      await this.redisService.del(key);
    } catch (error) {
      // 如果是Redis连接问题，只警告但不影响交易处理
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('client is closed') || errorMessage.includes('connection unavailable')) {
        this.logger.warn(`Redis连接不可用，无法移除交易处理标记 ${txId}`);
        return;
      }
      this.logger.error(`移除交易处理标记失败 ${txId}:`, error);
    }
  }
}
