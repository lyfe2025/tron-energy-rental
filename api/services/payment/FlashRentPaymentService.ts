import { query } from '../../database/index';
import { orderLogger } from '../../utils/logger';
import { getNetworkName, getOrderService } from './utils';

export class FlashRentPaymentService {

  /**
   * 处理能量闪租支付
   * @param transaction - 交易详情
   * @param networkId - 网络ID
   */
  async handleFlashRentPayment(transaction: any, networkId: string): Promise<void> {
    // 获取网络名称用于日志显示
    const networkName = await getNetworkName(networkId);
    
    try {
      // 5. 检查是否已经存在相同txId的订单
      orderLogger.info(`   5. 检查订单重复性`, {
        txId: transaction.txID,
        networkName,
        step: 5
      });

      const existingOrder = await this.checkExistingOrder(transaction.txID);
      if (existingOrder) {
        // 检查现有订单状态，决定是否需要继续处理
        const canContinueProcessing = ['pending', 'pending_delegation', 'processing'].includes(existingOrder.status);
        
        if (canContinueProcessing) {
          orderLogger.info(`   📝 发现现有订单，继续处理并更新状态`, {
            txId: transaction.txID,
            networkName,
            existingOrderId: existingOrder.id,
            existingOrderNumber: existingOrder.order_number,
            existingStatus: existingOrder.status,
            step: 5,
            action: 'continue_processing_existing_order'
          });
          
          // 设置标记表示这是更新现有订单
          transaction._existingOrderId = existingOrder.id;
          transaction._existingOrderNumber = existingOrder.order_number;
        } else {
          orderLogger.warn(`   ⚠️ 订单已处理完成，跳过处理`, {
            txId: transaction.txID,
            networkName,
            existingOrderId: existingOrder.id,
            existingOrderNumber: existingOrder.order_number,
            existingStatus: existingOrder.status,
            step: 5,
            status: 'order_already_completed',
            reason: `订单状态为 ${existingOrder.status}，无需重复处理`
          });
          return;
        }
      }

      // 检查是否是初始创建订单
      if (transaction._isInitialCreation) {
        orderLogger.info(`   📝 处理初始订单创建请求`, {
          txId: transaction.txID,
          networkName,
          orderNumber: transaction._orderNumber,
          step: 'initial_creation'
        });
        
        await this.createInitialFlashRentOrder(transaction, networkId);
        return;
      }

      // 检查是否是订单状态更新
      if (transaction._isOrderUpdate) {
        orderLogger.info(`   📝 处理订单状态更新请求`, {
          orderNumber: transaction._orderNumber,
          updateType: transaction._updateType,
          reason: transaction._failureReason,
          step: 'order_update'
        });
        
        await this.updateFlashRentOrderStatus(transaction, networkId);
        return;
      }

      // 6. 验证交易有效性
      orderLogger.info(`   6. 验证交易有效性`, {
        txId: transaction.txID,
        networkName,
        step: 6
      });

      if (!this.validateFlashRentTransaction(transaction)) {
        orderLogger.warn(`   ❌ 交易验证失败`, {
          txId: transaction.txID,
          networkName,
          step: 6,
          status: 'validation_failed'
        });
        
        // 交易验证失败，创建失败记录
        await this.createFailedFlashRentOrder(transaction, networkId, new Error('Transaction validation failed'));
        return;
      }

      orderLogger.info(`   ✅ 交易验证通过`, {
        txId: transaction.txID,
        networkName,
        step: 6,
        status: 'validation_passed'
      });

      const { from: fromAddress, amount: trxAmount } = transaction;
      
      // 7. 创建闪租订单
      orderLogger.info(`   7. 创建闪租订单`, {
        txId: transaction.txID,
        networkName,
        fromAddress,
        amount: `${trxAmount} TRX`,
        step: 7
      });

      // 调用OrderService创建或更新闪租订单
      const orderService = await getOrderService();
      const existingOrderId = transaction._existingOrderId || null;
      const order = await orderService.createFlashRentOrder(fromAddress, trxAmount, networkId, transaction.txID, existingOrderId);
      
      const actionText = existingOrderId ? '更新' : '创建';
      orderLogger.info(`   ✅ 闪租订单${actionText}成功: ${order.order_number}`, {
        txId: transaction.txID,
        orderId: order.id,
        orderNumber: order.order_number,
        energyAmount: order.energy_amount,
        networkName,
        step: 7,
        status: existingOrderId ? 'order_updated' : 'order_created',
        isUpdate: !!existingOrderId
      });
      
    } catch (error) {
      orderLogger.error(`❌ 闪租支付处理失败`, {
        txId: transaction.txID,
        networkName,
        error: error.message,
        stack: error.stack,
        fromAddress: transaction.from,
        amount: `${transaction.amount} TRX`,
        status: 'processing_failed'
      });
      
      // 检查是否已经有订单记录了，如果有就不再创建失败记录
      const existingOrder = await this.checkExistingOrder(transaction.txID);
      if (existingOrder) {
        orderLogger.warn(`   ⚠️ 订单已存在，不创建失败记录`, {
          txId: transaction.txID,
          existingOrderId: existingOrder.id,
          existingOrderNumber: existingOrder.order_number,
          existingStatus: existingOrder.status
        });
        return;
      }
      
      // 如果没有现有订单，才创建失败记录
      await this.createFailedFlashRentOrder(transaction, networkId, error);
    }
  }

