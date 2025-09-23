/**
 * 处理锁管理器
 * 负责Redis分布式锁的获取和释放，防止并发处理同一交易
 */

import { orderLogger } from '../../../utils/logger';
import { RedisService } from '../../cache/RedisService';
import type { ProcessingLockResult } from './types';

export class ProcessingLockManager {
  private redisService: RedisService;

  constructor() {
    this.redisService = new RedisService();
  }

  /**
   * 获取处理锁（防止并发处理同一交易）
   * @param txId 交易哈希
   * @param ttl 锁的生存时间（秒）
   * @returns 锁获取结果
   */
  async acquireProcessingLock(txId: string, ttl: number): Promise<ProcessingLockResult> {
    try {
      const lockKey = `flash_rent_lock:${txId}`;
      const lockValue = Date.now().toString();
      
      // 使用Redis SETNX命令实现分布式锁
      const result = await this.redisService.setNX(lockKey, lockValue, ttl);
      
      orderLogger.info(`   🔒 尝试获取处理锁`, {
        txId,
        lockKey,
        lockValue,
        ttl: `${ttl}秒`,
        success: result,
        step: 'acquire_lock'
      });
      
      return {
        success: result,
        lockKey,
        lockValue: result ? lockValue : undefined
      };
    } catch (error) {
      orderLogger.error(`❌ 获取处理锁失败`, {
        txId,
        error: error.message,
        step: 'acquire_lock_failed'
      });
      
      // 如果Redis失败，为了安全起见返回false（不允许处理）
      return {
        success: false,
        lockKey: `flash_rent_lock:${txId}`
      };
    }
  }

  /**
   * 释放处理锁
   * @param txId 交易哈希
   */
  async releaseProcessingLock(txId: string): Promise<void> {
    try {
      const lockKey = `flash_rent_lock:${txId}`;
      await this.redisService.del(lockKey);
      
      orderLogger.info(`   🔓 释放处理锁成功`, {
        txId,
        lockKey,
        step: 'release_lock_success'
      });
    } catch (error) {
      orderLogger.error(`❌ 释放处理锁失败`, {
        txId,
        error: error.message,
        step: 'release_lock_failed'
      });
      // 锁释放失败不抛出错误，因为锁会自动过期
    }
  }

  /**
   * 检查锁是否存在
   * @param txId 交易哈希
   * @returns 锁是否存在
   */
  async isLockExists(txId: string): Promise<boolean> {
    try {
      const lockKey = `flash_rent_lock:${txId}`;
      return await this.redisService.exists(lockKey);
    } catch (error) {
      orderLogger.error(`❌ 检查锁状态失败`, {
        txId,
        error: error.message
      });
      return false;
    }
  }
}
