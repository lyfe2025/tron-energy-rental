/**
 * 订单服务主入口
 * 整合各个分离的订单服务模块，提供统一的订单管理接口
 */
import { query } from '../database/index.js';
import { orderCreationService } from './order/OrderCreationService.js';
import { orderLifecycleService } from './order/OrderLifecycleService.js';
import { orderQueryService } from './order/OrderQueryService.js';
import type { CreateOrderRequest, Order, OrderStats } from './order/types.js';
import { tronService } from './tron.js';

// 重新导出类型，保持向后兼容
export type { CreateOrderRequest, Order, OrderStats };

class OrderService {
  // 订单创建相关方法
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    return orderCreationService.createOrder(request);
  }

  async batchCreateOrders(requests: CreateOrderRequest[]) {
    return orderCreationService.batchCreateOrders(requests);
  }

  validateCreateOrderRequest(request: CreateOrderRequest): string[] {
    return orderCreationService.validateCreateOrderRequest(request);
  }

  async estimateResourceRequirement(energyAmount: number) {
    return orderCreationService.estimateResourceRequirement(energyAmount);
  }

  // 订单查询相关方法
  async getOrderById(orderId: number): Promise<Order | null> {
    return orderQueryService.getOrderById(orderId);
  }

  async getUserOrders(userId: number, limit: number = 20, offset: number = 0): Promise<Order[]> {
    return orderQueryService.getUserOrders(userId, limit, offset);
  }

  async getActiveOrders(limit: number = 100): Promise<Order[]> {
    return orderQueryService.getActiveOrders(limit);
  }

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
    return orderQueryService.searchOrders(searchQuery, limit, offset);
  }

  async getOrderStats(days: number = 30): Promise<OrderStats> {
    return orderQueryService.getOrderStats(days);
  }

  async getOrderTrend(days: number = 30) {
    return orderQueryService.getOrderTrend(days);
  }

  async getTopRecipientAddresses(limit: number = 10, days: number = 30) {
    return orderQueryService.getTopRecipientAddresses(limit, days);
  }

  // 订单生命周期管理方法
  async handlePaymentConfirmed(orderId: number, txHash: string, amount: number): Promise<void> {
    return orderLifecycleService.handlePaymentConfirmed(orderId, txHash, amount);
  }

  async processEnergyDelegation(orderId: number): Promise<void> {
    return orderLifecycleService.processEnergyDelegation(orderId);
  }

  async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    return orderLifecycleService.cancelOrder(orderId, reason);
  }

  async handleOrderExpired(orderId: number): Promise<void> {
    return orderLifecycleService.handleOrderExpired(orderId);
  }

  async processExpiredOrders(): Promise<number> {
    return orderLifecycleService.processExpiredOrders();
  }

  // 向后兼容方法 - 这些方法在新架构中被分离到生命周期服务中
  async updateOrderStatus(
    orderId: number, 
    status: Order['status'], 
    additionalData?: Partial<Order>
  ): Promise<Order> {
    // 这是一个内部方法，现在通过生命周期服务的私有方法实现
    throw new Error('updateOrderStatus is now internal to OrderLifecycleService. Use specific lifecycle methods instead.');
  }

  /**
   * 创建能量闪租订单
   * @param fromAddress - 付款方地址
   * @param trxAmount - TRX金额
   * @param networkId - 网络ID
   * @param txId - 交易ID
   */
  async createFlashRentOrder(
    fromAddress: string, 
    trxAmount: number, 
    networkId: string,
    txId: string
  ): Promise<Order> {
    // 使用静态导入的query和tronService
    
    try {
      // ✅ 步骤5: 获取闪租配置
      console.log(`[步骤5] 🔍 获取闪租配置: 交易 ${txId}`, {
        networkId: networkId,
        fromAddress: fromAddress,
        trxAmount: trxAmount
      });

      const config = await this.getFlashRentConfig(networkId);
      if (!config) {
        throw new Error(`Flash rent config not found for network: ${networkId}`);
      }

      console.log(`[步骤5] ✅ 获取配置成功:`, {
        单价: config.price_per_unit + ' TRX',
        每笔能量: config.energy_per_unit,
        最大笔数: config.max_units,
        收款地址: config.payment_address
      });

      // ✅ 步骤6: 计算笔数和总能量
      console.log(`[步骤6] 🧮 开始计算订单参数: 交易 ${txId}`);
      
      const calculatedUnits = this.calculateUnits(trxAmount, config);
      const totalEnergy = this.calculateTotalEnergy(calculatedUnits, config);

      console.log(`[步骤6] ✅ 计算完成:`, {
        支付金额: trxAmount + ' TRX',
        计算笔数: calculatedUnits,
        总能量: totalEnergy,
        实际价值: (calculatedUnits * config.price_per_unit) + ' TRX'
      });

      if (calculatedUnits === 0) {
        throw new Error(`Insufficient payment amount: ${trxAmount} TRX`);
      }

      // ✅ 步骤7: 生成订单号
      console.log(`[步骤7] 🔢 生成订单号: 交易 ${txId}`);
      const orderNumber = await this.generateOrderNumber();
      console.log(`[步骤7] ✅ 订单号生成成功: ${orderNumber}`);

      // ✅ 步骤8: 创建订单记录
      console.log(`[步骤8] 💾 创建订单记录到数据库: ${orderNumber}`, {
        订单号: orderNumber,
        网络ID: networkId,
        订单类型: 'FLASH_RENT',
        目标地址: fromAddress,
        能量数量: totalEnergy,
        支付金额: trxAmount + ' TRX',
        计算笔数: calculatedUnits,
        交易哈希: txId
      });

      const result = await query(
        `INSERT INTO orders (
          order_number, user_id, network_id, order_type, target_address,
          energy_amount, price, payment_trx_amount, calculated_units,
          payment_status, status, tron_tx_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING *`,
        [
          orderNumber,
          null, // 闪租订单可能没有关联用户
          networkId,
          'FLASH_RENT',
          fromAddress,
          totalEnergy,
          trxAmount * calculatedUnits, // 实际支付价格
          trxAmount,
          calculatedUnits,
          'paid', // 闪租订单创建时就是已支付状态
          'pending_delegation',
          txId,
          new Date(),
          new Date()
        ]
      );

      const order = result.rows[0];
      console.log(`[步骤8] ✅ 订单记录创建成功: ${orderNumber}`, {
        数据库ID: order.id,
        状态: order.status,
        支付状态: order.payment_status,
        能量数量: order.energy_amount,
        计算笔数: order.calculated_units
      });

      // ✅ 步骤9: 立即尝试代理能量
      console.log(`[步骤9] ⚡ 开始能量代理: ${orderNumber}`, {
        目标地址: fromAddress,
        代理能量: totalEnergy,
        代理时长: config.expiry_hours + '小时',
        网络ID: networkId
      });

      try {
        const delegationTxId = await tronService.delegateEnergyForFlashRent(
          fromAddress,
          totalEnergy,
          config.expiry_hours,
          networkId
        );

        console.log(`[步骤9] ✅ 能量代理成功: ${orderNumber}`, {
          代理交易ID: delegationTxId,
          代理状态: '成功'
        });

        // ✅ 步骤10: 更新订单状态为完成
        console.log(`[步骤10] 📝 更新订单状态: ${orderNumber}`, {
          新状态: 'completed',
          代理能量: totalEnergy,
          代理交易ID: delegationTxId
        });

        await query(
          `UPDATE orders SET 
            status = $1, 
            delegated_energy_amount = $2,
            delegation_tx_id = $3,
            completed_at = $4,
            updated_at = $5
           WHERE id = $6`,
          ['completed', totalEnergy, delegationTxId, new Date(), new Date(), order.id]
        );

        console.log(`[步骤10] ✅ 订单状态更新成功: ${orderNumber}`);

        console.log(`[总结] 🎉 闪租订单完成: ${orderNumber}`, {
          订单详情: {
            订单号: orderNumber,
            数据库ID: order.id,
            目标地址: fromAddress,
            支付金额: trxAmount + ' TRX',
            获得能量: totalEnergy,
            计算笔数: calculatedUnits,
            支付交易: txId,
            代理交易: delegationTxId,
            最终状态: 'completed',
            完成时间: new Date().toISOString()
          }
        });
        
        return { ...order, status: 'completed', delegated_energy_amount: totalEnergy, delegation_tx_id: delegationTxId };
      } catch (delegationError) {
        console.error(`[步骤9] ❌ 能量代理失败: ${orderNumber}`, {
          错误信息: delegationError.message,
          错误堆栈: delegationError.stack,
          订单ID: order.id
        });
        
        // 更新订单状态为失败
        console.log(`[步骤10] 📝 更新订单状态为失败: ${orderNumber}`);
        await query(
          `UPDATE orders SET 
            status = $1, 
            updated_at = $2 
           WHERE id = $3`,
          ['failed', new Date(), order.id]
        );

        console.log(`[总结] ❌ 闪租订单失败: ${orderNumber}`, {
          订单ID: order.id,
          失败原因: delegationError.message,
          当前状态: 'failed'
        });

        return { ...order, status: 'failed' };
      }
    } catch (error) {
      console.error(`[错误] ❌ 创建闪租订单失败: 交易 ${txId}`, {
        错误信息: error.message,
        错误堆栈: error.stack,
        订单参数: {
          fromAddress,
          trxAmount,
          networkId,
          txId
        }
      });
      throw error;
    }
  }

  /**
   * 获取闪租配置
   */
  private async getFlashRentConfig(networkId: string): Promise<any> {
    // 使用静态导入的query
    
    try {
      const result = await query(
        `SELECT config FROM price_configs 
         WHERE mode_type = 'energy_flash' 
           AND network_id = $1 
           AND is_active = true`,
        [networkId]
      );

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      return result.rows[0].config;
    } catch (error) {
      console.error('Failed to get flash rent config:', error);
      return null;
    }
  }

  /**
   * 计算可购买的笔数
   */
  private calculateUnits(amount: number, config: any): number {
    const pricePerUnit = config.single_price || 0;
    const maxUnits = config.max_amount || 999;
    
    if (pricePerUnit <= 0) {
      return 0;
    }

    const calculatedUnits = Math.floor(amount / pricePerUnit);
    return Math.min(calculatedUnits, maxUnits);
  }

  /**
   * 计算总能量需求
   */
  private calculateTotalEnergy(units: number, config: any): number {
    // 从配置中获取单笔能量值，如果没有配置则使用默认值
    const energyPerUnit = config.energy_per_unit || 32000; // 默认32,000能量每笔
    return units * energyPerUnit;
  }

  /**
   * 生成订单号
   */
  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FL${timestamp}${random}`;
  }
}

// 创建默认实例
export const orderService = new OrderService();
export default orderService;