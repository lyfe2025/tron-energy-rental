import { DatabaseService } from '../../database/DatabaseService.ts';
import { logger } from '../../utils/logger.ts';
import { DailyFeeService } from '../DailyFeeService.ts';
import { EnergyUsageMonitorService } from '../EnergyUsageMonitorService.ts';
import { PriceConfigService } from '../PriceConfigService.ts';
import { UserService } from '../user/UserService.ts';
import type { CreateOrderRequest, Order } from './types';

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
   * 根据Telegram用户ID获取或创建用户
   * @param telegramUserId - Telegram用户ID
   * @param telegramUserData - Telegram用户数据（用于创建新用户）
   * @returns 用户UUID
   */
  private async getOrCreateUser(telegramUserId: number, telegramUserData?: {
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    is_premium?: boolean;
    bot_id?: string;
  }): Promise<string> {
    try {
      // 1. 尝试查找现有用户
      const existingUser = await UserService.getUserByTelegramId(telegramUserId);
      if (existingUser) {
        logger.info(`✅ 找到现有用户`, {
          userId: existingUser.id,
          telegramId: telegramUserId,
          username: existingUser.username
        });
        return existingUser.id;
      }

      // 2. 如果用户不存在，创建新用户
      if (!telegramUserData) {
        // 如果没有提供用户数据，使用默认值
        telegramUserData = {
          username: `user_${telegramUserId}`,
          first_name: '',
          last_name: '',
          language_code: 'zh',
          is_premium: false
        };
      }

      logger.info(`📝 创建新Telegram用户`, {
        telegramId: telegramUserId,
        userData: telegramUserData
      });

      const newUser = await UserService.registerTelegramUser({
        telegram_id: telegramUserId,
        ...telegramUserData
      });

      logger.info(`✅ 新用户创建成功`, {
        userId: newUser.id,
        telegramId: telegramUserId,
        username: newUser.username
      });

      return newUser.id;
    } catch (error: any) {
      logger.error(`❌ 获取或创建用户失败`, {
        telegramId: telegramUserId,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`用户处理失败: ${error.message}`);
    }
  }

  /**
   * 获取默认网络ID
   * @returns 默认网络的UUID
   */
  private async getDefaultNetworkId(): Promise<string> {
    try {
      const query = `
        SELECT id FROM tron_networks 
        WHERE is_default = true AND is_active = true 
        LIMIT 1
      `;
      
      const result = await this.databaseService.query(query, []);
      
      if (result.rows.length === 0) {
        // 如果没有默认网络，返回第一个激活的网络
        const fallbackQuery = `
          SELECT id FROM tron_networks 
          WHERE is_active = true 
          ORDER BY created_at ASC 
          LIMIT 1
        `;
        const fallbackResult = await this.databaseService.query(fallbackQuery, []);
        
        if (fallbackResult.rows.length === 0) {
          throw new Error('No active networks found');
        }
        
        logger.warn(`使用第一个激活网络作为默认网络`, {
          networkId: fallbackResult.rows[0].id
        });
        
        return fallbackResult.rows[0].id;
      }
      
      logger.info(`获取默认网络成功`, {
        networkId: result.rows[0].id
      });
      
      return result.rows[0].id;
    } catch (error: any) {
      logger.error(`获取默认网络失败`, {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`获取默认网络失败: ${error.message}`);
    }
  }

  /**
   * 创建笔数套餐订单
   */
  async createTransactionPackageOrder(request: CreateTransactionPackageOrderRequest): Promise<Order> {
    try {
      // 1. 获取或创建用户
      logger.info(`📝 [笔数套餐] 开始处理用户ID`, {
        telegramUserId: request.userId,
        step: 'user_processing'
      });

      const realUserId = await this.getOrCreateUser(parseInt(request.userId));
      
      logger.info(`✅ [笔数套餐] 用户ID处理完成`, {
        telegramUserId: request.userId,
        realUserId: realUserId,
        step: 'user_processed'
      });

      // 2. 验证价格配置
      const priceConfig = await this.priceConfigService.getConfigById(request.priceConfigId.toString());
      if (!priceConfig || priceConfig.mode_type !== 'transaction_package') {
        throw new Error(`Invalid price config for transaction package. Found: ${priceConfig?.mode_type || 'null'}`);
      }

      // 3. 验证TRON地址格式
      if (!this.isValidTronAddress(request.targetAddress)) {
        throw new Error('Invalid TRON address format');
      }

      // 4. 获取正确的网络ID
      let networkId = request.networkId;
      if (!networkId || typeof networkId === 'string') {
        // 如果没有提供网络ID，使用价格配置对应的网络ID（重要：支付地址和订单必须在同一网络）
        networkId = priceConfig.network_id;
        logger.info(`使用价格配置的网络ID（重要：保证支付地址和订单在同一网络）`, {
          originalNetworkId: request.networkId,
          priceConfigNetworkId: priceConfig.network_id,
          resolvedNetworkId: networkId
        });
      }

      // 5. 计算订单金额和能量
      const config = priceConfig.config as any; // 使用完整配置结构
      
      // 从packages数组中找到对应笔数的套餐价格
      const selectedPackage = config.packages?.find((pkg: any) => pkg.transaction_count === request.transactionCount);
      if (!selectedPackage) {
        throw new Error(`未找到 ${request.transactionCount} 笔的套餐配置`);
      }
      
      // 根据支付货币选择正确的价格
      const paymentCurrency = request.paymentCurrency || 'USDT';
      const totalPrice = paymentCurrency === 'TRX' ? selectedPackage.trx_price : selectedPackage.price;
      
      logger.info(`[笔数套餐] 价格计算`, {
        transactionCount: request.transactionCount,
        paymentCurrency,
        selectedPackage: {
          name: selectedPackage.name,
          usdtPrice: selectedPackage.price,
          trxPrice: selectedPackage.trx_price,
          unitPrice: selectedPackage.unit_price
        },
        finalPrice: totalPrice
      });
      
      // 使用动态能量计算（与能量闪兑保持一致的计算方式）
      const singleTransactionEnergy = await this.getDynamicEnergyPerUnit();
      const totalEnergy = request.transactionCount * singleTransactionEnergy;
      
      logger.info(`[笔数套餐] 动态能量计算`, {
        transactionCount: request.transactionCount,
        singleTransactionEnergy,
        totalEnergy,
        calculation: '标准转账能量消耗 * (1 + 安全缓冲百分比)'
      });

      // 6. 生成订单号
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const orderNumber = `TP${timestamp}${random}`; // TP = Transaction Package

      logger.info(`生成笔数套餐订单号`, {
        orderNumber,
        timestamp,
        random
      });

      // 7. 计算过期时间（从priceConfig根对象获取）
      const priceConfigFull = priceConfig.config as any; // 使用any类型以访问order_config
      const expireMinutes = priceConfigFull.order_config?.expire_minutes || 30; // 默认30分钟
      const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

      logger.info(`设置订单过期时间`, {
        expireMinutes: expireMinutes,
        expiresAt: expiresAt.toISOString()
      });

      // 8. 创建订单数据
      const orderData = {
        order_number: orderNumber, // 添加订单号
        user_id: realUserId, // 使用真实的用户UUID
        bot_id: request.botId || null, // 机器人ID
        price_config_id: request.priceConfigId,
        network_id: networkId, // 使用真实的网络UUID
        order_type: 'transaction_package' as const,
        energy_amount: totalEnergy,
        price: totalPrice,
        recipient_address: request.targetAddress,
        status: 'pending' as const,
        payment_status: 'unpaid' as const, // 修复：使用数据库约束允许的值
        payment_currency: (request.paymentCurrency || 'USDT') as 'USDT' | 'TRX', // 支付货币
        expires_at: expiresAt, // 添加过期时间
        calculated_units: request.transactionCount, // 计算单位数（用于价格匹配）
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
          order_number, user_id, bot_id, price_config_id, network_id, order_type, energy_amount, 
          price, target_address, status, payment_status, payment_currency, expires_at,
          calculated_units, transaction_count, used_transactions, remaining_transactions,
          last_energy_usage_time, next_delegation_time, daily_fee_last_check,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *
      `;

      const values = [
        orderData.order_number,
        orderData.user_id,
        orderData.bot_id,
        orderData.price_config_id,
        orderData.network_id,
        orderData.order_type,
        orderData.energy_amount,
        orderData.price,
        orderData.recipient_address,
        orderData.status,
        orderData.payment_status,
        orderData.payment_currency,
        orderData.expires_at,
        orderData.calculated_units, // 新增：计算单位数
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
   * 计算订单总价格 - 已废弃，现在直接从packages配置中获取价格
   * @deprecated 现在直接从config.packages数组中获取对应套餐的price字段
   */
  // private calculateTotalPrice 方法已移除，价格计算已改为从packages配置中直接获取

  /**
   * 更新订单支付货币类型
   */
  async updatePaymentCurrency(orderId: string, currency: 'USDT' | 'TRX'): Promise<{ success: boolean; message?: string }> {
    try {
      // 检查 orderId 是否是有效的 UUID 格式
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      
      // 首先获取订单信息
      const orderQuery = `
        SELECT calculated_units, bot_id 
        FROM orders 
        WHERE order_number = $1 ${isUuid ? 'OR id = $1::uuid' : ''}
      `;
      
      const orderResult = await this.databaseService.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        return {
          success: false,
          message: `订单 ${orderId} 不存在`
        };
      }
      
      const order = orderResult.rows[0];
      const transactionCount = order.calculated_units;
      
      // 获取价格配置
      const configQuery = `
        SELECT config 
        FROM price_configs 
        WHERE mode_type = 'transaction_package' AND is_active = true 
        ORDER BY id DESC LIMIT 1
      `;
      
      const configResult = await this.databaseService.query(configQuery);
      
      if (configResult.rows.length === 0) {
        return {
          success: false,
          message: '价格配置不存在'
        };
      }
      
      const config = configResult.rows[0].config;
      const packages = config.packages || [];
      
      // 根据笔数找到对应的套餐
      const selectedPackage = packages.find((pkg: any) => pkg.transaction_count === transactionCount);
      
      if (!selectedPackage) {
        return {
          success: false,
          message: `未找到 ${transactionCount} 笔对应的套餐配置`
        };
      }
      
      // 根据货币类型确定价格
      const newPrice = currency === 'TRX' ? selectedPackage.trx_price : selectedPackage.price;
      
      logger.info(`切换支付货币，价格更新:`, {
        orderId,
        currency,
        transactionCount,
        oldCurrency: currency === 'TRX' ? 'USDT' : 'TRX',
        newPrice,
        packageName: selectedPackage.name
      });
      
      const updateQuery = `
        UPDATE orders 
        SET payment_currency = $1, 
            price = $2,
            updated_at = NOW()
        WHERE order_number = $3 ${isUuid ? 'OR id = $3::uuid' : ''}
        RETURNING *
      `;

      const result = await this.databaseService.query(updateQuery, [currency, newPrice, orderId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: `订单 ${orderId} 不存在`
        };
      }

      logger.info(`订单 ${orderId} 支付方式已更新为 ${currency}`, {
        orderId,
        currency,
        updatedAt: new Date()
      });

      return {
        success: true,
        message: `支付方式已更新为 ${currency}`
      };

    } catch (error: any) {
      logger.error('更新订单支付方式失败', {
        orderId,
        currency,
        error: error.message
      });

      return {
        success: false,
        message: `更新失败: ${error.message}`
      };
    }
  }

  /**
   * 验证TRON地址格式
   */
  private isValidTronAddress(address: string): boolean {
    return /^T[A-Za-z1-9]{33}$/.test(address);
  }

  /**
   * 从系统配置动态获取单笔能量消耗
   * 计算公式：单笔能量消耗 = 标准转账能量消耗 * (1 + 安全缓冲百分比)
   */
  private async getDynamicEnergyPerUnit(): Promise<number> {
    try {
      const energyConfigResult = await this.databaseService.query(
        `SELECT config_key, config_value FROM system_configs 
         WHERE config_key IN (
           'resource_consumption.energy.usdt_standard_energy',
           'resource_consumption.energy.usdt_buffer_percentage'
         )`,
        []
      );

      if (energyConfigResult.rows.length >= 2) {
        const energyConfigs = energyConfigResult.rows.reduce((acc, row) => {
          acc[row.config_key] = parseFloat(row.config_value);
          return acc;
        }, {} as Record<string, number>);

        const standardEnergy = energyConfigs['resource_consumption.energy.usdt_standard_energy'] || 65000;
        const bufferPercentage = energyConfigs['resource_consumption.energy.usdt_buffer_percentage'] || 2;
        
        // 计算：单笔需要消耗的能量 = 标准转账能量消耗 * (1 + 安全缓冲百分比)
        const calculatedEnergy = Math.round(standardEnergy * (1 + bufferPercentage / 100));
        
        logger.info(`[笔数套餐] 从资源消耗配置动态计算单笔能量`, {
          standardEnergy,
          bufferPercentage: bufferPercentage + '%',
          calculationFormula: `${standardEnergy} * (1 + ${bufferPercentage}/100)`,
          calculatedEnergy,
          source: 'system_configs.resource_consumption'
        });
        
        return calculatedEnergy;
      }

      // 如果获取配置失败，使用系统默认值
      logger.warn('[笔数套餐] 未找到能量消耗配置，使用系统默认值');
      return Math.round(65000 * (1 + 2 / 100)); // 66300
    } catch (error: any) {
      logger.error('[笔数套餐] 获取能量消耗配置失败', {
        error: error.message,
        fallbackValue: 66300
      });
      // 错误情况下使用系统默认值
      return Math.round(65000 * (1 + 2 / 100)); // 66300
    }
  }
}

// 类型定义
export interface CreateTransactionPackageOrderRequest extends Omit<CreateOrderRequest, 'energyAmount' | 'durationHours'> {
  transactionCount: number;
  networkId?: string;
  paymentCurrency?: 'USDT' | 'TRX'; // 支付货币类型
  botId?: string; // 机器人ID
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