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
      if (amount < order.price) {
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
        recipientAddress: order.target_address,
        energyAmount: order.energy_amount,
        durationHours: order.duration_hours
      });

      // 更新订单状态为活跃
      await this.updateOrderStatus(orderId, 'active', {
        delegate_tx_hash: delegation.txId
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
   * 取消订单 - 支持订单号和订单ID
   */
  async cancelOrder(orderIdentifier: string | number, reason?: string): Promise<Order> {
    try {
      let order: Order | null = null;
      
      // 根据标识符类型判断查找方式
      if (typeof orderIdentifier === 'string') {
        // 字符串类型：可能是订单号(order_number)或UUID
        if (orderIdentifier.startsWith('TP') && orderIdentifier.length > 15) {
          // 订单号格式：TP + 时间戳 + 随机码
          console.log('🔍 通过订单号查找订单:', orderIdentifier);
          order = await this.getOrderByNumber(orderIdentifier);
        } else {
          // UUID格式
          console.log('🔍 通过UUID查找订单:', orderIdentifier);
          order = await this.getOrderByUUID(orderIdentifier);
        }
      } else {
        // 数字类型：旧版本兼容，通过数字ID查找
        console.log('🔍 通过数字ID查找订单:', orderIdentifier);
        order = await this.getOrderById(orderIdentifier);
      }
      
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

      // 使用订单的真实UUID更新状态
      return await this.updateOrderStatus(order.id, 'cancelled');
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  /**
   * 手动更新订单状态
   * 用于管理员手动操作，如标记订单为已手动补单
   */
  async updateOrderStatusManually(
    orderId: string, 
    status: Order['status'], 
    additionalData?: Partial<Order>
  ): Promise<Order> {
    try {
      // 对于手动更新，我们需要支持UUID格式的orderId
      const order = await this.getOrderByUUID(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      orderLogger.info(`管理员手动更新订单状态`, {
        orderId: orderId,
        statusChange: {
          from: order.status,
          to: status
        },
        additionalData: additionalData || {},
        timestamp: new Date().toISOString()
      });

      return await this.updateOrderStatusByUUID(orderId, status, additionalData);
    } catch (error) {
      console.error('Manual order status update error:', error);
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

  private async getOrderByUUID(orderId: string): Promise<Order | null> {
    try {
      const result = await query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Get order by UUID error:', error);
      return null;
    }
  }

  private async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    try {
      const result = await query(
        'SELECT * FROM orders WHERE order_number = $1',
        [orderNumber]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Get order by number error:', error);
      return null;
    }
  }

  private async updateOrderStatus(
    orderId: string | number, 
    status: Order['status'], 
    additionalData?: Partial<Order>
  ): Promise<Order> {
    try {
      // 获取当前订单状态用于日志对比
      let currentOrder: Order | null = null;
      if (typeof orderId === 'number') {
        currentOrder = await this.getOrderById(orderId);
      } else {
        currentOrder = await this.getOrderByUUID(orderId);
      }
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
            
            // 对于已完成或已手动补单的订单，将 tron_tx_hash 同时映射到 delegate_tx_hash
            if (key === 'tron_tx_hash' && (status === 'completed' || status === 'manually_completed')) {
              updateFields.push(`delegate_tx_hash = $${paramIndex}`);
              values.push(value as any);
              paramIndex++;
            }
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
    } catch (error: any) {
      orderLogger.error(`❌ 订单状态更新失败`, {
        orderId: orderId,
        targetStatus: status,
        error: {
          message: error.message,
          stack: error.stack
        },
        additionalData: additionalData || {}
      });

      // 处理数据库唯一约束冲突错误
      if (error.code === '23505' && error.constraint === 'idx_orders_unique_flash_rent_tx') {
        const friendlyError = new Error('该交易哈希对应的闪租订单已存在，无法重复创建');
        friendlyError.name = 'DuplicateFlashRentOrderError';
        throw friendlyError;
      }

      throw error;
    }
  }

  private async updateOrderStatusByUUID(
    orderId: string, 
    status: Order['status'], 
    additionalData?: Partial<Order>
  ): Promise<Order> {
    try {
      // 获取当前订单状态用于日志对比
      const currentOrder = await this.getOrderByUUID(orderId);
      const previousStatus = currentOrder?.status || 'unknown';

      orderLogger.info(`订单状态更新开始 (UUID)`, {
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
            
            // 对于已完成或已手动补单的订单，将 tron_tx_hash 同时映射到 delegate_tx_hash
            if (key === 'tron_tx_hash' && (status === 'completed' || status === 'manually_completed')) {
              updateFields.push(`delegate_tx_hash = $${paramIndex}`);
              values.push(value as any);
              paramIndex++;
            }
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
      const updatedOrder = result.rows[0];

      if (!updatedOrder) {
        throw new Error('Failed to update order status');
      }

      orderLogger.info(`订单状态更新成功 (UUID)`, {
        orderId: orderId,
        statusChange: {
          from: previousStatus,
          to: updatedOrder.status
        },
        additionalData: additionalData || {},
        timestamp: new Date().toISOString()
      });

      return updatedOrder;
    } catch (error: any) {
      orderLogger.error(`订单状态更新失败 (UUID)`, {
        orderId: orderId,
        targetStatus: status,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // 处理数据库唯一约束冲突错误
      if (error.code === '23505' && error.constraint === 'idx_orders_unique_flash_rent_tx') {
        const friendlyError = new Error('该交易哈希对应的闪租订单已存在，无法重复创建');
        friendlyError.name = 'DuplicateFlashRentOrderError';
        throw friendlyError;
      }

      throw error;
    }
  }
}

export const orderLifecycleService = new OrderLifecycleService();