  /**
   * 检查是否已存在相同交易哈希的订单
   */
  private async checkExistingOrder(txId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT id, order_number, status FROM orders 
         WHERE tron_tx_hash = $1 
         ORDER BY created_at ASC 
         LIMIT 1`,
        [txId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      orderLogger.error(`检查现有订单失败`, {
        txId: txId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 验证闪租交易的有效性
   */
  private validateFlashRentTransaction(transaction: any): boolean {
    try {
      // 检查基本字段
      if (!transaction.txID || !transaction.from || !transaction.to || !transaction.amount) {
        return false;
      }

      // 检查金额是否为正数
      if (transaction.amount <= 0) {
        return false;
      }

      // 检查交易是否已确认
      if (!transaction.confirmed) {
        return false;
      }

      // 检查交易时间是否过新（避免处理过旧的交易）
      const maxAge = 3600000; // 1小时
      const transactionAge = Date.now() - transaction.timestamp;
      if (transactionAge > maxAge) {
        console.log(`Transaction too old: ${transaction.txID}, age: ${transactionAge}ms`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Transaction validation error:', error);
      return false;
    }
  }

  /**
   * 创建失败的闪租订单记录
   * 确保失败的交易不会被重复处理
   */
  private async createFailedFlashRentOrder(
    transaction: any, 
    networkId: string, 
    error: any
  ): Promise<void> {
    try {
      const { from: fromAddress, amount: trxAmount, txID } = transaction;
      
      // 生成订单号
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const orderNumber = `FL${timestamp}${random}`;
      
      // 系统用户ID（已创建）
      const tempUserId = '00000000-0000-0000-0000-000000000000';
      
      orderLogger.info(`   创建失败订单记录`, {
        txId: txID,
        orderNumber: orderNumber,
        reason: error.message,
        step: 'create_failed_order'
      });

      await query(
        `INSERT INTO orders (
          order_number, user_id, network_id, order_type, target_address,
          energy_amount, price, payment_trx_amount, calculated_units,
          payment_status, status, tron_tx_hash, 
          source_address, error_message, processing_started_at,
          processing_details, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          orderNumber,
          tempUserId,
          networkId,
          'energy_flash',
          fromAddress,
          0, // 失败订单没有能量
          0, // 失败订单价格为0
          trxAmount,
          0, // 失败订单没有计算单位
          'paid', // 用户已支付
          'failed', // 订单状态为失败
          txID,
          fromAddress, // source_address: 支付来源地址
          `Processing failed: ${error.message}`, // error_message: 详细错误信息
          new Date(), // processing_started_at: 处理开始时间
          JSON.stringify({ // processing_details: 处理详情
            step: 'order_creation_failed',
            error_info: {
              message: error.message,
              stack: error.stack,
              failed_at: new Date().toISOString(),
              error_type: error.constructor.name
            },
            transaction_info: {
              payment_amount: trxAmount,
              payment_address: fromAddress,
              transaction_hash: txID,
              network_id: networkId
            },
            failure_reason: 'Flash rent order creation or processing failed'
          }),
          new Date(),
          new Date()
        ]
      );
      
