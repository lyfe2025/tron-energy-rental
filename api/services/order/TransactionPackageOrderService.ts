import { DatabaseService } from '../../database/DatabaseService.ts';
import { PriceConfigService } from '../PriceConfigService.ts';
import { EnergyUsageMonitorService } from '../EnergyUsageMonitorService.ts';
import { DailyFeeService } from '../DailyFeeService.ts';
import type { CreateOrderRequest, Order } from './types';
import { logger } from '../../utils/logger.ts';

/**
 * 笔数套餐订单服务
 * 处理笔数套餐类型订单的创建、管理和生命周期
 */
export class TransactionPackageOrderService {
  private databaseService: DatabaseService;
  private priceConfigService: PriceConfigService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.priceConfigService = PriceConfigService.getInstance();
  }

  /**
   * 创建笔数套餐订单
   */
  async createTransactionPackageOrder(request: CreateTransactionPackageOrderRequest): Promise<Order> {
    try {
      // 验证价格配置
      const priceConfig = await this.priceConfigService.getConfigByMode(request.priceConfigId.toString());
      if (!priceConfig || priceConfig.mode_type !== 'transaction_package') {
        throw new Error('Invalid price config for transaction package');
      }

      // 验证TRON地址格式
      if (!this.isValidTronAddress(request.recipientAddress)) {
        throw new Error('Invalid TRON address format');
      }

      // 计算订单金额和能量
      const config = priceConfig.config as TransactionPackageConfig;
      const totalPrice = this.calculateTotalPrice(request.transactionCount, config);
      const singleTransactionEnergy = config.single_transaction_energy || 65000;
      const totalEnergy = request.transactionCount * singleTransactionEnergy;

      // 创建订单数据
      const orderData = {
        user_id: request.userId,
        price_config_id: request.priceConfigId,
        network_id: request.networkId || 'mainnet',
        order_type: 'transaction_package' as const,
        energy_amount: totalEnergy,
        duration_hours: 24, // 笔数套餐固定24小时
        price_trx: totalPrice,
        recipient_address: request.recipientAddress,
        status: 'pending' as const,
        payment_status: 'pending' as const,
        transaction_count: request.transactionCount,
        used_transactions: 0,
        remaining_transactions: request.transactionCount,
        last_energy_usage_time: null,
        next_delegation_time: null,
        daily_fee_last_check: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      // 插入订单到数据库
      const query = `
        INSERT INTO orders (
          user_id, price_config_id, network_id, order_type, energy_amount, 
          duration_hours, price_trx, recipient_address, status, payment_status,
          transaction_count, used_transactions, remaining_transactions,
          last_energy_usage_time, next_delegation_time, daily_fee_last_check,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;

      const values = [
        orderData.user_id,
        orderData.price_config_id,
        orderData.network_id,
        orderData.order_type,
        orderData.energy_amount,
        orderData.duration_hours,
        orderData.price_trx,
        orderData.recipient_address,
        orderData.status,
        orderData.payment_status,
        orderData.transaction_count,
        orderData.used_transactions,
        orderData.remaining_transactions,
        orderData.last_energy_usage_time,
        orderData.next_delegation_time,
        orderData.daily_fee_last_check,
        orderData.created_at,
        orderData.updated_at
      ];

      const result = await this.databaseService.query(query, values);
      const order = result.rows[0] as Order;

      // 记录订单创建事件
      logger.info('Transaction package order created', {
        event: 'order_created',
        orderId: order.id,
        userId: request.userId,
        orderType: 'transaction_package',
        transactionCount: request.transactionCount,
        totalPrice,
        status: 'pending'
      });

      console.log(`Transaction package order created: ${order.id} for user ${request.userId}`);
      return order;

    } catch (error) {
      console.error('Create transaction package order error:', error);
      throw error;
    }
  }

  /**
   * 激活笔数套餐订单（支付完成后）
   */
  async activateTransactionPackageOrder(orderId: string): Promise<void> {
    try {
      // 更新订单状态为active
      const updateQuery = `
        UPDATE orders 
        SET status = 'active', 
            payment_status = 'completed',
            next_delegation_time = NOW(),
            daily_fee_last_check = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND order_type = 'transaction_package'
        RETURNING *
      `;

      const result = await this.databaseService.query(updateQuery, [orderId]);
      if (result.rows.length === 0) {
        throw new Error('Transaction package order not found');
      }

      const order = result.rows[0] as Order;

      // 添加到能量监听服务
      const energyMonitor = EnergyUsageMonitorService.getInstance();
      await energyMonitor.addOrder(orderId);

      // 添加到占费服务
      const dailyFeeService = DailyFeeService.getInstance();
      await dailyFeeService.addOrder(orderId);

      // 记录订单激活事件
      logger.info('Transaction package order activated', {
        event: 'order_activated',
        orderId: order.id,
        userId: order.user_id,
        orderType: 'transaction_package',
        status: 'active',
        transactionCount: order.transaction_count,
        remainingTransactions: order.remaining_transactions
      });

      console.log(`Transaction package order activated: ${orderId}`);

    } catch (error) {
      console.error('Activate transaction package order error:', error);
      throw error;
    }
  }

  /**
   * 获取笔数套餐订单详情
   */
  async getTransactionPackageOrderDetails(orderId: string): Promise<TransactionPackageOrderDetails | null> {
    try {
      const query = `
        SELECT 
          o.*,
          pc.name as price_config_name,
          pc.config as price_config,
          (
            SELECT COUNT(*) 
            FROM energy_usage_logs eul 
            WHERE eul.order_id = o.id
          ) as total_energy_usage_count,
          (
            SELECT COALESCE(SUM(dfl.fee_amount), 0) 
            FROM daily_fee_logs dfl 
            WHERE dfl.order_id = o.id
          ) as total_daily_fees
        FROM orders o
        LEFT JOIN price_configs pc ON o.price_config_id = pc.id
        WHERE o.id = $1 AND o.order_type = 'transaction_package'
      `;

      const result = await this.databaseService.query(query, [orderId]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        energyUsageLogs: await this.getOrderEnergyUsageLogs(orderId, 10),
        dailyFeeLogs: await this.getOrderDailyFeeLogs(orderId, 10)
      } as TransactionPackageOrderDetails;

    } catch (error) {
      console.error('Get transaction package order details error:', error);
      throw error;
    }
  }

  /**
   * 获取订单能量使用记录
   */
  private async getOrderEnergyUsageLogs(orderId: string, limit: number = 20): Promise<EnergyUsageLog[]> {
    const query = `
      SELECT * FROM energy_usage_logs 
      WHERE order_id = $1 
      ORDER BY usage_time DESC 
      LIMIT $2
    `;

    const result = await this.databaseService.query(query, [orderId, limit]);
    return result.rows;
  }

  /**
   * 获取订单占费记录
   */
  private async getOrderDailyFeeLogs(orderId: string, limit: number = 20): Promise<DailyFeeLog[]> {
    const query = `
      SELECT * FROM daily_fee_logs 
      WHERE order_id = $1 
      ORDER BY fee_time DESC 
      LIMIT $2
    `;

    const result = await this.databaseService.query(query, [orderId, limit]);
    return result.rows;
  }

  /**
   * 计算订单总价格
   */
  private calculateTotalPrice(transactionCount: number, config: TransactionPackageConfig): number {
    const basePrice = config.base_price || 0;
    const pricePerTransaction = config.price_per_transaction || 0;
    const dailyFee = config.daily_fee || 0;
    
    return basePrice + (transactionCount * pricePerTransaction) + dailyFee;
  }

  /**
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    return /^T[A-Za-z1-9]{33}$/.test(address);
  }
}

// 类型定义
export interface CreateTransactionPackageOrderRequest extends Omit<CreateOrderRequest, 'energyAmount' | 'durationHours'> {
  transactionCount: number;
  networkId?: string;
}

export interface TransactionPackageConfig {
  base_price?: number;
  price_per_transaction?: number;
  daily_fee?: number;
  single_transaction_energy?: number;
  energy_check_interval?: number;
  daily_fee_check_time?: string;
}

export interface TransactionPackageOrderDetails extends Order {
  price_config_name: string;
  price_config: TransactionPackageConfig;
  total_energy_usage_count: number;
  total_daily_fees: number;
  energyUsageLogs: EnergyUsageLog[];
  dailyFeeLogs: DailyFeeLog[];
}

export interface EnergyUsageLog {
  id: string;
  order_id: string;
  user_address: string;
  energy_before: number;
  energy_after: number;
  energy_consumed: number;
  transaction_hash?: string;
  usage_time: Date;
  detection_time: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DailyFeeLog {
  id: string;
  order_id: string;
  fee_amount: number;
  fee_reason: string;
  last_usage_time?: Date;
  fee_time: Date;
  remaining_before: number;
  remaining_after: number;
  created_at: Date;
}

export default TransactionPackageOrderService;