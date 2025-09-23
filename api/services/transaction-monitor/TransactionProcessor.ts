/**
 * 交易处理器
 * 负责单个交易的完整处理流程
 */
import { Logger } from 'winston';
import { orderLogger } from '../../utils/logger';
import { FlashRentOrderService } from '../order-management/FlashRentOrderService';
import { PaymentService } from '../payment';
import { TransactionCache } from './TransactionCache';
import { TransactionParser } from './TransactionParser';
import type { MonitoredAddress } from './types';

export class TransactionProcessor {
  private flashRentService: FlashRentOrderService;

  constructor(
    private logger: Logger,
    private transactionCache: TransactionCache,
    private transactionParser: TransactionParser,
    private paymentService: PaymentService
  ) {
    this.flashRentService = new FlashRentOrderService();
  }

  /**
   * 处理单个交易
   */
  async processSingleTransaction(
    rawTx: any,
    networkId: string,
    networkName: string,
    tronWebInstance: any
  ): Promise<void> {
    const txId = rawTx.txID;

    // 检查是否已处理过
    if (await this.transactionCache.isTransactionProcessed(txId)) {
      return;
    }

    // 首先创建订单记录
    let orderNumber: string | null = null;
    try {
      orderNumber = await this.createInitialOrderRecord(rawTx, networkId, networkName);
      orderLogger.info(`   ✅ 初始订单记录已创建: ${orderNumber}`, {
        txId: txId,
        networkName,
        orderNumber,
        step: 2.5
      });
    } catch (createOrderError) {
      orderLogger.error(`   ❌ 创建初始订单记录失败`, {
        txId: txId,
        networkName,
        error: createOrderError.message
      });
      return;
    }

    try {
      // 验证交易确认状态
      const txInfo = await this.transactionParser.validateAndGetTransactionInfo(
        txId,
        networkName,
        tronWebInstance
      );

      if (!txInfo) {
        // 交易验证失败，更新订单为失败
        await this.updateOrderToFailed(orderNumber!, networkId, 'Transaction validation failed - txInfo not found');
        return;
      }

      // 解析交易详情
      orderLogger.info(`   3. 解析交易详情`, {
        txId: txId,
        networkName,
        step: 3
      });

      const transaction = await this.transactionParser.parseTransaction(rawTx, txInfo, tronWebInstance);

      if (!transaction) {
        orderLogger.warn(`   ❌ 交易解析失败，更新订单状态`, {
          txId: txId,
          networkName,
          step: 3,
          reason: '解析结果为null'
        });
        // 交易解析失败，更新订单为失败
        await this.updateOrderToFailed(orderNumber!, networkId, 'Transaction parsing failed - invalid transaction format');
        return;
      }

      orderLogger.info(`   ✅ 交易解析成功`, {
        txId: transaction.txID,
        networkName,
        step: 3,
        from: transaction.from,
        to: transaction.to,
        amount: `${transaction.amount} TRX`,
        confirmed: transaction.confirmed
      });

      // 4. 检测到新的TRX转账
      orderLogger.info(`   4. 检测到TRX转账: ${transaction.amount} TRX`, {
        txId: transaction.txID,
        amount: `${transaction.amount} TRX`,
        from: transaction.from,
        to: transaction.to,
        networkName,
        step: 4
      });

      // 5. 转交给PaymentService处理
      orderLogger.info(`   5. 转交给PaymentService处理`, {
        txId: transaction.txID,
        networkName,
        step: 5
      });

      await this.paymentService.handleFlashRentPayment(transaction, networkId);

      // 6. 标记交易为已处理
      orderLogger.info(`   6. 标记交易为已处理`, {
        txId: transaction.txID,
        networkName,
        step: 6
      });
      await this.transactionCache.markTransactionProcessed(txId);

      orderLogger.info(`   ✅ 交易处理完成`, {
        txId: transaction.txID,
        networkName,
        status: 'completed',
        step: 6
      });

    } catch (error) {
      this.logger.error(`❌ [${networkName}] 处理交易 ${txId} 时发生错误:`, error);
      
      // 如果有订单号，更新订单为失败状态
      if (orderNumber) {
        await this.updateOrderToFailed(orderNumber, networkId, `Processing error: ${error.message}`);
      }
      
      // 即使处理失败，也要标记交易为已处理（避免无限重试）
      orderLogger.info(`   6. 标记交易为已处理（处理失败）`, {
        txId: txId,
        networkName,
        step: 6,
        status: 'failed_but_marked'
      });
      await this.transactionCache.markTransactionProcessed(txId);
    }
  }

