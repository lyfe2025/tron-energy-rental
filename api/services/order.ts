import { query } from '../database/index';
import { energyDelegationService } from './energy-delegation';
import { energyPoolService } from './energy-pool';
import { paymentService } from './payment';

export interface CreateOrderRequest {
  userId: number;
  packageId: number;
  energyAmount: number;
  durationHours: number;
  priceTrx: number;
  recipientAddress: string;
}

export interface Order {
  id: number;
  user_id: number;
  package_id: number;
  energy_amount: number;
  duration_hours: number;
  price_trx: number;
  recipient_address: string;
  status: 'pending' | 'paid' | 'processing' | 'active' | 'completed' | 'failed' | 'cancelled' | 'expired';
  payment_address?: string;
  payment_amount?: number;
  payment_tx_hash?: string;
  delegation_tx_hash?: string;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  processing: number;
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
  expired: number;
  totalRevenue: number;
  averageOrderValue: number;
}

class OrderService {
  /**
   * 创建新订单
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    try {
      // 验证用户地址格式
      if (!this.isValidTronAddress(request.recipientAddress)) {
        throw new Error('Invalid TRON address format');
      }

      // 检查能量池可用性
      const activePools = await energyPoolService.getActivePoolAccounts();
      const totalAvailableEnergy = activePools.reduce((sum, pool) => sum + pool.available_energy, 0);
      if (totalAvailableEnergy < request.energyAmount) {
        throw new Error('Insufficient energy available in pools');
      }

      // 计算过期时间（24小时后）
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await query(
        `INSERT INTO orders (
          user_id, package_id, energy_amount, duration_hours, 
          price_trx, recipient_address, status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          request.userId,
          request.packageId,
          request.energyAmount,
          request.durationHours,
          request.priceTrx,
          request.recipientAddress,
          'pending',
          expiresAt
        ]
      );

      const order = result.rows[0];
      console.log('Order created:', order.id);

      return order;
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  /**
   * 获取订单详情
   */
  async getOrderById(orderId: number): Promise<Order | null> {
    try {
      const result = await query(
        'SELECT * FROM orders WHERE id = $1',
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
        `SELECT * FROM orders 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
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
   * 更新订单状态
   */
  async updateOrderStatus(
    orderId: number, 
    status: Order['status'], 
    additionalData?: Partial<Order>
  ): Promise<Order> {
    try {
      const updateFields = ['status = $2', 'updated_at = NOW()'];
      const values = [orderId, status];
      let paramIndex = 3;

      // 添加额外字段
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          if (value !== undefined && key !== 'id' && key !== 'created_at') {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(value as any);
            paramIndex++;
          }
        });
      }

      const sql = `
        UPDATE orders 
        SET ${updateFields.join(', ')} 
        WHERE id = $1 
        RETURNING *
      `;

      const result = await query(sql, values);
      
      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = result.rows[0];
      console.log(`Order ${orderId} status updated to ${status}`);

      return order;
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  /**
   * 处理订单支付确认
   */
  async handlePaymentConfirmed(orderId: number, txHash: string, amount: number): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error(`Invalid order status: ${order.status}`);
      }

      // 验证支付金额
      if (amount < order.price_trx) {
        throw new Error('Insufficient payment amount');
      }

      // 更新订单状态为已支付
      await this.updateOrderStatus(orderId, 'paid', {
        payment_tx_hash: txHash,
        payment_amount: amount
      });

      // 开始处理能量委托
      await this.processEnergyDelegation(orderId);

    } catch (error) {
      console.error('Handle payment confirmed error:', error);
      // 标记订单为失败
      await this.updateOrderStatus(orderId, 'failed');
      throw error;
    }
  }

  /**
   * 处理能量委托
   */
  async processEnergyDelegation(orderId: number): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // 更新状态为处理中
      await this.updateOrderStatus(orderId, 'processing');

      // 执行能量委托
      const delegation = await energyDelegationService.executeDelegation({
        orderId: order.id,
        recipientAddress: order.recipient_address,
        energyAmount: order.energy_amount,
        durationHours: order.duration_hours
      });

      // 更新订单状态为活跃
      await this.updateOrderStatus(orderId, 'active', {
        delegation_tx_hash: delegation.txId
      });

      console.log(`Order ${orderId} delegation completed:`, delegation.txId);

    } catch (error) {
      console.error('Process energy delegation error:', error);
      // 标记订单为失败
      await this.updateOrderStatus(orderId, 'failed');
      throw error;
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // 只有pending状态的订单可以取消
      if (order.status !== 'pending') {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // 停止支付监控
      if (order.payment_address) {
        await paymentService.stopMonitoring(order.payment_address);
      }

      return await this.updateOrderStatus(orderId, 'cancelled');
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  /**
   * 处理订单过期
   */
  async handleOrderExpired(orderId: number): Promise<void> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) {
        return;
      }

      // 只处理pending状态的过期订单
      if (order.status === 'pending') {
        // 停止支付监控
        if (order.payment_address) {
          await paymentService.stopMonitoring(order.payment_address);
        }

        await this.updateOrderStatus(orderId, 'expired');
        console.log(`Order ${orderId} marked as expired`);
      }
    } catch (error) {
      console.error('Handle order expired error:', error);
    }
  }

  /**
   * 批量处理过期订单
   */
  async processExpiredOrders(): Promise<number> {
    try {
      // 查找过期的pending订单
      const result = await query(
        `SELECT id FROM orders 
         WHERE status = 'pending' 
         AND expires_at < NOW()`
      );

      const expiredOrders = result.rows;
      let processedCount = 0;

      for (const order of expiredOrders) {
        try {
          await this.handleOrderExpired(order.id);
          processedCount++;
        } catch (error) {
          console.error(`Failed to process expired order ${order.id}:`, error);
        }
      }

      console.log(`Processed ${processedCount} expired orders`);
      return processedCount;
    } catch (error) {
      console.error('Process expired orders error:', error);
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
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      );

      const stats = result.rows[0];
      
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
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    // TRON地址以T开头，长度为34位
    return /^T[A-Za-z1-9]{33}$/.test(address);
  }

  /**
   * 获取活跃订单列表
   */
  async getActiveOrders(limit: number = 100): Promise<Order[]> {
    try {
      const result = await query(
        `SELECT * FROM orders 
         WHERE status IN ('paid', 'processing', 'active') 
         ORDER BY created_at DESC 
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

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 获取总数
      const countResult = await query(
        `SELECT COUNT(*) as total FROM orders ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].total);

      // 获取订单列表
      const ordersResult = await query(
        `SELECT * FROM orders ${whereClause} 
         ORDER BY created_at DESC 
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
}

// 创建默认实例
export const orderService = new OrderService();
export default orderService;