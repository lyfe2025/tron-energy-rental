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
    // 支持不同类型的交易数据结构
    const txId = rawTx.txID || rawTx.transaction_id;
    const shortTxId = txId.substring(0, 8) + '...';

    // 检查是否已处理过（静默跳过，减少日志噪音）
    if (await this.transactionCache.isTransactionProcessed(txId)) {
      return;
    }

    // 立即标记交易为正在处理（防止并发）
    await this.transactionCache.markTransactionProcessed(txId);
    
    // 获取交易基本信息用于日志标识
    const txAmount = this.extractTransactionAmount(rawTx);
    const txTarget = this.extractTransactionTarget(rawTx);
    
    orderLogger.info(`💰 [${networkName}] 检测到支付交易`, {
      txId: shortTxId,
      amount: txAmount,
      target: txTarget,
      network: networkName
    });

    // 步骤1. 创建初始订单记录
    let orderNumber: string | null = null;
    try {
      orderLogger.info(`📦 [${shortTxId}] 步骤1：创建初始订单记录`, {
        txId: shortTxId,
        networkName,
        step: 1
      });

      orderNumber = await this.orderCreationService.createInitialOrderRecord(rawTx, networkId, networkName);
      
      orderLogger.info(`📦 [${shortTxId}] 步骤1完成：订单创建成功 ${orderNumber}`, {
        txId: shortTxId,
        orderNumber,
        amount: txAmount,
        step: 1
      });
    } catch (createOrderError: any) {
      orderLogger.error(`❌ [${networkName}] 支付确认失败: ${shortTxId}`, {
        txId: shortTxId,
        error: createOrderError.message,
        errorStack: createOrderError.stack,
        errorName: createOrderError.name,
        amount: txAmount,
        target: txTarget,
        step: 'payment_confirmation_failed',
        reason: '支付确认过程中发生错误',
        timestamp: new Date().toISOString(),
        detailedError: {
          message: createOrderError.message,
          stack: createOrderError.stack,
          name: createOrderError.name,
          cause: (createOrderError as any).cause
        },
        possibleCauses: [
          '未找到匹配的待支付订单',
          '订单状态异常',
          '能量代理失败',
          '数据库操作失败'
        ]
      });
      return;
    }

    try {
      // 步骤2. 验证交易状态
      orderLogger.info(`📦 [${shortTxId}] 步骤2：验证交易确认状态`, {
        txId: shortTxId,
        orderNumber,
        step: 2
      });

      const txInfo = await this.transactionParser.validateAndGetTransactionInfo(
        txId,
        networkName,
        tronWebInstance
      );

      if (!txInfo) {
        orderLogger.error(`❌ [${networkName}] 步骤2失败：交易验证失败 ${orderNumber}`, {
          txId: shortTxId,
          orderNumber,
          step: 2,
          reason: 'TRON网络无法获取交易信息',
          suggestion: '可能是网络延迟或交易尚未确认'
        });
        await this.orderUpdateService.updateOrderToFailed(orderNumber!, networkId, '交易验证失败');
        return;
      }

      orderLogger.info(`📦 [${shortTxId}] 步骤2完成：交易验证成功`, {
        txId: shortTxId,
        orderNumber,
        step: 2
      });

      // 步骤3. 解析交易详情
      orderLogger.info(`📦 [${shortTxId}] 步骤3：解析交易详情`, {
        txId: shortTxId,
        orderNumber,
        step: 3
      });

      const transaction = await this.transactionParser.parseTransaction(rawTx, txInfo, tronWebInstance);

      if (!transaction) {
        orderLogger.error(`❌ [${networkName}] 步骤3失败：交易解析失败 ${orderNumber}`, {
          txId: shortTxId,
          orderNumber,
          step: 3,
          reason: '交易格式不正确或数据不完整',
          contractType: rawTx.raw_data?.contract?.[0]?.type
        });
        await this.orderUpdateService.updateOrderToFailed(orderNumber!, networkId, '交易格式错误');
        return;
      }

      orderLogger.info(`📦 [${shortTxId}] 步骤3完成：交易解析成功`, {
        txId: shortTxId,
        orderNumber,
        amount: `${transaction.amount} TRX`,
        step: 3
      });

      // 步骤4. 确定订单类型并处理
      orderLogger.info(`📦 [${shortTxId}] 步骤4：确定订单类型`, {
        txId: shortTxId,
        toAddress: transaction.to,
        step: 4
      });

      const orderTypeInfo = await this.determineOrderTypeByAddress(transaction.to);
      
      if (!orderTypeInfo) {
        orderLogger.error(`❌ [${networkName}] 步骤4失败：无法确定订单类型 ${orderNumber}`, {
          txId: shortTxId,
          toAddress: transaction.to,
          orderNumber,
          reason: '支付地址未在配置中找到'
        });
        await this.orderUpdateService.updateOrderToFailed(orderNumber!, networkId, '无法确定订单类型');
        return;
      }

      const { orderType, modeType } = orderTypeInfo;
      
      orderLogger.info(`📦 [${shortTxId}] 步骤5：开始处理${orderType}订单`, {
        txId: shortTxId,
        orderNumber,
        orderType,
        modeType,
        step: 5
      });

      // 根据订单类型调用不同的处理方法
      if (modeType === 'transaction_package') {
        await this.paymentService.handleTransactionPackagePayment(transaction, networkId);
      } else {
        await this.paymentService.handleFlashRentPayment(transaction, networkId);
      }

      orderLogger.info(`📦 [${shortTxId}] 步骤5完成：${orderType}订单处理成功 ${orderNumber}`, {
        txId: shortTxId,
        orderNumber,
        orderType,
        step: 5
      });

    } catch (error: any) {
      // 如果有订单号，更新订单为失败状态
      if (orderNumber) {
        await this.orderUpdateService.updateOrderToFailed(orderNumber, networkId, `处理异常: ${error.message}`);
      }
      
      orderLogger.error(`❌ [${networkName}] 交易处理异常`, {
        txId: shortTxId,
        orderNumber: orderNumber || 'N/A',
        error: error.message,
        phase: '交易处理过程中发生系统错误'
      });
    }
  }

  /**
   * 提取交易金额（用于日志显示）
   */
  private extractTransactionAmount(rawTx: any): string {
    try {
      // TRC20交易结构
      if (rawTx.value && rawTx.token_info) {
        const amount = rawTx.value;
        const decimals = rawTx.token_info.decimals || 6;
        const symbol = rawTx.token_info.symbol || '';
        return `${(amount / Math.pow(10, decimals)).toFixed(6)} ${symbol}`;
      }
      
      // TRX交易结构
      const contract = rawTx.raw_data?.contract?.[0];
      if (contract?.type === 'TransferContract') {
        const amount = contract.parameter?.value?.amount || 0;
        return `${(amount / 1000000).toFixed(2)} TRX`;
      }
      return '未知金额';
    } catch (error) {
      return '未知金额';
    }
  }

  /**
   * 提取交易目标地址（用于日志显示）
   */
  private extractTransactionTarget(rawTx: any): string {
    try {
      // TRC20交易结构
      if (rawTx.to) {
        return rawTx.to.substring(0, 8) + '...';
      }
      
      // TRX交易结构
      const contract = rawTx.raw_data?.contract?.[0];
      if (contract?.type === 'TransferContract') {
        const toAddress = contract.parameter?.value?.to_address;
        if (toAddress) {
          return toAddress.substring(0, 8) + '...';
        }
      }
      return '未知地址';
    } catch (error) {
      return '未知地址';
    }
  }

  /**
   * 根据收款地址确定订单类型
   */
  private async determineOrderTypeByAddress(toAddress: string): Promise<{ orderType: string; modeType: string } | null> {
    try {
      const { query } = await import('../../../../database/index');
      
      // 查询支付地址对应的订单类型
      const result = await query(
        `SELECT mode_type, name FROM price_configs 
         WHERE (
           (mode_type = 'energy_flash' AND config->>'payment_address' = $1)
           OR 
           (mode_type = 'transaction_package' AND config->'order_config'->>'payment_address' = $1)
         ) AND is_active = true`,
        [toAddress]
      );

      if (result.rows.length > 0) {
        const config = result.rows[0];
        const modeType = config.mode_type;
        const orderType = modeType === 'transaction_package' ? '笔数套餐' : '能量闪租';
        return { orderType, modeType };
      }

      return null;
    } catch (error) {
      console.error('确定订单类型失败:', error);
      return null;
    }
  }
}