  /**
   * 批量处理地址的交易
   */
  async processAddressTransactions(monitoredAddress: MonitoredAddress): Promise<void> {
    const { address, networkId, networkName, tronWebInstance, tronGridProvider } = monitoredAddress;
    
    try {
      // 🕐 计算查询时间范围：当前时间向前90秒
      const now = Date.now();
      const queryStartTime = now - 90 * 1000; // 90秒查询时间窗口

      // 📥 查询最近90秒内的交易记录（增加查询数量以确保覆盖时间窗口）
      const transactionsResult = await tronGridProvider.getAccountTransactions(address, 200, 'block_timestamp,desc');

      if (!transactionsResult.success || !transactionsResult.data) {
        return;
      }

      // 确保数据是数组格式
      let transactions = transactionsResult.data;
      if (!Array.isArray(transactions)) {
        if (transactions && typeof transactions === 'object') {
          transactions = Object.values(transactions);
        } else {
          transactions = [];
        }
      }

      // 🎯 过滤：只处理最近90秒内的交易
      const recentTransactions = transactions
        .filter((tx: any) => tx && tx.raw_data && tx.raw_data.contract)
        .filter((tx: any) => {
          const txTimestamp = tx.raw_data.timestamp || 0;
          return txTimestamp >= queryStartTime;
        })
        .sort((a: any, b: any) => (b.raw_data?.timestamp || 0) - (a.raw_data?.timestamp || 0));

      // 📊 只显示关键信息：待处理交易数量
      if (recentTransactions.length > 0) {
        this.logger.info(`🔍 [${networkName}] 发现 ${recentTransactions.length} 条待处理交易记录`);

        // =============== 开始处理 ===============
        orderLogger.info(`=============== 开始处理 [${networkName}] ===============`, {
          networkName,
          transactionCount: recentTransactions.length
        });

        let processedCount = 0;
        for (const tx of recentTransactions) {
          try {
            processedCount++;
            orderLogger.info(`${processedCount}. 处理交易: ${tx.txID}`, {
              txId: tx.txID,
              networkName,
              step: 1
            });
            await this.processSingleTransaction(tx, networkId, networkName, tronWebInstance);
          } catch (error) {
            orderLogger.error(`❌ 处理交易失败 ${tx.txID}`, {
              txId: tx.txID,
              networkName,
              error: error.message
            });
          }
        }

        // =============== 处理结束 ===============
        orderLogger.info(`=============== 处理结束 [${networkName}] ===============`, {
          networkName,
          processedCount
        });
      }
    } catch (error) {
      this.logger.error(`❌ [${networkName}] 轮询地址 ${address} 交易失败:`, error);
    }
  }

  /**
   * 创建初始订单记录
   * 在交易处理开始时就创建订单记录，便于后续更新状态
   */
  private async createInitialOrderRecord(
    rawTx: any,
    networkId: string,
    networkName: string
  ): Promise<string> {
    const txId = rawTx.txID;
    
    orderLogger.info(`   📝 创建初始订单记录`, {
      txId: txId,
      networkName,
      step: 'create_initial_order'
    });

    // 尝试从原始交易中提取基本信息
    let fromAddress = 'unknown';
    let toAddress = 'unknown';
    let amount = 0;

    try {
      if (rawTx?.raw_data?.contract?.[0]?.parameter?.value) {
        const parameter = rawTx.raw_data.contract[0].parameter.value;
        fromAddress = parameter.owner_address || 'unknown';
        toAddress = parameter.to_address || 'unknown';
        amount = (parameter.amount || 0) / 1000000; // 转换为TRX
      }
    } catch (extractError) {
      orderLogger.warn(`   提取交易信息失败，使用默认值`, {
        txId: txId,
        error: extractError.message
      });
    }

    // 生成订单号
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `FL${timestamp}${random}`;

    // 调用PaymentService，传递标记表示这是初始创建
    const initialTransaction = {
      txID: txId,
      from: fromAddress,
      to: toAddress,
      amount: amount,
      timestamp: rawTx.raw_data?.timestamp || Date.now(),
      confirmed: false,
      _isInitialCreation: true,
      _orderNumber: orderNumber,
      _networkName: networkName
    };

    await this.paymentService.handleFlashRentPayment(initialTransaction, networkId);

    orderLogger.info(`   ✅ 初始订单记录创建完成`, {
      txId: txId,
      networkName,
      orderNumber,
      fromAddress,
      toAddress,
      amount: `${amount} TRX`
    });

    // 立即进行真正的订单计算和处理
    try {
      orderLogger.info(`   🧮 开始进行订单计算和能量委托`, {
        txId: txId,
        networkName,
        orderNumber,
        step: 'flash_rent_processing'
      });

      const flashRentParams = {
        fromAddress: fromAddress,
        trxAmount: amount,
        networkId: networkId,
        txId: txId
      };

      const processedOrder = await this.flashRentService.createNewFlashRentOrder(flashRentParams);

      orderLogger.info(`   🎉 订单计算和处理完成`, {
        txId: txId,
        networkName,
        orderNumber,
        orderId: processedOrder.id,
        status: processedOrder.status,
        energyAmount: processedOrder.energy_amount,
        calculatedUnits: processedOrder.calculated_units
      });

    } catch (flashRentError) {
      orderLogger.error(`   ❌ 订单计算和处理失败`, {
        txId: txId,
        networkName,
        orderNumber,
        error: flashRentError.message,
        step: 'flash_rent_processing_failed'
      });
      // 不抛出错误，因为基础订单已经创建成功
    }

    return orderNumber;
  }

  /**
   * 更新订单为失败状态
   */
  private async updateOrderToFailed(
    orderNumber: string,
    networkId: string,
    failureReason: string
  ): Promise<void> {
    try {
      orderLogger.info(`   📝 更新订单为失败状态`, {
        orderNumber: orderNumber,
        reason: failureReason,
        step: 'update_order_failed'
      });

      // 调用PaymentService，传递更新标记
      const updateTransaction = {
        txID: 'update-failed',
        from: 'system',
        to: 'system',
        amount: 0,
        timestamp: Date.now(),
        confirmed: false,
        _isOrderUpdate: true,
        _orderNumber: orderNumber,
        _failureReason: failureReason,
        _updateType: 'failed'
      };

      await this.paymentService.handleFlashRentPayment(updateTransaction, networkId);

      orderLogger.info(`   ✅ 订单状态更新完成`, {
        orderNumber: orderNumber,
        status: 'failed',
        reason: failureReason
      });

    } catch (error) {
      orderLogger.error(`   ❌ 更新订单状态失败`, {
        orderNumber: orderNumber,
        error: error.message,
        originalFailure: failureReason
      });
    }
  }
}