      orderLogger.info(`   ✅ 失败订单记录创建成功`, {
        txId: txID,
        orderNumber: orderNumber,
        status: 'failed_order_created'
      });
      
    } catch (createError) {
      orderLogger.error(`❌ 创建失败订单记录失败`, {
        txId: transaction.txID,
        error: createError.message,
        originalError: error.message
      });
    }
  }

  /**
   * 创建初始闪租订单记录
   * 在交易处理开始时创建基础订单记录
   */
  private async createInitialFlashRentOrder(transaction: any, networkId: string): Promise<void> {
    try {
      const { txID, from: fromAddress, amount: trxAmount, _orderNumber: orderNumber } = transaction;
      
      // 系统用户ID（已创建）
      const tempUserId = '00000000-0000-0000-0000-000000000000';
      
      orderLogger.info(`   创建初始订单记录`, {
        txId: txID,
        orderNumber: orderNumber,
        fromAddress: fromAddress,
        amount: `${trxAmount} TRX`,
        step: 'create_initial_record'
      });

      await query(
        `INSERT INTO orders (
          order_number, user_id, network_id, order_type, target_address,
          energy_amount, price, payment_trx_amount, calculated_units,
          payment_status, status, tron_tx_hash, 
          source_address, error_message, processing_started_at,
          processing_details, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          orderNumber,
          tempUserId,
          networkId,
          'energy_flash',
          fromAddress,
          0, // 初始创建时能量为0，后续处理时更新
          0, // 初始创建时价格为0，后续处理时更新
          trxAmount,
          0, // 初始创建时计算单位为0，后续处理时更新
          'pending', // 支付状态：待确认
          'pending', // 订单状态：待处理
          txID,
          fromAddress, // source_address: 支付来源地址
          null, // 初始创建时无错误信息
          new Date(), // processing_started_at: 处理开始时间
          JSON.stringify({ // processing_details: 处理详情
            step: 'initial_creation',
            created_at: new Date().toISOString(),
            transaction_info: {
              payment_amount: trxAmount,
              payment_address: fromAddress,
              transaction_hash: txID,
              network_id: networkId
            },
            status: 'Order created, awaiting processing'
          }),
          new Date(),
          new Date()
        ]
      );
      
      orderLogger.info(`   ✅ 初始订单记录创建成功`, {
        txId: txID,
        orderNumber: orderNumber,
        status: 'initial_order_created'
      });
      
    } catch (createError) {
      orderLogger.error(`❌ 创建初始订单记录失败`, {
        txId: transaction.txID,
        orderNumber: transaction._orderNumber,
        error: createError.message
      });
      throw createError;
    }
  }

  /**
   * 更新闪租订单状态
   * 用于将订单状态更新为失败或其他状态
   */
  private async updateFlashRentOrderStatus(transaction: any, networkId: string): Promise<void> {
    try {
      const { _orderNumber: orderNumber, _failureReason: failureReason, _updateType: updateType } = transaction;
      
      orderLogger.info(`   更新订单状态`, {
        orderNumber: orderNumber,
        updateType: updateType,
        reason: failureReason,
        step: 'update_order_status'
      });

      if (updateType === 'failed') {
        await query(
          `UPDATE orders SET 
            status = $1,
            error_message = $2,
            processing_details = $3,
            updated_at = $4
           WHERE order_number = $5`,
          [
            'failed',
            failureReason,
            JSON.stringify({
              step: 'order_failed',
              failure_info: {
                reason: failureReason,
                failed_at: new Date().toISOString(),
                update_type: updateType
              },
              status: 'Order processing failed'
            }),
            new Date(),
            orderNumber
          ]
        );
      }
      
      orderLogger.info(`   ✅ 订单状态更新成功`, {
        orderNumber: orderNumber,
        status: updateType,
        reason: failureReason
      });
      
    } catch (updateError) {
      orderLogger.error(`❌ 更新订单状态失败`, {
        orderNumber: transaction._orderNumber,
        error: updateError.message,
        updateType: transaction._updateType
      });
    }
  }
}
