/**
 * 单个交易处理器
 * 从TransactionProcessor中分离出的单个交易处理逻辑
 */
import { Logger } from 'winston';
import { orderLogger } from '../../../../utils/logger';
import { PaymentService } from '../../../payment';
import { TransactionCache } from '../../TransactionCache';
import { TransactionParser } from '../../TransactionParser';
import { OrderCreationService } from '../order/OrderCreationService.ts';
import { OrderUpdateService } from '../order/OrderUpdateService.ts';

export class SingleTransactionProcessor {
  private transactionCache: TransactionCache;
  private transactionParser: TransactionParser;
  private paymentService: PaymentService;
  private orderCreationService: OrderCreationService;
  private orderUpdateService: OrderUpdateService;

  constructor(
    private logger: Logger,
    transactionCache: TransactionCache,
    transactionParser: TransactionParser,
    paymentService: PaymentService
  ) {
    this.transactionCache = transactionCache;
    this.transactionParser = transactionParser;
    this.paymentService = paymentService;
    this.orderCreationService = new OrderCreationService(paymentService);
    this.orderUpdateService = new OrderUpdateService(paymentService);
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
      orderNumber = await this.orderCreationService.createInitialOrderRecord(rawTx, networkId, networkName);
      orderLogger.info(`📦 [${shortTxId}] ✅ 初始订单记录已创建: ${orderNumber}`, {
        txId: txId,
        networkName,
        orderNumber,
        step: 1
      });
    } catch (createOrderError: any) {
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
        await this.orderUpdateService.updateOrderToFailed(orderNumber!, networkId, 'Transaction validation failed - txInfo not found');
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
        await this.orderUpdateService.updateOrderToFailed(orderNumber!, networkId, 'Transaction parsing failed - invalid transaction format');
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

    } catch (error: any) {
      this.logger.error(`❌ [${networkName}] 处理交易 ${txId} 时发生错误:`, error);
      
      // 如果有订单号，更新订单为失败状态
      if (orderNumber) {
        await this.orderUpdateService.updateOrderToFailed(orderNumber, networkId, `Processing error: ${error.message}`);
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
}
