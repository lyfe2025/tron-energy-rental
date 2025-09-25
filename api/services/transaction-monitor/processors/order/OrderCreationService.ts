/**
 * 订单创建服务
 * 从TransactionProcessor中分离出的订单创建逻辑
 */
import { orderLogger } from '../../../../utils/logger';
import { FlashRentOrderService } from '../../../order-management/FlashRentOrderService';
import { PaymentService } from '../../../payment';
import { TransactionDataExtractor } from '../utils/TransactionDataExtractor.ts';
import { OrderQueryService } from './OrderQueryService.ts';

export class OrderCreationService {
  private flashRentService: FlashRentOrderService;
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.flashRentService = new FlashRentOrderService();
    this.paymentService = paymentService;
  }

  /**
   * 创建初始订单记录
   * 在交易处理开始时就创建订单记录，便于后续更新状态
   */
  async createInitialOrderRecord(
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

    // 提取交易基本信息
    const extractedData = TransactionDataExtractor.extractTransactionData(rawTx, txId, networkName);
    
    // 生成订单号
    const orderNumber = TransactionDataExtractor.generateOrderNumber();

    // 调用PaymentService，传递标记表示这是初始创建
    const initialTransaction = TransactionDataExtractor.createInitialTransaction(
      extractedData,
      txId,
      rawTx,
      orderNumber,
      networkName
    );

    await this.paymentService.handleFlashRentPayment(initialTransaction, networkId);

    orderLogger.info(`📦 [${shortTxId}]    ✅ 初始订单记录创建完成`, {
      txId: txId,
      networkName,
      orderNumber,
      fromAddress: extractedData.fromAddress,
      toAddress: extractedData.toAddress,
      amount: `${extractedData.amount} TRX`
    });

    // 立即进行真正的订单计算和处理
    await this.processFlashRentOrder(txId, extractedData, networkId, networkName, orderNumber, shortTxId);

    return orderNumber;
  }

  /**
   * 处理闪租订单计算和处理
   */
  private async processFlashRentOrder(
    txId: string,
    extractedData: any,
    networkId: string,
    networkName: string,
    orderNumber: string,
    shortTxId: string
  ): Promise<void> {
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
        const existingOrderQuery = await OrderQueryService.getExistingOrderByTxHash(txId);
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
            fromAddress: extractedData.fromAddress,
            trxAmount: extractedData.amount,
            networkId: networkId,
            txId: txId
          };
          processedOrder = await this.flashRentService.processExistingFlashRentOrder(flashRentParams);
        }
      } catch (error: any) {
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
          fromAddress: extractedData.fromAddress,
          trxAmount: extractedData.amount,
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

    } catch (flashRentError: any) {
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
          fromAddress: extractedData.fromAddress,
          toAddress: extractedData.toAddress,
          amount: `${extractedData.amount} TRX`,
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
  }
}
