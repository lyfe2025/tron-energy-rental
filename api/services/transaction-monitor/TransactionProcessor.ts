/**
 * 交易处理器
 * 负责单个交易的完整处理流程
 */
import { Logger } from 'winston';
import { query } from '../../database/index.ts';
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
    const shortTxId = txId.substring(0, 8) + '...';

    // 检查是否已处理过
    if (await this.transactionCache.isTransactionProcessed(txId)) {
      orderLogger.info(`📦 [${shortTxId}] ⏭️ 交易已处理过，跳过`, {
        txId: txId,
        networkName,
        reason: 'already_processed'
      });
      return;
    }

    // 立即标记交易为正在处理（防止并发）
    await this.transactionCache.markTransactionProcessed(txId);
    orderLogger.info(`📦 [${shortTxId}] 🔒 交易已标记为处理中`, {
      txId: txId,
      networkName,
      step: 'mark_processing'
    });

    // 1. 创建初始订单记录
    let orderNumber: string | null = null;
    try {
      orderLogger.info(`📦 [${shortTxId}] 1. 创建初始订单记录`, {
        txId: txId,
        networkName,
        step: 1
      });
      orderNumber = await this.createInitialOrderRecord(rawTx, networkId, networkName);
      orderLogger.info(`📦 [${shortTxId}] ✅ 初始订单记录已创建: ${orderNumber}`, {
        txId: txId,
        networkName,
        orderNumber,
        step: 1
      });
    } catch (createOrderError) {
      orderLogger.error(`📦 [${shortTxId}] ❌ 创建初始订单记录失败 - 详细错误信息`, {
        txId: txId,
        networkName,
        step: 1,
        errorMessage: createOrderError.message,
        errorStack: createOrderError.stack,
        errorName: createOrderError.name,
        errorCode: createOrderError.code,
        processStep: '创建初始订单记录时发生异常',
        transactionData: {
          timestamp: rawTx.raw_data?.timestamp,
          contractType: rawTx.raw_data?.contract?.[0]?.type,
          contractCount: rawTx.raw_data?.contract?.length || 0,
          hasParameter: !!rawTx.raw_data?.contract?.[0]?.parameter?.value
        }
      });
      return;
    }

    try {
      // 2. 验证交易确认状态
      orderLogger.info(`📦 [${shortTxId}] 2. 验证交易确认状态`, {
        txId: txId,
        networkName,
        step: 2
      });

      const txInfo = await this.transactionParser.validateAndGetTransactionInfo(
        txId,
        networkName,
        tronWebInstance
      );

      if (!txInfo) {
        orderLogger.error(`📦 [${shortTxId}] ❌ 交易验证失败 - 详细错误信息`, {
          txId: txId,
          networkName,
          step: 2,
          orderNumber: orderNumber,
          errorReason: 'Transaction validation failed - txInfo not found',
          processStep: '验证交易确认状态时失败',
          validationDetails: {
            txInfoResult: txInfo,
            tronWebInstanceAvailable: !!tronWebInstance,
            networkName: networkName,
            validationMethod: 'validateAndGetTransactionInfo'
          },
          transactionData: {
            timestamp: rawTx.raw_data?.timestamp,
            contractType: rawTx.raw_data?.contract?.[0]?.type,
            contractCount: rawTx.raw_data?.contract?.length || 0
          }
        });
        await this.updateOrderToFailed(orderNumber!, networkId, 'Transaction validation failed - txInfo not found');
        return;
      }

      orderLogger.info(`📦 [${shortTxId}] ✅ 交易验证成功`, {
        txId: txId,
        networkName,
        step: 2
      });

      // 3. 解析交易详情
      orderLogger.info(`📦 [${shortTxId}] 3. 解析交易详情`, {
        txId: txId,
        networkName,
        step: 3
      });

      const transaction = await this.transactionParser.parseTransaction(rawTx, txInfo, tronWebInstance);

      if (!transaction) {
        orderLogger.error(`📦 [${shortTxId}] ❌ 交易解析失败 - 详细错误信息`, {
          txId: txId,
          networkName,
          step: 3,
          orderNumber: orderNumber,
          errorReason: 'Transaction parsing failed - invalid transaction format',
          processStep: '解析交易详情时失败',
          parsingDetails: {
            transactionResult: transaction,
            txInfoAvailable: !!txInfo,
            tronWebInstanceAvailable: !!tronWebInstance,
            parsingMethod: 'parseTransaction'
          },
          inputData: {
            rawTxStructure: {
              hasRawData: !!rawTx.raw_data,
              hasContract: !!rawTx.raw_data?.contract,
              contractCount: rawTx.raw_data?.contract?.length || 0,
              contractType: rawTx.raw_data?.contract?.[0]?.type,
              hasParameter: !!rawTx.raw_data?.contract?.[0]?.parameter
            },
            txInfoStructure: typeof txInfo === 'object' ? Object.keys(txInfo || {}) : 'not_object'
          }
        });
        await this.updateOrderToFailed(orderNumber!, networkId, 'Transaction parsing failed - invalid transaction format');
        return;
      }

      orderLogger.info(`📦 [${shortTxId}] ✅ 交易解析成功`, {
        txId: transaction.txID,
        networkName,
        step: 3,
        from: transaction.from,
        to: transaction.to,
        amount: `${transaction.amount} TRX`,
        confirmed: transaction.confirmed
      });

      // 4. 检测到TRX转账，转交给PaymentService处理
      orderLogger.info(`📦 [${shortTxId}] 4. 检测到TRX转账: ${transaction.amount} TRX，转交给PaymentService处理`, {
        txId: transaction.txID,
        amount: `${transaction.amount} TRX`,
        from: transaction.from,
        to: transaction.to,
        networkName,
        step: 4
      });

      await this.paymentService.handleFlashRentPayment(transaction, networkId);

      orderLogger.info(`📦 [${shortTxId}] ✅ 交易处理完成`, {
        txId: transaction.txID,
        networkName,
        status: 'completed'
      });

    } catch (error) {
      this.logger.error(`❌ [${networkName}] 处理交易 ${txId} 时发生错误:`, error);
      
      // 如果有订单号，更新订单为失败状态
      if (orderNumber) {
        await this.updateOrderToFailed(orderNumber, networkId, `Processing error: ${error.message}`);
      }
      
      orderLogger.error(`📦 [${shortTxId}] ❌ 交易处理失败 - 详细错误信息`, {
        txId: txId,
        networkName,
        status: 'failed',
        orderNumber: orderNumber || 'N/A',
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        processStep: '处理交易时发生异常',
        transactionData: {
          timestamp: rawTx.raw_data?.timestamp,
          contractType: rawTx.raw_data?.contract?.[0]?.type,
          contractCount: rawTx.raw_data?.contract?.length || 0
        },
        systemState: {
          networkId: networkId,
          tronWebAvailable: !!tronWebInstance,
          paymentServiceAvailable: !!this.paymentService
        }
      });
    }
  }

  /**
   * 批量处理地址的交易
   */
  async processAddressTransactions(monitoredAddress: MonitoredAddress): Promise<void> {
    const { address, networkId, networkName, tronWebInstance, tronGridProvider } = monitoredAddress;
    
    try {
      // 🕐 计算查询时间范围：当前时间向前45秒（减少重复处理，提高效率）
      const now = Date.now();
      const queryStartTime = now - 45 * 1000; // 45秒查询时间窗口

      // 📥 查询最近45秒内的交易记录（优化查询数量和时间窗口）
      const transactionsResult = await tronGridProvider.getAccountTransactions(address, 100, 'block_timestamp,desc');

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

      // 🎯 过滤：只处理最近45秒内的交易
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
            const shortTxId = tx.txID.substring(0, 8) + '...';
            orderLogger.info(`📦 [${shortTxId}] ${processedCount}. 处理交易: ${tx.txID}`, {
              txId: tx.txID,
              networkName,
              step: 1
            });
            await this.processSingleTransaction(tx, networkId, networkName, tronWebInstance);
          } catch (error) {
            const shortTxId = tx.txID.substring(0, 8) + '...';
            orderLogger.error(`📦 [${shortTxId}] ❌ 处理交易失败 - 详细错误信息`, {
              txId: tx.txID,
              networkName,
              errorMessage: error.message,
              errorStack: error.stack,
              errorName: error.name,
              errorCode: error.code,
              processStep: '批量处理交易时发生异常',
              transactionData: {
                timestamp: tx.raw_data?.timestamp,
                contractType: tx.raw_data?.contract?.[0]?.type,
                contractCount: tx.raw_data?.contract?.length || 0,
                hasParameter: !!tx.raw_data?.contract?.[0]?.parameter?.value
              },
              batchInfo: {
                currentIndex: processedCount,
                totalTransactions: recentTransactions.length,
                networkId: networkId
              }
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
    const shortTxId = txId.substring(0, 8) + '...';
    
    orderLogger.info(`📦 [${shortTxId}]    📝 创建初始订单记录`, {
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
      orderLogger.warn(`📦 [${shortTxId}]    ⚠️ 提取交易信息失败，使用默认值 - 详细警告信息`, {
        txId: txId,
        networkName,
        warningMessage: extractError.message,
        warningStack: extractError.stack,
        warningName: extractError.name,
        warningCode: extractError.code,
        processStep: '提取交易基本信息时发生异常',
        extractionAttempt: {
          hasRawData: !!rawTx?.raw_data,
          hasContract: !!rawTx?.raw_data?.contract,
          contractArray: Array.isArray(rawTx?.raw_data?.contract),
          contractLength: rawTx?.raw_data?.contract?.length || 0,
          firstContractType: rawTx?.raw_data?.contract?.[0]?.type,
          hasParameter: !!rawTx?.raw_data?.contract?.[0]?.parameter,
          hasParameterValue: !!rawTx?.raw_data?.contract?.[0]?.parameter?.value
        },
        fallbackValues: {
          fromAddress: 'unknown',
          toAddress: 'unknown',
          amount: 0
        }
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

    orderLogger.info(`📦 [${shortTxId}]    ✅ 初始订单记录创建完成`, {
      txId: txId,
      networkName,
      orderNumber,
      fromAddress,
      toAddress,
      amount: `${amount} TRX`
    });

    // 立即进行真正的订单计算和处理
    try {
      orderLogger.info(`📦 [${shortTxId}]    🧮 开始进行订单计算和能量委托`, {
        txId: txId,
        networkName,
        orderNumber,
        step: 'flash_rent_processing'
      });

      // 先检查是否已存在订单（避免重复创建和计算）
      let processedOrder;
      try {
        // 尝试根据交易哈希获取已存在的订单
        const existingOrderQuery = await this.getExistingOrderByTxHash(txId);
        if (existingOrderQuery) {
          orderLogger.info(`📦 [${shortTxId}]    📋 使用已存在的订单`, {
            txId: txId,
            orderId: existingOrderQuery.id,
            orderNumber: existingOrderQuery.order_number,
            energyAmount: existingOrderQuery.energy_amount,
            step: 'reuse_existing_order'
          });
          processedOrder = existingOrderQuery;
        } else {
          // 如果不存在，才创建新订单
          const flashRentParams = {
            fromAddress: fromAddress,
            trxAmount: amount,
            networkId: networkId,
            txId: txId
          };
          processedOrder = await this.flashRentService.processExistingFlashRentOrder(flashRentParams);
        }
      } catch (error) {
        orderLogger.warn(`📦 [${shortTxId}]    ⚠️ 获取已存在订单失败，创建新订单 - 详细警告信息`, {
          txId: txId,
          networkName,
          orderNumber,
          warningMessage: error.message,
          warningStack: error.stack,
          warningName: error.name,
          warningCode: error.code,
          processStep: '获取已存在订单时发生异常',
          fallbackAction: '将创建新的闪租订单',
          queryAttempt: {
            method: 'getExistingOrderByTxHash',
            txHash: txId,
            networkId: networkId
          }
        });
        const flashRentParams = {
          fromAddress: fromAddress,
          trxAmount: amount,
          networkId: networkId,
          txId: txId
        };
        processedOrder = await this.flashRentService.processExistingFlashRentOrder(flashRentParams);
      }

      orderLogger.info(`📦 [${shortTxId}]    🎉 订单计算和处理完成`, {
        txId: txId,
        networkName,
        orderNumber,
        orderId: processedOrder.id,
        status: processedOrder.status,
        energyAmount: processedOrder.energy_amount,
        calculatedUnits: processedOrder.calculated_units
      });

    } catch (flashRentError) {
      orderLogger.error(`📦 [${shortTxId}]    ❌ 订单计算和处理失败 - 详细错误信息`, {
        txId: txId,
        networkName,
        orderNumber,
        errorMessage: flashRentError.message,
        errorStack: flashRentError.stack,
        errorName: flashRentError.name,
        errorCode: flashRentError.code,
        processStep: '闪租订单计算和处理时发生异常',
        orderCreationContext: {
          fromAddress: fromAddress,
          toAddress: toAddress,
          amount: `${amount} TRX`,
          networkId: networkId,
          orderNumber: orderNumber
        },
        serviceState: {
          flashRentServiceAvailable: !!this.flashRentService,
          method: 'processExistingFlashRentOrder'
        },
        note: '基础订单已经创建成功，但闪租处理失败'
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
      orderLogger.info(`📦 [${orderNumber}] 📝 更新订单为失败状态`, {
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

      orderLogger.info(`📦 [${orderNumber}] ✅ 订单状态更新完成`, {
        orderNumber: orderNumber,
        status: 'failed',
        reason: failureReason
      });

    } catch (error) {
      orderLogger.error(`📦 [${orderNumber}] ❌ 更新订单状态失败 - 详细错误信息`, {
        orderNumber: orderNumber,
        networkId: networkId,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        processStep: '更新订单为失败状态时发生异常',
        originalFailure: failureReason,
        updateAttempt: {
          method: 'handleFlashRentPayment',
          updateType: 'failed',
          paymentServiceAvailable: !!this.paymentService
        },
        updateTransaction: {
          txID: 'update-failed',
          from: 'system',
          to: 'system',
          amount: 0,
          isOrderUpdate: true
        }
      });
    }
  }

  /**
   * 根据交易哈希获取已存在的订单
   */
  private async getExistingOrderByTxHash(txHash: string): Promise<any | null> {
    const shortTxId = txHash.substring(0, 8) + '...';
    try {
      const result = await query(
        `SELECT 
          id, order_number, user_id, network_id, order_type, 
          target_address, energy_amount, price, payment_trx_amount, 
          calculated_units, payment_status, status, tron_tx_hash,
          source_address, created_at, updated_at
         FROM orders 
         WHERE tron_tx_hash = $1
         LIMIT 1`,
        [txHash]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      orderLogger.error(`📦 [${shortTxId}] ❌ 获取已存在订单失败 - 详细错误信息`, {
        txHash: txHash,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        processStep: '数据库查询已存在订单时发生异常',
        queryDetails: {
          method: 'query',
          table: 'orders',
          condition: 'tron_tx_hash = $1',
          parameter: txHash
        },
        querySQL: 'SELECT id, order_number, user_id... FROM orders WHERE tron_tx_hash = $1 LIMIT 1'
      });
      return null;
    }
  }
}
