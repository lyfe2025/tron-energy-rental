/**
 * 订单创建服务
 * 负责订单的创建和初始化逻辑
 */
import { query } from '../../database/index';
import { energyPoolService } from '../energy-pool';
import type { CreateOrderRequest, Order } from './types.js';

export class OrderCreationService {
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
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    // TRON地址以T开头，长度为34位
    return /^T[A-Za-z1-9]{33}$/.test(address);
  }

  /**
   * 批量创建订单
   */
  async batchCreateOrders(requests: CreateOrderRequest[]): Promise<{
    successfulOrders: Order[];
    failedOrders: Array<{ request: CreateOrderRequest; error: string }>;
  }> {
    const successfulOrders: Order[] = [];
    const failedOrders: Array<{ request: CreateOrderRequest; error: string }> = [];

    for (const request of requests) {
      try {
        const order = await this.createOrder(request);
        successfulOrders.push(order);
      } catch (error) {
        failedOrders.push({
          request,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successfulOrders,
      failedOrders
    };
  }

  /**
   * 验证订单创建请求
   */
  validateCreateOrderRequest(request: CreateOrderRequest): string[] {
    const errors: string[] = [];

    if (!request.userId || request.userId <= 0) {
      errors.push('Invalid user ID');
    }

    if (!request.packageId || request.packageId <= 0) {
      errors.push('Invalid package ID');
    }

    if (!request.energyAmount || request.energyAmount <= 0) {
      errors.push('Energy amount must be greater than 0');
    }

    if (!request.durationHours || request.durationHours <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (!request.priceTrx || request.priceTrx <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!request.recipientAddress || !this.isValidTronAddress(request.recipientAddress)) {
      errors.push('Invalid TRON recipient address');
    }

    return errors;
  }

  /**
   * 预估订单创建的资源需求
   */
  async estimateResourceRequirement(energyAmount: number): Promise<{
    availableEnergy: number;
    requiredEnergy: number;
    canFulfill: boolean;
    recommendedPools: string[];
  }> {
    try {
      const activePools = await energyPoolService.getActivePoolAccounts();
      const totalAvailableEnergy = activePools.reduce((sum, pool) => sum + pool.available_energy, 0);
      
      // 按可用能量排序，推荐最优池
      const sortedPools = activePools
        .filter(pool => pool.available_energy >= energyAmount * 0.1) // 至少能提供10%的需求
        .sort((a, b) => b.available_energy - a.available_energy)
        .slice(0, 3); // 取前3个最优池

      return {
        availableEnergy: totalAvailableEnergy,
        requiredEnergy: energyAmount,
        canFulfill: totalAvailableEnergy >= energyAmount,
        recommendedPools: sortedPools.map(pool => pool.id)
      };
    } catch (error) {
      console.error('Estimate resource requirement error:', error);
      throw error;
    }
  }
}

export const orderCreationService = new OrderCreationService();
