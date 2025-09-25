/**
 * 订单更新服务
 * 从TransactionProcessor中分离出的订单更新逻辑
 */
import { orderLogger } from '../../../../utils/logger';
import { PaymentService } from '../../../payment';
import { TransactionDataExtractor } from '../utils/TransactionDataExtractor.ts';

export class OrderUpdateService {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  /**
   * 更新订单为失败状态
   */
  async updateOrderToFailed(
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
      const updateTransaction = TransactionDataExtractor.createFailureUpdateTransaction(orderNumber, failureReason);

      await this.paymentService.handleFlashRentPayment(updateTransaction, networkId);

      orderLogger.info(`📦 [${orderNumber}] ✅ 订单状态更新完成`, {
        orderNumber: orderNumber,
        status: 'failed',
        reason: failureReason
      });

    } catch (error: any) {
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
}
