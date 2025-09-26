import { query } from '../../database/index';
import { logger } from '../../utils/logger';
import { BatchDelegationService } from '../batch-delegation/BatchDelegationService';
import { EnergyUsageMonitorService } from '../energy-usage-monitor/EnergyUsageMonitorService';
import { TransactionPackageOrderService } from '../order/TransactionPackageOrderService';
import type { Transaction } from '../transaction-monitor/types';

/**
 * 笔数套餐支付处理服务
 * 专门处理笔数套餐的支付确认和订单处理流程
 */
export class TransactionPackagePaymentService {
  private transactionPackageOrderService: TransactionPackageOrderService;
  private energyUsageMonitorService: EnergyUsageMonitorService;
  private batchDelegationService: BatchDelegationService;

  constructor() {
    this.transactionPackageOrderService = new TransactionPackageOrderService();
    this.energyUsageMonitorService = EnergyUsageMonitorService.getInstance();
    this.batchDelegationService = BatchDelegationService.getInstance();
  }

  /**
   * 处理笔数套餐支付
   */
  async handleTransactionPackagePayment(transaction: Transaction, networkId: string): Promise<void> {
    const txHash = transaction.txID;
    const shortTxId = txHash.substring(0, 8) + '...';
    
    try {
      const paymentCurrency = transaction.token || 'TRX';
      const amountDisplay = `${transaction.amount} ${paymentCurrency}`;
      
      logger.info(`💎 [笔数套餐] 🚀 检测到支付交易: ${shortTxId}`, {
        txId: shortTxId,
        amount: amountDisplay,
        from: transaction.from,
        to: transaction.to,
        paymentCurrency,
        networkId,
        description: '检测到笔数套餐支付交易，开始处理支付确认流程'
      });

      // 🔍 笔数套餐支付确认流程：
      // 1. 通过支付金额、网络、货币等条件匹配Telegram Bot已创建的未支付订单
      // 2. 更新订单状态为已支付并激活
      // 3. 执行首次能量代理
      // 4. 启动能量使用监听服务
      
      logger.info(`💎 [笔数套餐] 步骤1: 查找匹配的订单`, {
        txId: shortTxId,
        step: '1_find_existing_order',
        paymentCurrency,
        amount: transaction.amount,
        networkId,
        description: '查找Telegram Bot已创建的未支付订单（非创建新订单）'
      });
      
      // 首先尝试通过交易哈希查找（防重复处理）
      const existingOrderResult = await query(
        'SELECT * FROM orders WHERE tron_tx_hash = $1',
        [txHash]
      );

      if (existingOrderResult.rows.length > 0) {
        logger.warn(`⚠️ [笔数套餐] 步骤1: 交易已处理过，跳过: ${shortTxId}`, {
          txHash,
          orderNumber: existingOrderResult.rows[0].order_number,
          step: '1_duplicate_check',
          status: '已处理，跳过重复处理'
        });
        return;
      }

      logger.info(`💎 [笔数套餐] 步骤1: 开始业务条件匹配`, {
        txId: shortTxId,
        step: '1_business_matching',
        description: '通过订单类型、金额、网络、货币类型匹配未支付订单'
      });
      
      // 通过业务条件匹配未支付的笔数套餐订单
      // 匹配条件：订单类型、支付状态、网络、金额、支付货币、时间范围
      // 注意：transaction.to 是支付地址，target_address 是用户接收地址，两者不同
      
      // 首先尝试精确匹配（货币类型一致）
      let matchResult = await query(`
        SELECT o.*, pc.config 
        FROM orders o 
        LEFT JOIN price_configs pc ON o.price_config_id = pc.id
        WHERE o.order_type = 'transaction_package' 
          AND o.payment_status = 'unpaid'
          AND o.network_id = $1
          AND o.payment_currency = $2
          AND ABS(o.price - $3) < 0.001
          AND o.created_at > NOW() - INTERVAL '2 hours'
        ORDER BY o.created_at DESC 
        LIMIT 1
      `, [networkId, paymentCurrency, transaction.amount]);

      // 如果精确匹配失败，尝试跨货币匹配（金额相近即可）
      if (matchResult.rows.length === 0) {
        logger.info(`💎 [笔数套餐] 步骤1: 精确匹配失败，尝试跨货币匹配`, {
          txId: shortTxId,
          exactMatchCriteria: { paymentCurrency, amount: transaction.amount },
          step: '1_cross_currency_matching'
        });

        matchResult = await query(`
          SELECT o.*, pc.config 
          FROM orders o 
          LEFT JOIN price_configs pc ON o.price_config_id = pc.id
          WHERE o.order_type = 'transaction_package' 
            AND o.payment_status = 'unpaid'
            AND o.network_id = $1
            AND ABS(o.price - $2) < 0.001
            AND o.created_at > NOW() - INTERVAL '2 hours'
          ORDER BY o.created_at DESC 
          LIMIT 1
        `, [networkId, transaction.amount]);

        if (matchResult.rows.length > 0) {
          const order = matchResult.rows[0];
          logger.info(`✅ [笔数套餐] 步骤1: 跨货币匹配成功`, {
            txId: shortTxId,
            orderNumber: order.order_number,
            expectedCurrency: order.payment_currency,
            actualCurrency: paymentCurrency,
            amount: transaction.amount,
            step: '1_cross_currency_match_success'
          });
        }
      }

      if (matchResult.rows.length === 0) {
        logger.warn(`⚠️ [笔数套餐] 步骤1: 未找到匹配的待支付订单: ${shortTxId}`, {
          txHash,
          networkId,
          paymentAddress: transaction.to,
          amount: transaction.amount,
          paymentCurrency,
          timeRange: '2小时内',
          step: '1_no_matching_order',
          reason: '未找到Telegram Bot创建的对应未支付订单',
          possibleReasons: [
            '用户未通过Telegram Bot创建订单',
            '订单已过期或已支付',
            '支付金额与订单金额不匹配',
            '支付时间超过2小时窗口'
          ],
          matchingAttempts: [
            { type: 'exact_match', criteria: { paymentCurrency, amount: transaction.amount } },
            { type: 'cross_currency', criteria: { amount: transaction.amount } }
          ]
        });
        return;
      }

      // 获取匹配到的订单
      let order = matchResult.rows[0];
      
      // 验证订单类型（应该总是 transaction_package，因为查询条件已过滤）
      if (order.order_type !== 'transaction_package') {
        logger.error(`❌ [笔数套餐] 步骤1: 查询逻辑错误，订单类型不匹配: ${order.order_number}`, {
          currentType: order.order_type,
          expectedType: 'transaction_package',
          txId: shortTxId,
          step: '1_type_validation_error'
        });
        return;
      }

      const orderId = order.id;
      const userAddress = order.target_address;

      logger.info(`✅ [笔数套餐] 步骤1: 成功找到匹配订单: ${order.order_number}`, {
        orderId,
        orderNumber: order.order_number,
        userAddress,
        transactionCount: order.transaction_count,
        price: order.price,
        paymentCurrency: order.payment_currency,
        txId: shortTxId,
        step: '1_order_found',
        description: '成功匹配到Telegram Bot创建的未支付订单'
      });

      // 2. 确认支付并激活订单
      logger.info(`💎 [笔数套餐] 步骤2: 确认支付并激活订单`, {
        orderNumber: order.order_number,
        txId: shortTxId,
        step: '2_confirm_payment_and_activate',
        paymentCurrencyUpdate: order.payment_currency !== paymentCurrency ? {
          from: order.payment_currency,
          to: paymentCurrency
        } : null,
        description: '更新订单状态为已支付并激活'
      });
      
      await this.activateTransactionPackageOrder(orderId, txHash, paymentCurrency);

      // 3. 执行首次能量代理
      logger.info(`⚡ [笔数套餐] 开始首次能量代理`, {
        orderNumber: order.order_number,
        userAddress: `${userAddress.substring(0, 8)}...`,
        amount: `${transaction.amount} ${paymentCurrency}`,
        txId: shortTxId
      });
      
      await this.performFirstEnergyDelegation(orderId, userAddress);

      // 4. 启动能量使用监听
      logger.info(`💎 [笔数套餐] 步骤4: 开始启动监听服务`, {
        orderNumber: order.order_number,
        userAddress,
        txId: shortTxId,
        step: '4_start_monitoring'
      });
      await this.startEnergyUsageMonitoring(orderId, userAddress);

      logger.info(`🎉 [笔数套餐] 🎯 支付确认完成: ${order.order_number}`, {
        orderId,
        orderNumber: order.order_number,
        userAddress,
        txHash: shortTxId,
        transactionCount: order.transaction_count,
        paymentAmount: `${transaction.amount} ${paymentCurrency}`,
        status: '已激活并开始监听',
        completedSteps: [
          '1_找到匹配的Telegram订单',
          '2_确认支付并激活订单', 
          '3_首次能量代理完成',
          '4_监听服务启动完成'
        ],
        nextActions: [
          '自动监听用户能量使用',
          '检测到交易时自动代理能量',
          '处理每日手续费扣除'
        ],
        businessFlow: 'Telegram订单创建 → 用户支付 → 支付确认 → 能量代理 → 持续监听'
      });

    } catch (error: any) {
      logger.error(`❌ [笔数套餐] 支付处理失败: ${shortTxId}`, {
        error: error.message,
        errorStack: error.stack,
        errorName: error.name,
        txId: shortTxId,
        phase: '笔数套餐支付处理',
        timestamp: new Date().toISOString(),
        detailedError: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: (error as any).cause
        }
      });
      throw error;
    }
  }

  /**
   * 激活笔数套餐订单
   */
  private async activateTransactionPackageOrder(orderId: string, txHash: string, actualPaymentCurrency?: string): Promise<void> {
    try {
      logger.info(`📝 [笔数套餐] 激活订单`, {
        orderId,
        txHash: txHash.substring(0, 8) + '...',
        paymentCurrency: actualPaymentCurrency
      });
      
      // 如果实际支付货币与订单预期不同，则更新支付货币字段
      // 注意：笔数套餐支付后状态应为 'active'，这样才能通过DelegationValidator验证
      const updateFields = actualPaymentCurrency ? 
        `UPDATE orders SET 
           status = 'active',
           payment_status = 'paid',
           payment_currency = $3,
           tron_tx_hash = $1,
           next_delegation_time = NOW(),
           daily_fee_last_check = NOW(),
           updated_at = NOW()
         WHERE id = $2` :
        `UPDATE orders SET 
           status = 'active',
           payment_status = 'paid',
           tron_tx_hash = $1,
           next_delegation_time = NOW(),
           daily_fee_last_check = NOW(),
           updated_at = NOW()
         WHERE id = $2`;
      
      const params = actualPaymentCurrency ? [txHash, orderId, actualPaymentCurrency] : [txHash, orderId];
      await query(updateFields, params);

      logger.info(`✅ [笔数套餐] 订单激活成功`, {
        orderId,
        txHash: txHash.substring(0, 8) + '...',
        status: 'active → paid',
        paymentCurrency: actualPaymentCurrency || '保持原有'
      });
    } catch (error: any) {
      logger.error(`❌ [笔数套餐] 步骤2: 订单激活失败`, {
        orderId,
        txHash: txHash.substring(0, 8) + '...',
        error: error.message,
        step: '2_activation_failed'
      });
      throw error;
    }
  }

  /**
   * 执行首次能量代理
   */
  private async performFirstEnergyDelegation(orderId: string, userAddress: string): Promise<void> {
    try {
      logger.info(`⚡ [笔数套餐] 步骤3: 调用批量代理服务`, {
        orderId,
        userAddress,
        step: '3_call_delegation_service'
      });

      const result = await this.batchDelegationService.delegateSingleTransaction(
        orderId,
        userAddress
      );

      if (result.success) {
        logger.info(`✅ [笔数套餐] 步骤3: 首次能量代理成功`, {
          orderId,
          userAddress,
          remainingTransactions: result.remainingTransactions,
          delegationTxHash: result.delegationTxHash,
          energyAmount: result.energyDelegated || 0,
          step: '3_delegation_success'
        });
      } else {
        throw new Error(`首次能量代理失败: ${result.message}`);
      }
    } catch (error: any) {
      logger.error(`❌ [笔数套餐] 首次能量代理失败`, {
        orderId,
        userAddress: userAddress ? `${userAddress.substring(0, 8)}...` : '[无效地址]',
        error: error.message,
        errorStack: error.stack,
        step: '3_delegation_failed',
        timestamp: new Date().toISOString(),
        context: {
          orderType: 'transaction_package',
          delegationAttempt: 'initial'
        }
      });
      
      // 更新订单状态为失败
      await query(
        `UPDATE orders SET 
           status = 'failed',
           error_message = $1,
           updated_at = NOW()
         WHERE id = $2`,
        [`首次能量代理失败: ${error.message}`, orderId]
      );
      
      throw error;
    }
  }

  /**
   * 启动能量使用监听
   */
  private async startEnergyUsageMonitoring(orderId: string, userAddress: string): Promise<void> {
    try {
      logger.info(`👁️ [笔数套餐] 步骤4: 调用监听服务`, {
        orderId,
        userAddress,
        step: '4_call_monitoring_service'
      });
      
      const success = await this.energyUsageMonitorService.addOrder(orderId);
      
      if (success) {
        logger.info(`✅ [笔数套餐] 步骤4: 能量监听启动成功`, {
          orderId,
          userAddress,
          status: '开始监控用户能量使用情况',
          step: '4_monitoring_success',
          monitoringFeatures: [
            '实时监听用户交易',
            '检测能量消耗',
            '触发自动代理',
            '处理每日手续费'
          ]
        });
      } else {
        logger.warn(`⚠️ [笔数套餐] 步骤4: 能量监听启动失败`, {
          orderId,
          userAddress,
          step: '4_monitoring_failed',
          reason: '监听服务返回失败状态'
        });
      }
    } catch (error: any) {
      logger.error(`❌ [笔数套餐] 步骤4: 能量监听启动异常`, {
        orderId,
        userAddress,
        error: error.message,
        step: '4_monitoring_error'
      });
    }
  }

  /**
   * 获取笔数套餐订单详情
   */
  async getTransactionPackageOrderDetails(orderId: string): Promise<any> {
    return await this.transactionPackageOrderService.getTransactionPackageOrderDetails(orderId);
  }
}
