/**
 * 订单生命周期管理服务
 * 负责订单状态变更、过期处理等核心业务逻辑
 */
import { query } from '../../database/index';
import { orderLogger } from '../../utils/logger';
import { energyDelegationService } from '../energy-delegation';
import { paymentService } from '../payment';
import type { Order } from './types.ts';

export class OrderLifecycleService {
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

  private async getOrderById(orderId: number): Promise<Order | null> {
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

  private async updateOrderStatus(
    orderId: number, 
    status: Order['status'], 
    additionalData?: Partial<Order>
  ): Promise<Order> {
    try {
      // 获取当前订单状态用于日志对比
      const currentOrder = await this.getOrderById(orderId);
      const previousStatus = currentOrder?.status || 'unknown';

      orderLogger.info(`订单状态更新开始`, {
        orderId: orderId,
        statusChange: {
          from: previousStatus,
          to: status
        },
        additionalData: additionalData || {},
        timestamp: new Date().toISOString()
      });

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

      orderLogger.info(`执行订单状态更新SQL`, {
        orderId: orderId,
        sql: sql.replace(/\s+/g, ' ').trim(),
        parameters: values,
        updateFields: updateFields
      });

      const result = await query(sql, values);
      
      if (result.rows.length === 0) {
        orderLogger.error(`订单状态更新失败：订单未找到`, {
          orderId: orderId,
          targetStatus: status
        });
        throw new Error('Order not found');
      }

      const order = result.rows[0];
      
      orderLogger.info(`✅ 订单状态更新成功`, {
        orderId: orderId,
        orderNumber: order.order_number,
        statusChange: {
          from: previousStatus,
          to: order.status
        },
        additionalUpdates: additionalData || {},
        updatedAt: order.updated_at
      });

      return order;
    } catch (error) {
      orderLogger.error(`❌ 订单状态更新失败`, {
        orderId: orderId,
        targetStatus: status,
        error: {
          message: error.message,
          stack: error.stack
        },
        additionalData: additionalData || {}
      });
      throw error;
    }
  }
}

export const orderLifecycleService = new OrderLifecycleService();
