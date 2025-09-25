/**
 * 订单查询服务
 * 从TransactionProcessor中分离出的订单查询逻辑
 */
import { query } from '../../../../config/database.ts';
import { orderLogger } from '../../../../utils/logger';

export class OrderQueryService {
  /**
   * 根据交易哈希获取已存在的订单
   */
  static async getExistingOrderByTxHash(txHash: string): Promise<any | null> {
    const shortTxId = txHash.substring(0, 8) + '...';
    try {
      const result = await query(
        `SELECT 
          id, order_number, user_id, network_id, order_type, 
          target_address, energy_amount, price, payment_trx_amount, 
          calculated_units, payment_status, status, tron_tx_hash,
          source_address, created_at, updated_at
         FROM orders 
         WHERE tron_tx_hash = $1
         LIMIT 1`,
        [txHash]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error: any) {
      orderLogger.error(`📦 [${shortTxId}] ❌ 获取已存在订单失败 - 详细错误信息`, {
        txHash: txHash,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        processStep: '数据库查询已存在订单时发生异常',
        queryDetails: {
          method: 'query',
          table: 'orders',
          condition: 'tron_tx_hash = $1',
          parameter: txHash
        },
        querySQL: 'SELECT id, order_number, user_id... FROM orders WHERE tron_tx_hash = $1 LIMIT 1'
      });
      return null;
    }
  }
}
