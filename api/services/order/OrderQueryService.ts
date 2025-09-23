/**
 * 订单查询服务
 * 负责订单数据的查询、搜索和统计功能
 */
import { query } from '../../database/index';
import type { Order, OrderStats } from './types.js';

export class OrderQueryService {
  /**
   * 获取订单详情
   */
  async getOrderById(orderId: number): Promise<Order | null> {
    try {
      const result = await query(
        `SELECT 
           o.*,
           u.telegram_id,
           u.username,
           u.first_name,
           u.last_name,
           u.email
         FROM orders o 
         LEFT JOIN users u ON o.user_id = u.id 
         WHERE o.id = $1`,
        [orderId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(
    userId: number, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<Order[]> {
    try {
      const result = await query(
        `SELECT 
           o.*,
           u.telegram_id,
           u.username,
           u.first_name,
           u.last_name,
           u.email
         FROM orders o 
         LEFT JOIN users u ON o.user_id = u.id 
         WHERE o.user_id = $1 
         ORDER BY o.created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      console.error('Get user orders error:', error);
      throw error;
    }
  }

  /**
   * 获取活跃订单列表
   */
  async getActiveOrders(limit: number = 100): Promise<Order[]> {
    try {
      const result = await query(
        `SELECT 
           o.*,
           u.telegram_id,
           u.username,
           u.first_name,
           u.last_name,
           u.email
         FROM orders o 
         LEFT JOIN users u ON o.user_id = u.id 
         WHERE o.status IN ('paid', 'processing', 'active') 
         ORDER BY o.created_at DESC 
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Get active orders error:', error);
      throw error;
    }
  }

  /**
   * 搜索订单
   */
  async searchOrders(
    searchQuery: {
      userId?: number;
      status?: Order['status'];
      recipientAddress?: string;
      txHash?: string;
      dateFrom?: Date;
      dateTo?: Date;
      networkId?: string;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (searchQuery.userId) {
        conditions.push(`user_id = $${paramIndex}`);
        values.push(searchQuery.userId);
        paramIndex++;
      }

      if (searchQuery.status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(searchQuery.status);
        paramIndex++;
      }

      if (searchQuery.recipientAddress) {
        conditions.push(`recipient_address = $${paramIndex}`);
        values.push(searchQuery.recipientAddress);
        paramIndex++;
      }

      if (searchQuery.txHash) {
        conditions.push(`(payment_tx_hash = $${paramIndex} OR delegation_tx_hash = $${paramIndex})`);
        values.push(searchQuery.txHash);
        paramIndex++;
      }

      if (searchQuery.dateFrom) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(searchQuery.dateFrom);
        paramIndex++;
      }

      if (searchQuery.dateTo) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(searchQuery.dateTo);
        paramIndex++;
      }

      // 添加网络ID筛选
      if (searchQuery.networkId) {
        conditions.push(`network_id = $${paramIndex}`);
        values.push(searchQuery.networkId);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 获取总数
      const countResult = await query(
        `SELECT COUNT(*) as total FROM orders ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // 获取订单列表，JOIN users表获取用户信息
      const ordersResult = await query(
        `SELECT 
           o.*,
           u.telegram_id,
           u.username,
           u.first_name,
           u.last_name,
           u.email
         FROM orders o 
         LEFT JOIN users u ON o.user_id = u.id 
         ${whereClause} 
         ORDER BY o.created_at DESC 
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      );

      return {
        orders: ordersResult.rows,
        total
      };
    } catch (error) {
      console.error('Search orders error:', error);
      throw error;
    }
  }

  /**
   * 获取订单统计
   */
  async getOrderStats(days: number = 30): Promise<OrderStats> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'processing', 'active', 'completed') THEN price_trx ELSE 0 END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status IN ('paid', 'processing', 'active', 'completed') THEN price_trx END), 0) as average_order_value
         FROM orders 
         WHERE created_at >= NOW() - INTERVAL ${days} DAY`
      );

      const stats = result[0];
      
      return {
        total: parseInt(stats.total),
        pending: parseInt(stats.pending),
        paid: parseInt(stats.paid),
        processing: parseInt(stats.processing),
        active: parseInt(stats.active),
        completed: parseInt(stats.completed),
        failed: parseInt(stats.failed),
        cancelled: parseInt(stats.cancelled),
        expired: parseInt(stats.expired),
        totalRevenue: parseFloat(stats.total_revenue),
        averageOrderValue: parseFloat(stats.average_order_value)
      };
    } catch (error) {
      console.error('Get order stats error:', error);
      throw error;
    }
  }

  /**
   * 获取指定时间段的订单趋势数据
   */
  async getOrderTrend(days: number = 30): Promise<Array<{
    date: string;
    total: number;
    revenue: number;
    failed: number;
  }>> {
    try {
      const result = await query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'processing', 'active', 'completed') THEN price_trx ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
         FROM orders 
         WHERE created_at >= NOW() - INTERVAL ${days} DAY
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      );

      return result.rows.map(row => ({
        date: row.date,
        total: parseInt(row.total),
        revenue: parseFloat(row.revenue),
        failed: parseInt(row.failed)
      }));
    } catch (error) {
      console.error('Get order trend error:', error);
      throw error;
    }
  }

  /**
   * 获取热门收件地址排行
   */
  async getTopRecipientAddresses(limit: number = 10, days: number = 30): Promise<Array<{
    address: string;
    orderCount: number;
    totalRevenue: number;
    averageAmount: number;
  }>> {
    try {
      const result = await query(
        `SELECT 
          recipient_address as address,
          COUNT(*) as order_count,
          COALESCE(SUM(CASE WHEN status IN ('paid', 'processing', 'active', 'completed') THEN price_trx ELSE 0 END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status IN ('paid', 'processing', 'active', 'completed') THEN price_trx END), 0) as average_amount
         FROM orders 
         WHERE created_at >= NOW() - INTERVAL ${days} DAY
         GROUP BY recipient_address
         HAVING COUNT(*) > 1
         ORDER BY order_count DESC, total_revenue DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        address: row.address,
        orderCount: parseInt(row.order_count),
        totalRevenue: parseFloat(row.total_revenue),
        averageAmount: parseFloat(row.average_amount)
      }));
    } catch (error) {
      console.error('Get top recipient addresses error:', error);
      throw error;
    }
  }
}

export const orderQueryService = new OrderQueryService();
