/**
 * 订单服务主入口
 * 整合各个分离的订单服务模块，提供统一的订单管理接口
 */
import { orderCreationService } from './order/OrderCreationService.js';
import { orderLifecycleService } from './order/OrderLifecycleService.js';
import { orderQueryService } from './order/OrderQueryService.js';
import type { CreateOrderRequest, Order, OrderStats } from './order/types.js';

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
}

// 创建默认实例
export const orderService = new OrderService();
export default orderService;