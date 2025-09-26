/**
 * 订单创建服务
 * 负责订单的创建和初始化逻辑
 */
import { query } from '../../database/index';
import { energyPoolService } from '../energy-pool';
import type { CreateOrderRequest, Order } from './types.ts';

export class OrderCreationService {
  /**
   * 创建新订单
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    try {
      // 验证用户地址格式
      if (!this.isValidTronAddress(request.targetAddress)) {
        throw new Error('Invalid TRON address format');
      }

      // 检查能量池可用性 - 使用实时数据
      const activePools = await energyPoolService.getActivePoolAccounts();
      // 注意：不再从数据库获取能量数据，需要实时检查
      // 这里先简化处理，实际使用时需要调用实时能量检查API
      if (activePools.length === 0) {
        throw new Error('No active energy pools available');
      }
      
      // TODO: 实际部署时需要实现实时能量检查
      // const realTimeCheck = await this.checkRealTimeEnergyAvailability(request.energyAmount);
      // if (!realTimeCheck.sufficient) {
      //   throw new Error(`Insufficient energy available. Required: ${request.energyAmount}`);
      // }

      // 计算过期时间（24小时后）
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await query(
        `INSERT INTO orders (
          user_id, price_config_id, energy_amount, duration_hours, 
          price, target_address, status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          request.userId,
          request.priceConfigId,
          request.energyAmount,
          request.durationHours,
          request.price,
          request.targetAddress,
          'pending',
          expiresAt
        ]
      );

      const order = result.rows[0];
      console.log('Order created:', order.id);

      return order;
    } catch (error: any) {
      console.error('Create order error:', error);
      
      // 处理数据库唯一约束冲突错误
      if (error.code === '23505' && error.constraint === 'idx_orders_unique_flash_rent_tx') {
        const friendlyError = new Error('该交易哈希对应的闪租订单已存在，无法重复创建');
        friendlyError.name = 'DuplicateFlashRentOrderError';
        throw friendlyError;
      }
      
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

    if (!request.userId) {
      errors.push('Invalid user ID');
    }

    if (!request.priceConfigId || request.priceConfigId <= 0) {
      errors.push('Invalid package ID');
    }

    if (!request.energyAmount || request.energyAmount <= 0) {
      errors.push('Energy amount must be greater than 0');
    }

    if (!request.durationHours || request.durationHours <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (!request.price || request.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!request.targetAddress || !this.isValidTronAddress(request.targetAddress)) {
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
      
      // 注意：由于数据库中已移除能量字段，这里需要实现实时能量检查
      // 当前简化处理，返回基本信息
      const recommendedPools = activePools.slice(0, 3).map(pool => pool.id);

      // TODO: 实际部署时需要实现实时能量检查
      // let totalAvailableEnergy = 0;
      // for (const pool of activePools) {
      //   const realTimeEnergy = await this.getRealTimeEnergy(pool.tron_address);
      //   totalAvailableEnergy += realTimeEnergy.available;
      // }

      return {
        availableEnergy: 0, // 需要实时计算
        requiredEnergy: energyAmount,
        canFulfill: activePools.length > 0, // 简化判断
        recommendedPools
      };
    } catch (error) {
      console.error('Estimate resource requirement error:', error);
      throw error;
    }
  }
}

export const orderCreationService = new OrderCreationService();
