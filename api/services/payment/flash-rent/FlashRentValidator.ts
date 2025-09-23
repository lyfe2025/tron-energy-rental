/**
 * 能量闪租验证器
 * 负责交易验证和订单重复性检查
 */

import { query } from '../../../database/index';
import { orderLogger } from '../../../utils/logger';
import type { ExistingOrder, FlashRentTransaction } from './types';

export class FlashRentValidator {

  /**
   * 检查是否已存在相同交易哈希的订单
   * @param txId 交易哈希
   * @returns 现有订单信息或null
   */
  async checkExistingOrder(txId: string): Promise<ExistingOrder | null> {
    try {
      const result = await query(
        `SELECT id, order_number, status FROM orders 
         WHERE tron_tx_hash = $1 
         ORDER BY created_at ASC 
         LIMIT 1`,
        [txId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      orderLogger.error(`检查现有订单失败`, {
        txId: txId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 验证闪租交易的有效性
   * @param transaction 交易对象
   * @returns 是否通过验证
   */
  validateFlashRentTransaction(transaction: FlashRentTransaction): boolean {
    try {
      // 检查基本字段
      if (!transaction.txID || !transaction.from || !transaction.to || !transaction.amount) {
        orderLogger.warn(`交易验证失败：缺少必要字段`, {
          txId: transaction.txID,
          hasFrom: !!transaction.from,
          hasTo: !!transaction.to,
          hasAmount: !!transaction.amount
        });
        return false;
      }

      // 检查金额是否为正数
      if (transaction.amount <= 0) {
        orderLogger.warn(`交易验证失败：金额无效`, {
          txId: transaction.txID,
          amount: transaction.amount
        });
        return false;
      }

      // 检查交易是否已确认
      if (!transaction.confirmed) {
        orderLogger.warn(`交易验证失败：交易未确认`, {
          txId: transaction.txID,
          confirmed: transaction.confirmed
        });
        return false;
      }

      // 检查交易时间是否过旧（避免处理过旧的交易）
      const maxAge = 3600000; // 1小时
      const transactionAge = Date.now() - transaction.timestamp;
      if (transactionAge > maxAge) {
        orderLogger.warn(`交易验证失败：交易过旧`, {
          txId: transaction.txID,
          age: transactionAge,
          maxAge: maxAge,
          ageInMinutes: Math.round(transactionAge / 60000)
        });
        return false;
      }

      orderLogger.info(`交易验证通过`, {
        txId: transaction.txID,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        age: transactionAge
      });

      return true;
    } catch (error) {
      orderLogger.error('交易验证过程中发生错误', {
        txId: transaction?.txID,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 检查订单是否可以继续处理
   * @param existingOrder 现有订单
   * @returns 是否可以继续处理
   */
  canContinueProcessing(existingOrder: ExistingOrder): boolean {
    const processableStatuses = ['pending', 'pending_delegation', 'processing'];
    return processableStatuses.includes(existingOrder.status);
  }

  /**
   * 检查订单是否已完成处理
   * @param existingOrder 现有订单
   * @returns 是否已完成
   */
  isOrderCompleted(existingOrder: ExistingOrder): boolean {
    const completedStatuses = ['completed', 'failed', 'cancelled', 'delegated'];
    return completedStatuses.includes(existingOrder.status);
  }
}
