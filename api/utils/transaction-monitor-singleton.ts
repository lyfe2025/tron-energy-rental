import { DatabaseService } from '../database/DatabaseService.ts';
import { RedisService } from '../services/cache/RedisService.ts';
import { paymentService } from '../services/payment.ts';
import { TransactionMonitorService } from '../services/transaction-monitor.ts';

// 单例实例
let transactionMonitorInstance: TransactionMonitorService | null = null;

/**
 * 获取 TransactionMonitorService 单例实例
 * 确保整个应用使用同一个监控服务实例
 */
export function getTransactionMonitorInstance(): TransactionMonitorService {
  if (!transactionMonitorInstance) {
    const redisService = new RedisService();
    const databaseService = DatabaseService.getInstance();
    
    transactionMonitorInstance = new TransactionMonitorService(
      redisService,
      paymentService,
      databaseService
    );
  }
  
  return transactionMonitorInstance;
}

/**
 * 设置 TransactionMonitorService 实例
 * 用于在服务器启动时设置全局实例
 */
export function setTransactionMonitorInstance(instance: TransactionMonitorService): void {
  transactionMonitorInstance = instance;
}

/**
 * 清除单例实例（主要用于测试）
 */
export function clearTransactionMonitorInstance(): void {
  transactionMonitorInstance = null;
}
