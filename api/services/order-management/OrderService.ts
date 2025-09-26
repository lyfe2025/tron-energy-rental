/**
 * 订单服务主入口 - 重构版
 * 整合各个分离的订单服务模块，提供统一的订单管理接口
 * 保持原有的公共接口不变，确保向后兼容
 */
import { orderCreationService } from '../order/OrderCreationService.ts';
import { orderLifecycleService } from '../order/OrderLifecycleService.ts';
import { orderQueryService } from '../order/OrderQueryService.ts';
import type { CreateTransactionPackageOrderRequest, TransactionPackageOrderDetails } from '../order/TransactionPackageOrderService';
import { TransactionPackageOrderService } from '../order/TransactionPackageOrderService';
import type { CreateOrderRequest, Order, OrderStats } from '../order/types.ts';
import { FlashRentOrderService } from './FlashRentOrderService';
import type { FlashRentOrderParams } from './types';

// 重新导出类型，保持向后兼容
export type { CreateOrderRequest, Order, OrderStats };

class OrderService {
  private flashRentService: FlashRentOrderService;
  private transactionPackageService: TransactionPackageOrderService;

  constructor() {
    this.flashRentService = new FlashRentOrderService();
    this.transactionPackageService = new TransactionPackageOrderService();
  }

  // ==================== 原有订单创建相关方法 ====================
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

  // ==================== 原有订单查询相关方法 ====================
  async getOrderById(orderId: string): Promise<Order | null> {
    return orderQueryService.getOrderById(orderId);
  }

  async getUserOrders(userId: string, limit: number = 20, offset: number = 0): Promise<Order[]> {
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
      networkId?: string;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{ orders: Order[]; total: number }> {
    // 转换userId类型为string
    const normalizedQuery = {
      ...searchQuery,
      userId: searchQuery.userId ? searchQuery.userId.toString() : undefined
    };
    return orderQueryService.searchOrders(normalizedQuery, limit, offset);
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

  // ==================== 原有订单生命周期管理方法 ====================
  async handlePaymentConfirmed(orderId: string, txHash: string, amount: number): Promise<void> {
    return orderLifecycleService.handlePaymentConfirmed(parseInt(orderId), txHash, amount);
  }

  async processEnergyDelegation(orderId: string): Promise<void> {
    return orderLifecycleService.processEnergyDelegation(parseInt(orderId));
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    return orderLifecycleService.cancelOrder(orderId, reason);
  }

  async handleOrderExpired(orderId: string): Promise<void> {
    return orderLifecycleService.handleOrderExpired(parseInt(orderId));
  }

  async processExpiredOrders(): Promise<number> {
    return orderLifecycleService.processExpiredOrders();
  }

  // ==================== 原有向后兼容方法 ====================
  async updateOrderStatus(
    orderId: number, 
    status: Order['status'], 
    additionalData?: Partial<Order>
  ): Promise<Order> {
    // 这是一个内部方法，现在通过生命周期服务的私有方法实现
    throw new Error('updateOrderStatus is now internal to OrderLifecycleService. Use specific lifecycle methods instead.');
  }

  // ==================== 闪租订单相关方法 ====================
  /**
   * 创建能量闪租订单
   * @param fromAddress - 付款方地址
   * @param trxAmount - TRX金额
   * @param networkId - 网络ID
   * @param txId - 交易ID
   * @param existingOrderId - 可选的现有订单ID，用于更新而不是创建新订单
   */
  async createFlashRentOrder(
    fromAddress: string, 
    trxAmount: number, 
    networkId: string,
    txId: string,
    existingOrderId?: string
  ): Promise<Order> {
    const params: FlashRentOrderParams = {
      fromAddress,
      trxAmount,
      networkId,
      txId,
      existingOrderId
    };

    // 检查是否是更新现有订单
    if (existingOrderId) {
      return await this.flashRentService.updateExistingFlashRentOrder(params);
    } else {
      return await this.flashRentService.processExistingFlashRentOrder(params);
    }
  }

  // ==================== 笔数套餐订单相关方法 ====================
  /**
   * 创建笔数套餐订单
   */
  async createTransactionPackageOrder(request: CreateTransactionPackageOrderRequest): Promise<Order> {
    return this.transactionPackageService.createTransactionPackageOrder(request);
  }

  /**
   * 激活笔数套餐订单（支付完成后）
   */
  async activateTransactionPackageOrder(orderId: string): Promise<void> {
    return this.transactionPackageService.activateTransactionPackageOrder(orderId);
  }

  /**
   * 获取笔数套餐订单详情
   */
  async getTransactionPackageOrderDetails(orderId: string): Promise<TransactionPackageOrderDetails | null> {
    return this.transactionPackageService.getTransactionPackageOrderDetails(orderId);
  }
}

// 创建默认实例
export const orderService = new OrderService();
export default orderService;
