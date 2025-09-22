import { query } from '../../database/index';
import type { PaymentStatistics, PaymentStatusResult } from './types';

export class PaymentStatsService {

  // 检查支付状态
  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
    try {
      const result = await query(
        `SELECT * FROM payment_transactions WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );

      if (!result.rows || result.rows.length === 0) {
        return { status: 'not_found', message: 'Payment record not found' };
      }

      const payment = result.rows[0];
      return {
        status: payment.status,
        txid: payment.txid,
        amount: payment.amount,
        confirmations: payment.confirmations,
        created_at: payment.created_at,
        confirmed_at: payment.confirmed_at
      };
    } catch (error) {
      console.error('Failed to check payment status:', error);
      return { status: 'error', message: 'Failed to check payment status' };
    }
  }

  // 获取支付统计
  async getPaymentStatistics(timeRange: 'day' | 'week' | 'month' = 'day'): Promise<PaymentStatistics | null> {
    try {
      let timeThreshold: string;
      const now = new Date();
      
      switch (timeRange) {
        case 'week':
          timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }

      const result = await query(
        `SELECT status, amount FROM payment_transactions 
         WHERE created_at >= $1`,
        [timeThreshold]
      );

      const data = result.rows;

      const stats: PaymentStatistics = {
        total: data.length,
        confirmed: data.filter(p => p.status === 'confirmed').length,
        pending: data.filter(p => p.status === 'pending').length,
        failed: data.filter(p => p.status === 'failed').length,
        expired: data.filter(p => p.status === 'expired').length,
        totalAmount: data.reduce((sum, p) => sum + p.amount, 0),
        confirmedAmount: data.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0),
        successRate: 0
      };

      stats.successRate = stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0;

      return stats;
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }
}
